import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get user data
    const user = await getUserByEmail(normalizedEmail);
    
    // Get raw Redis data
    const rawData = await redis.hgetall(`user:${normalizedEmail}`);
    
    return NextResponse.json({
      normalizedEmail,
      user,
      rawData,
      verifiedField: rawData?.verified,
      verifiedType: typeof rawData?.verified,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}