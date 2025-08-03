import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { 
  getUserByEmail, 
  storeUser, 
  hashPassword, 
  generateOTP, 
  storeOTP, 
  sendOTPEmail 
} from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { GenerationService } from "@/lib/db/generation-service";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, recaptchaToken, guestId } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken, "register");
      if (!isValidRecaptcha) {
        return NextResponse.json(
          { error: "reCAPTCHA verification failed. Please try again." },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      // If user exists but not verified, allow them to get a new OTP
      if (!existingUser.verified) {
        // Generate and store new OTP
        const otp = generateOTP();
        await storeOTP(normalizedEmail, otp);
        
        // Send OTP email
        await sendOTPEmail(normalizedEmail, existingUser.name, otp);
        
        return NextResponse.json({
          message: "User already exists but not verified. We've sent a new verification code.",
          email: normalizedEmail,
          requiresVerification: true,
        });
      }
      
      return NextResponse.json(
        { error: "User already exists. Please sign in." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = {
      id: uuidv4(),
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      verified: false,
      createdAt: new Date(),
    };

    // Store user in Redis
    await storeUser(user);

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(normalizedEmail, otp);
    
    // Store guest ID temporarily if provided
    if (guestId) {
      const { redis } = await import("@/lib/redis");
      await redis.setex(`pending_merge:${normalizedEmail}`, 3600, guestId); // Store for 1 hour
    }

    // Send OTP email
    await sendOTPEmail(normalizedEmail, trimmedName, otp);

    return NextResponse.json({
      message: "Registration successful. Please check your email for verification code.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Redis credentials not configured")) {
        return NextResponse.json(
          { error: "Database connection error. Please contact support." },
          { status: 500 }
        );
      }
      if (error.message.includes("Resend API key not configured")) {
        return NextResponse.json(
          { error: "Email service not configured. Please contact support." },
          { status: 500 }
        );
      }
      if (error.message.includes("resend")) {
        return NextResponse.json(
          { error: "Failed to send verification email. Please try again." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 }
    );
  }
}