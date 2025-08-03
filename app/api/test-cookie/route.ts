import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get("auth-token");
  const allCookies = req.cookies.getAll();
  
  return NextResponse.json({
    hasAuthToken: !!authToken,
    authTokenValue: authToken?.value ? "exists (hidden)" : "none",
    allCookies: allCookies.map(c => ({ name: c.name, exists: true })),
    headers: {
      cookie: req.headers.get("cookie") || "none",
    }
  });
}

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ message: "Test cookie set" });
  
  response.cookies.set({
    name: "test-cookie",
    value: "test-value",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });
  
  return response;
}