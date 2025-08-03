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
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      // If user exists but not verified, allow them to get a new OTP
      if (!existingUser.verified) {
        // Generate and store new OTP
        const otp = generateOTP();
        await storeOTP(email, otp);
        
        // Send OTP email
        await sendOTPEmail(email, existingUser.name, otp);
        
        return NextResponse.json({
          message: "User already exists but not verified. We've sent a new verification code.",
          email,
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
      name,
      email,
      password: hashedPassword,
      verified: false,
      createdAt: new Date(),
    };

    // Store user in Redis
    await storeUser(user);

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp);
    
    // Store guest ID temporarily if provided
    if (guestId) {
      const { redis } = await import("@/lib/redis");
      await redis.setex(`pending_merge:${email}`, 3600, guestId); // Store for 1 hour
    }

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    return NextResponse.json({
      message: "Registration successful. Please check your email for verification code.",
      email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}