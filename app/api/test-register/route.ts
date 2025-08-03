import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return POST(req);
}

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
    let resendTestEmail = false;
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Try to list domains first
      try {
        await resend.domains.list();
        resendWorking = true;
        console.log("Resend connection: OK");
      } catch (e) {
        console.error("Resend domains.list failed:", e);
      }
      
      // Try to send a test email
      try {
        const { data, error } = await resend.emails.send({
          from: "Triniva AI <otp@triniva.com>",
          to: ["test@resend.dev"],
          subject: "Test from Vercel",
          html: "<p>Test email</p>"
        });
        
        if (error) {
          console.error("Resend send error:", error);
        } else {
          resendTestEmail = true;
          console.log("Resend test email sent:", data);
        }
      } catch (e) {
        console.error("Resend send failed:", e);
      }
    } catch (error) {
      console.error("Resend import/init failed:", error);
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
        resendTestEmail: resendTestEmail,
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