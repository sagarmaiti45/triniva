import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "No token found" });
    }
    
    // Try to decode without verification first
    const decoded = jwt.decode(token);
    
    // Try to verify
    let verified = null;
    let verifyError = null;
    try {
      verified = verifyToken(token);
    } catch (error) {
      verifyError = error instanceof Error ? error.message : "Unknown error";
    }
    
    // Try to get session from Redis
    let redisSession = null;
    let redisError = null;
    try {
      const { getSession } = await import("@/lib/auth");
      redisSession = await getSession(token);
    } catch (error) {
      redisError = error instanceof Error ? error.message : "Unknown error";
    }
    
    return NextResponse.json({
      hasToken: true,
      decoded,
      verified,
      verifyError,
      redisSession,
      redisError,
      jwtSecret: process.env.JWT_SECRET ? "set" : "not set",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}