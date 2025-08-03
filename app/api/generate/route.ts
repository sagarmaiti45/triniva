import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { GenerationService } from "@/lib/db/generation-service";
import { generateGuestFingerprint } from "@/lib/guest-identification";
import { getServerSession, authOptions } from "@/lib/auth-options";

// Initialize Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter instances
const ipRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "24 h"),
  analytics: true,
  prefix: "ratelimit:ip",
});

const userRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "24 h"),
  analytics: true,
  prefix: "ratelimit:user",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestId: clientGuestId, ...generationParams } = body;
    
    // Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Generate guest fingerprint if not logged in
    let guestId = clientGuestId;
    let ipAddress = "unknown";
    
    if (!userId) {
      const { fingerprint, ipAddress: ip } = await generateGuestFingerprint(req);
      guestId = clientGuestId || fingerprint;
      ipAddress = ip;
    }
    
    // Check generation limits
    const limits = await GenerationService.checkGenerationLimit(userId, guestId);
    
    if (limits.remaining === 0) {
      return NextResponse.json(
        {
          error: "Generation limit reached",
          message: limits.isGuest
            ? "You've reached the free limit of 3 images. Please sign in to generate more."
            : limits.limit === 10
              ? "You've used all 10 free images. Premium subscription coming soon!"
              : "Generation limit reached.",
          limits
        },
        { status: 429 }
      );
    }
    
    // Apply rate limiting
    const identifier = userId || ipAddress;
    const ratelimit = userId ? userRatelimit : ipRatelimit;
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: userId 
            ? "You've reached your daily limit of 100 generations. Please try again tomorrow."
            : "You've reached the anonymous limit of 10 generations. Please sign in to continue."
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(reset).toISOString(),
          }
        }
      );
    }
    
    const {
      prompt,
      negative_prompt,
      style_preset,
      model = "sd3.5-flash",
      cfg_scale,
      steps,
      width,
      height,
      preview = false,
    } = generationParams;
    
    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }
    
    
    // Check cache for similar prompts
    const cacheKey = `img:${prompt}:${width}x${height}:${style_preset}:${model}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && typeof cached === "string") {
      return NextResponse.json({ 
        images: [cached],
        cached: true 
      });
    }
    
    // Prepare request to Stability AI
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      console.error("STABILITY_API_KEY is not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }
    
    // Map model to correct API endpoint
    let apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
    
    // Handle different model endpoints
    if (model === "stable-image-core") {
      apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/core";
    } else if (model === "stable-image-ultra") {
      apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/ultra";
    }
    
    // Use FormData for the new API
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Only SD3 endpoint needs model parameter
    if (apiUrl.includes('/sd3')) {
      formData.append('model', model);
    }
    
    // Map dimensions to exact aspect ratios supported by API
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
    
    if (negative_prompt) {
      formData.append('negative_prompt', negative_prompt);
    }
    
    // Add style preset if provided and not "none"
    if (style_preset && style_preset !== 'none') {
      formData.append('style_preset', style_preset);
    }
    
    // Note: SD3.5 models don't use steps parameter
    // Steps are only used for SD3 Legacy models
    
    // Add cfg_scale if provided
    if (cfg_scale) {
      formData.append('cfg_scale', cfg_scale.toString());
    }
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: formData,
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
    
    // Handle the new API response format
    let images: string[] = [];
    
    if (response.headers.get('content-type')?.includes('image')) {
      // The new API returns the image directly
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      
      images = [dataUrl];
    } else {
      // Handle JSON response if API changes
      const data = await response.json();
      if (data.image) {
        images = [`data:image/png;base64,${data.image}`];
      }
    }
    
    // Cache the result for 15 minutes
    if (!preview && images.length > 0) {
      await redis.set(cacheKey, images[0], { ex: 900 });
      
      // Save generation to database (only if not preview and not from cache)
      if (!cached) {
        try {
          await GenerationService.saveGeneration({
            userId,
            guestId: userId ? undefined : guestId,
            prompt: prompt.trim(), // Trim whitespace
            negativePrompt: negative_prompt,
            imageUrl: images[0],
            imageData: images[0], // Store base64 data
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
          console.error("Failed to save generation:", error);
          // Don't fail the request if saving fails
        }
      }
    }
    
    // Get updated limits
    const updatedLimits = await GenerationService.checkGenerationLimit(userId, guestId);
    
    return NextResponse.json({
      images,
      remaining,
      limit,
      reset: new Date(reset).toISOString(),
      generationLimits: updatedLimits
    });
    
  } catch (error) {
    console.error("Image generation error:", error);
    
    // More detailed error response for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = {
      error: "Internal server error",
      message: errorMessage,
      // Include more details in development
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
        details: error
      })
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}