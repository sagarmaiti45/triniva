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
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body", message: "Request must be valid JSON" },
        { status: 400 }
      );
    }
    
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
      cfg_scale = 4,
      steps,
      width = 1024,
      height = 1024,
      preview = false,
    } = generationParams;
    
    // Validate required fields
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required", message: "Please provide a text description" },
        { status: 400 }
      );
    }
    
    // Validate model
    const validModels = ["sd3.5-flash", "sd3.5-medium", "sd3.5-large-turbo", "sd3.5-large", "stable-image-core", "stable-image-ultra"];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: "Invalid model", message: `Model must be one of: ${validModels.join(", ")}` },
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
    if (!apiKey || apiKey.trim() === '') {
      console.error("STABILITY_API_KEY is not configured or empty");
      return NextResponse.json(
        { 
          error: "API configuration error", 
          message: "Stability AI API key is not configured. Please contact support.",
          details: process.env.NODE_ENV === "development" ? "Missing STABILITY_API_KEY environment variable" : undefined
        },
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
    
    console.log("Calling Stability AI:", {
      url: apiUrl,
      model: model,
      hasApiKey: !!apiKey,
      prompt: prompt.substring(0, 50) + "..."
    });
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: formData,
    });
    
    if (!response.ok) {
      let errorData;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { message: await response.text() };
        }
      } catch (e) {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error("Stability AI API error:", response.status, errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key", details: "Please check your Stability AI API key" },
          { status: 401 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: "Insufficient credits", details: "Your Stability AI account has insufficient credits" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to generate image",
          message: errorData.message || errorData.error || response.statusText,
          status: response.status 
        },
        { status: response.status }
      );
    }
    
    // Handle the new API response format
    let images: string[] = [];
    
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('image')) {
        // The new API returns the image directly
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = contentType.split(';')[0]; // Get mime type without charset
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        images = [dataUrl];
      } else if (contentType?.includes('application/json')) {
        // Handle JSON response if API changes
        const data = await response.json();
        if (data.image) {
          images = [`data:image/png;base64,${data.image}`];
        } else if (data.artifacts && Array.isArray(data.artifacts)) {
          // Handle array of images
          images = data.artifacts.map((artifact: any) => 
            `data:image/png;base64,${artifact.base64}`
          );
        }
      } else {
        throw new Error(`Unexpected response type: ${contentType}`);
      }
      
      if (images.length === 0) {
        throw new Error("No images received from API");
      }
    } catch (error) {
      console.error("Failed to process image response:", error);
      return NextResponse.json(
        { 
          error: "Failed to process image", 
          message: "Unable to process the generated image",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
      );
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
      remaining: remaining || 0,
      limit: limit || 0,
      reset: reset ? new Date(reset).toISOString() : new Date().toISOString(),
      limits: updatedLimits,
      cached: false
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