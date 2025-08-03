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

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify OTP
    const isValidOTP = await verifyOTP(email, otp);
    if (!isValidOTP) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Update user verified status using optimized function
    await markUserAsVerified(email);
    
    // Check for pending guest merge
    const pendingGuestId = await redis.get(`pending_merge:${email}`);
    if (pendingGuestId && typeof pendingGuestId === 'string') {
      try {
        await GenerationService.mergeGuestToUser(user.id, pendingGuestId);
        await redis.del(`pending_merge:${email}`); // Clean up
      } catch (error) {
        console.error("Failed to merge guest data:", error);
        // Don't fail verification if merge fails
      }
    }

    // Create session
    const session = {
      userId: user.id,
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