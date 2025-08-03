import { NextRequest, NextResponse } from "next/server";
import { 
  getUserByEmail, 
  verifyOTP,
  createToken,
  storeSession,
  markUserAsVerified
} from "@/lib/auth";
import { GenerationService } from "@/lib/db/generation-service";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: "Missing email or OTP" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOTP = otp.trim();

    console.log('Verify OTP request:', { email: normalizedEmail, otp: normalizedOTP });

    // Get user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please register first." },
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

    // Verify OTP
    const isValidOTP = await verifyOTP(normalizedEmail, normalizedOTP);
    if (!isValidOTP) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    // Update user verified status using optimized function
    await markUserAsVerified(normalizedEmail);
    
    // Check for pending guest merge
    const pendingGuestId = await redis.get(`pending_merge:${normalizedEmail}`);
    if (pendingGuestId && typeof pendingGuestId === 'string') {
      try {
        await GenerationService.mergeGuestToUser(user.id, pendingGuestId);
        await redis.del(`pending_merge:${normalizedEmail}`); // Clean up
      } catch (error) {
        console.error("Failed to merge guest data:", error);
        // Don't fail verification if merge fails
      }
    }

    // Create session
    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    // Create token
    const token = createToken(session);

    // Store session in Redis
    await storeSession(token, session);

    // Set cookie
    const response = NextResponse.json({
      message: "Email verified successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "OTP verification failed" },
      { status: 500 }
    );
  }
}