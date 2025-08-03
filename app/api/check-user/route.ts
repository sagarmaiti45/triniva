import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" });
    }
    
    const user = await getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" });
    }
    
    return NextResponse.json({
      found: true,
      email: user.email,
      name: user.name,
      verified: user.verified,
      id: user.id,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}