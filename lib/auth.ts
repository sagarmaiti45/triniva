import { Redis } from "@upstash/redis";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

// Lazy initialization with caching
let redisInstance: Redis | null = null;
let resendInstance: Resend | null = null;

const redis = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    if (!redisInstance) {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error("Redis credentials not configured");
      }
      redisInstance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    return Reflect.get(redisInstance, prop, receiver);
  }
});

const resend = new Proxy({} as Resend, {
  get(target, prop, receiver) {
    if (!resendInstance) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("Resend API key not configured");
      }
      resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return Reflect.get(resendInstance, prop, receiver);
  }
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-in-production";

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  verified: boolean;
  createdAt: Date;
}

// Session interface
export interface Session {
  id: string;
  email: string;
  name: string;
}

// Generate OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export function createToken(session: Session): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT token
export function verifyToken(token: string): Session | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Extract only the session data, excluding JWT metadata
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Store user in Redis
export async function storeUser(user: User): Promise<void> {
  const normalizedEmail = user.email.toLowerCase().trim();
  await redis.hset(`user:${normalizedEmail}`, {
    id: user.id,
    name: user.name,
    email: normalizedEmail,
    password: user.password,
    verified: user.verified ? "true" : "false",
    createdAt: user.createdAt.toISOString()
  });
  await redis.hset(`user:id:${user.id}`, { email: normalizedEmail });
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await redis.hgetall(`user:${normalizedEmail}`);
  if (!user || Object.keys(user).length === 0) return null;
  
  // Debug logging
  console.log('getUserByEmail - Raw verified value:', user.verified);
  console.log('getUserByEmail - Type of verified:', typeof user.verified);
  console.log('getUserByEmail - Comparison result:', user.verified === "true");
  
  return {
    id: user.id as string,
    name: user.name as string,
    email: user.email as string,
    password: user.password as string,
    verified: user.verified === "true",
    createdAt: new Date(user.createdAt as string),
  };
}

// Store OTP in Redis with 10 minute expiry
export async function storeOTP(email: string, otp: string): Promise<void> {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('Storing OTP:', { email: normalizedEmail, otp });
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.setex(`otp:${normalizedEmail}`, 600, otp); // 10 minutes
    pipeline.incr(`otp:attempts:${normalizedEmail}`); // Track OTP generation attempts
    pipeline.expire(`otp:attempts:${normalizedEmail}`, 3600); // Reset attempts after 1 hour
    await pipeline.exec();
  } catch (error) {
    console.error('Failed to store OTP:', error);
    throw new Error('Failed to store verification code');
  }
}

// Verify OTP
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    const storedOTP = await redis.get(`otp:${normalizedEmail}`);
    
    // Debug logging
    console.log('Verifying OTP:', { email: normalizedEmail, provided: otp, stored: storedOTP });
    
    if (!storedOTP) {
      console.log('No OTP found for email:', normalizedEmail);
      return false;
    }
    
    // Convert both to strings and trim whitespace
    const normalizedStored = String(storedOTP).trim();
    const normalizedProvided = String(otp).trim();
    
    if (normalizedStored !== normalizedProvided) {
      console.log('OTP mismatch:', { stored: normalizedStored, provided: normalizedProvided });
      return false;
    }
    
    // Use pipeline for atomic cleanup
    const pipeline = redis.pipeline();
    pipeline.del(`otp:${normalizedEmail}`);
    pipeline.del(`otp:attempts:${normalizedEmail}`);
    await pipeline.exec();
    
    return true;
  } catch (error) {
    console.error('OTP verification error:', error);
    return false;
  }
}

// Send OTP email
export async function sendOTPEmail(email: string, name: string, otp: string): Promise<void> {
  try {
    console.log('Attempting to send email to:', email);
    
    // Use environment variable for from email or default to resend domain
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Triniva AI <otp@triniva.com>";
    
    console.log('Using from email:', fromEmail);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Verify your email - Triniva AI",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p>Thank you for signing up with Triniva AI!</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #ff3d7f; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Triniva AI - AI-powered image generation<br>
            Visit us at Triniva.com
          </p>
        </div>
      `,
    });
    
    console.log('Email response:', { data, error });
    
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Store session in Redis
export async function storeSession(token: string, session: Session): Promise<void> {
  // Upstash Redis automatically handles JSON serialization
  await redis.setex(`session:${token}`, 604800, session); // 7 days
}

// Get session from Redis
export async function getSession(token: string): Promise<Session | null> {
  // Upstash Redis automatically handles JSON deserialization
  const sessionData = await redis.get(`session:${token}`);
  if (!sessionData) return null;
  
  return sessionData as Session;
}

// Delete session
export async function deleteSession(token: string): Promise<void> {
  await redis.del(`session:${token}`);
}

// Check OTP attempts to prevent abuse
export async function checkOTPAttempts(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const attempts = await redis.get(`otp:attempts:${normalizedEmail}`);
  const attemptCount = attempts ? parseInt(String(attempts)) : 0;
  console.log(`OTP attempts for ${normalizedEmail}: ${attemptCount}`);
  return attemptCount < 5; // Max 5 attempts per hour
}

// Mark user as verified
export async function markUserAsVerified(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('markUserAsVerified: Starting for email:', normalizedEmail);
  
  const user = await getUserByEmail(normalizedEmail);
  if (!user) throw new Error("User not found");
  
  console.log('markUserAsVerified: User before update:', user);
  user.verified = true;
  
  await storeUser(user);
  console.log('markUserAsVerified: User stored with verified=true');
  
  // Verify the update
  const updatedUser = await getUserByEmail(normalizedEmail);
  console.log('markUserAsVerified: User after update:', updatedUser);
}

// Cleanup unverified users older than 24 hours
export async function cleanupUnverifiedUsers(): Promise<void> {
  // This would be called by a cron job in production
  const keys = await redis.keys("user:*");
  const now = Date.now();
  
  for (const key of keys) {
    if (key.includes(":id:")) continue; // Skip ID mapping keys
    
    const user = await redis.hgetall(key);
    if (user && !user.verified && user.createdAt) {
      const createdAt = new Date(user.createdAt as string).getTime();
      if (now - createdAt > 86400000) { // 24 hours
        await redis.del(key);
        await redis.del(`user:id:${user.id}`);
      }
    }
  }
}