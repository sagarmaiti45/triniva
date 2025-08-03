import { NextRequest, NextResponse } from "next/server";
import { GenerationService } from "@/lib/db/generation-service";
import { generateGuestFingerprint } from "@/lib/guest-identification";
import { getServerSession } from "@/lib/auth-options";
import { authOptions } from "@/lib/auth-options";
import { checkRateLimit, checkUsageLimits, incrementUsage } from "@/lib/in-memory-tracking";

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { 
      prompt,
      model = "sd3.5-flash",
      width = 1024,
      height = 1024,
      style_preset,
      negative_prompt,
      cfg_scale = 4,
      guestId: clientGuestId
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Generate guest fingerprint if not logged in
    let guestId = clientGuestId;
    let ipAddress = "unknown";
    
    if (!userId) {
      const { fingerprint, ipAddress: ip } = await generateGuestFingerprint(req);
      // Always prefer client guest ID if provided
      guestId = clientGuestId || fingerprint;
      ipAddress = ip;
      console.log("Guest tracking:", { clientGuestId, serverFingerprint: fingerprint, finalGuestId: guestId });
    }
    
    // Create identifier for tracking
    const identifier = userId || guestId || ipAddress;
    
    // Check generation limits
    let limits;
    try {
      // Try to use Redis-based service if available
      limits = await GenerationService.checkGenerationLimit(userId, guestId);
      console.log("Initial limits check:", { userId, guestId, limits });
    } catch (error) {
      // Fallback to in-memory tracking if Redis is not available
      console.log("Using in-memory usage tracking (Redis not configured)");
      limits = checkUsageLimits(identifier, !!userId);
    }
    
    if (limits.remaining === 0) {
      return NextResponse.json(
        {
          error: "Generation limit reached",
          message: limits.isGuest
            ? "You've reached the free limit of 3 images. Please sign in to generate more."
            : "You've used all 10 free images. Premium subscription coming soon!",
          limits,
          generationLimits: limits
        },
        { status: 429 }
      );
    }
    
    // Apply rate limiting
    const { success: rateLimitSuccess, remaining: rateLimitRemaining } = checkRateLimit(identifier, !!userId);
    
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: userId 
            ? "You've reached your daily limit. Please try again tomorrow."
            : "You've reached the anonymous limit. Please sign in to continue."
        },
        { status: 429 }
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
    formData.append('prompt', prompt.trim());
    
    // Only add model for SD3 endpoints
    if (apiUrl.includes('/sd3')) {
      formData.append('model', model);
    }
    
    // Map dimensions to aspect ratios
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

    console.log("Calling Stability AI:", {
      url: apiUrl,
      model: model,
      userId: userId || 'guest',
      remaining: limits.remaining
    });

    // Call Stability AI
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: formData,
    });

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

    // Save generation to database (with fallback)
    try {
      await GenerationService.saveGeneration({
        userId,
        guestId: userId ? undefined : guestId,
        prompt: prompt.trim(),
        negativePrompt: negative_prompt,
        imageUrl: dataUrl,
        imageData: dataUrl,
        modelId: model,
        aspectRatio,
        outputFormat: 'png',
        metadata: {
          width: width || 1024,
          height: height || 1024,
          cfgScale: cfg_scale
        }
      });
    } catch (error) {
      console.log("Could not save to Redis (not configured), using in-memory tracking");
      // Increment in-memory usage counter
      incrementUsage(identifier);
    }
    
    // Get updated limits
    let updatedLimits;
    try {
      updatedLimits = await GenerationService.checkGenerationLimit(userId, guestId);
      console.log("Updated limits after generation:", { userId, guestId, updatedLimits });
    } catch (error) {
      // Fallback to in-memory tracking
      updatedLimits = checkUsageLimits(identifier, !!userId);
      console.log("Updated limits (in-memory):", { identifier, updatedLimits });
    }

    return NextResponse.json({
      images: [dataUrl],
      success: true,
      generationLimits: updatedLimits,
      limits: updatedLimits,
      remaining: rateLimitRemaining
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