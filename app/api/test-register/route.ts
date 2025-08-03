import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Test registration endpoint called");
    
    // Test Redis connection
    let redisWorking = false;
    try {
      const { redis } = await import("@/lib/redis");
      await redis.ping();
      redisWorking = true;
      console.log("Redis connection: OK");
    } catch (error) {
      console.error("Redis connection failed:", error);
    }
    
    // Test Resend
    let resendWorking = false;
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.domains.list();
      resendWorking = true;
      console.log("Resend connection: OK");
    } catch (error) {
      console.error("Resend connection failed:", error);
    }
    
    // Try to import auth functions
    let authFunctionsWorking = false;
    try {
      const auth = await import("@/lib/auth");
      authFunctionsWorking = true;
      console.log("Auth functions imported: OK");
      
      // Test OTP generation
      const otp = auth.generateOTP();
      console.log("Generated test OTP:", otp);
    } catch (error) {
      console.error("Auth functions error:", error);
    }
    
    return NextResponse.json({
      success: true,
      services: {
        redis: redisWorking,
        resend: resendWorking,
        authFunctions: authFunctionsWorking,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Test registration error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}