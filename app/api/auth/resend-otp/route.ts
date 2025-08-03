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
        { error: "Please provide an email address" },
        { status: 400 }
      );
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address. Please register first." },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.verified) {
      return NextResponse.json(
        { error: "Email already verified. Please sign in." },
        { status: 400 }
      );
    }

    // Check rate limiting
    const canSendOTP = await checkOTPAttempts(normalizedEmail);
    if (!canSendOTP) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again in an hour." },
        { status: 429 }
      );
    }

    // Generate and store new OTP
    const otp = generateOTP();
    await storeOTP(normalizedEmail, otp);

    // Send OTP email
    await sendOTPEmail(normalizedEmail, user.name, otp);

    return NextResponse.json({
      message: "Verification code sent successfully. Please check your email.",
      email: normalizedEmail
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again later." },
      { status: 500 }
    );
  }
}