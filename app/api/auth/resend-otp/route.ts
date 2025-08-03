import { NextRequest, NextResponse } from "next/server";
import { 
  getUserByEmail, 
  generateOTP, 
  storeOTP, 
  sendOTPEmail,
  checkOTPAttempts
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Check rate limiting
    const canSendOTP = await checkOTPAttempts(email);
    if (!canSendOTP) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again in an hour." },
        { status: 429 }
      );
    }

    // Generate and store new OTP
    const otp = generateOTP();
    await storeOTP(email, otp);

    // Send OTP email
    await sendOTPEmail(email, user.name, otp);

    return NextResponse.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Failed to resend OTP" },
      { status: 500 }
    );
  }
}