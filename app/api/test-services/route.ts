import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const results = {
    redis: false,
    resend: false,
    errors: [] as string[],
  };

  // Test Redis
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      results.errors.push("Redis credentials not set");
    } else {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      
      // Try a simple operation
      await redis.ping();
      results.redis = true;
    }
  } catch (error) {
    results.errors.push(`Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Resend
  try {
    if (!process.env.RESEND_API_KEY) {
      results.errors.push("Resend API key not set");
    } else {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Try to validate the API key by fetching domains
      const domains = await resend.domains.list();
      results.resend = true;
    }
  } catch (error) {
    results.errors.push(`Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test other env vars
  const envVars = {
    STABILITY_API_KEY: !!process.env.STABILITY_API_KEY,
    JWT_SECRET: !!process.env.JWT_SECRET,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    RECAPTCHA_SECRET_KEY: !!process.env.RECAPTCHA_SECRET_KEY,
  };

  return NextResponse.json({
    services: results,
    envVars,
    timestamp: new Date().toISOString(),
  });
}