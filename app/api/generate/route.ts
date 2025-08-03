import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get request body
    const body = await req.json();
    const { 
      prompt, 
      model = "sd3.5-flash",
      width = 1024,
      height = 1024,
      style_preset,
      negative_prompt,
      cfg_scale = 4
    } = body;

    // Validate prompt
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get API key
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Determine API endpoint
    let apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
    if (model === "stable-image-core") {
      apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/core";
    } else if (model === "stable-image-ultra") {
      apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/ultra";
    }

    // Create form data
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Only add model for SD3 endpoints
    if (apiUrl.includes('/sd3')) {
      formData.append('model', model);
    }
    
    // Add aspect ratio
    let aspectRatio = "1:1";
    if (width === 1344 && height === 768) aspectRatio = "16:9";
    else if (width === 768 && height === 1344) aspectRatio = "9:16";
    else if (width === 1216 && height === 832) aspectRatio = "3:2";
    else if (width === 832 && height === 1216) aspectRatio = "2:3";
    else if (width === 896 && height === 1152) aspectRatio = "4:5";
    else if (width === 1152 && height === 896) aspectRatio = "5:4";
    else if (width === 1536 && height === 640) aspectRatio = "21:9";
    else if (width === 640 && height === 1536) aspectRatio = "9:21";
    
    formData.append('aspect_ratio', aspectRatio);
    formData.append('output_format', 'png');
    
    // Add optional parameters
    if (negative_prompt) {
      formData.append('negative_prompt', negative_prompt);
    }
    if (style_preset && style_preset !== 'none') {
      formData.append('style_preset', style_preset);
    }
    if (cfg_scale) {
      formData.append('cfg_scale', cfg_scale.toString());
    }

    console.log("Calling Stability AI:", apiUrl);

    // Call Stability AI
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: formData,
    });

    console.log("Stability response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stability API error:", response.status, errorText);
      
      return NextResponse.json(
        { 
          error: "Generation failed",
          status: response.status,
          message: errorText
        },
        { status: response.status }
      );
    }

    // Get image data
    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({
      images: [dataUrl],
      success: true
    });

  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}