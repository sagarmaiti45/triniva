import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const checks: any = {
    basic: true,
    env: {
      hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasRecaptchaSite: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      hasRecaptchaSecret: !!process.env.RECAPTCHA_SECRET_KEY,
    },
    timestamp: new Date().toISOString(),
  };

  // Try Redis
  try {
    const { redis } = await import("@/lib/redis");
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    checks.redis = false;
    checks.redisError = error instanceof Error ? error.message : "Unknown error";
  }

  // Try Resend
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Just check if we can create instance
      checks.resend = true;
    } else {
      checks.resend = false;
      checks.resendError = "No API key";
    }
  } catch (error) {
    checks.resend = false;
    checks.resendError = error instanceof Error ? error.message : "Unknown error";
  }

  return NextResponse.json(checks);
}