import { NextRequest, NextResponse } from "next/server";
import { 
  getUserByEmail, 
  verifyPassword, 
  createToken, 
  storeSession 
} from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { GenerationService } from "@/lib/db/generation-service";

export async function POST(req: NextRequest) {
  try {
    const { email, password, recaptchaToken, guestId } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken, "login");
      if (!isValidRecaptcha) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.verified) {
      return NextResponse.json(
        { 
          error: "Please verify your email first",
          requiresVerification: true,
          email: user.email
        },
        { status: 403 }
      );
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
    
    // Merge guest data if guest ID provided
    if (guestId) {
      try {
        await GenerationService.mergeGuestToUser(user.id, guestId);
      } catch (error) {
        console.error("Failed to merge guest data:", error);
        // Don't fail login if merge fails
      }
    }

    // Set cookie
    const response = NextResponse.json({
      message: "Login successful",
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}