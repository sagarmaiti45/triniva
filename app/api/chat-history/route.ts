import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth-options";
import { GenerationService } from "@/lib/db/generation-service";
import { generateGuestFingerprint } from "@/lib/guest-identification";

export async function GET(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Get guestId from query params or generate fingerprint
    const url = new URL(req.url);
    const clientGuestId = url.searchParams.get('guestId');
    
    let guestId = clientGuestId;
    if (!userId && !guestId) {
      const { fingerprint } = await generateGuestFingerprint(req);
      guestId = fingerprint;
    }
    
    // Get chat history
    const history = await GenerationService.getChatHistory(userId, guestId || undefined);
    
    // Get current limits
    const limits = await GenerationService.checkGenerationLimit(userId, guestId || undefined);
    
    return NextResponse.json({
      history,
      limits,
      isAuthenticated: !!userId
    });
    
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}