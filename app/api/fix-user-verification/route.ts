import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get current user data
    const userData = await redis.hgetall(`user:${normalizedEmail}`);
    
    if (!userData || Object.keys(userData).length === 0) {
      return NextResponse.json({ error: "User not found" });
    }
    
    console.log('Current user data:', userData);
    console.log('Current verified value:', userData.verified);
    console.log('Type of verified:', typeof userData.verified);
    
    // Force update verified to string "true"
    await redis.hset(`user:${normalizedEmail}`, "verified", "true");
    
    // Get updated data
    const updatedData = await redis.hgetall(`user:${normalizedEmail}`);
    
    return NextResponse.json({
      message: "User verification status updated",
      before: userData,
      after: updatedData,
      verifiedBefore: userData.verified,
      verifiedAfter: updatedData.verified,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}