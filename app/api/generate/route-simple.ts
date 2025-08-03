import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiting for testing
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const limit = 10; // 10 requests per hour for testing
  const window = 60 * 60 * 1000; // 1 hour
  
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + window });
    return { success: true, remaining: limit - 1 };
  }
  
  if (userLimit.count >= limit) {
    return { success: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { success: true, remaining: limit - userLimit.count };
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Simple rate limiting
    const { success, remaining } = checkRateLimit(ip);
    
    if (!success) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "You've reached the limit of 10 generations per hour. Please try again later."
        },
        { status: 429 }
      );
    }
    
    const body = await req.json();
    const {
      prompt,
      negative_prompt,
      style_preset,
      cfg_scale,
      steps,
      width,
      height,
      preview = false,
    } = body;
    
    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    
    // Use fewer steps for preview mode to save credits
    const actualSteps = preview ? 15 : steps;
    
    // Prepare request to Stability AI
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      console.error("STABILITY_API_KEY is not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }
    
    const engine = "stable-diffusion-xl-1024-v1-0";
    const apiUrl = `https://api.stability.ai/v1/generation/${engine}/text-to-image`;
    
    const requestBody: any = {
      text_prompts: [
        {
          text: prompt,
          weight: 1,
        },
      ],
      cfg_scale: cfg_scale || 7,
      height: height || 1024,
      width: width || 1024,
      steps: actualSteps,
      samples: 1,
    };
    
    if (negative_prompt) {
      requestBody.text_prompts.push({
        text: negative_prompt,
        weight: -1,
      });
    }
    
    if (style_preset) {
      requestBody.style_preset = style_preset;
    }
    
    console.log("Sending request to Stability AI:", {
      engine,
      steps: actualSteps,
      width,
      height,
      style_preset,
    });
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Stability AI API error:", error);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || "Failed to generate image" },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.artifacts || data.artifacts.length === 0) {
      return NextResponse.json(
        { error: "No images generated" },
        { status: 500 }
      );
    }
    
    // Convert base64 to data URL
    const images = data.artifacts.map((artifact: any) => 
      `data:image/png;base64,${artifact.base64}`
    );
    
    return NextResponse.json({
      images,
      remaining,
      limit: 10,
    });
    
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}