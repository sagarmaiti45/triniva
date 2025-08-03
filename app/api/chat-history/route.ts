import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from "@/lib/auth-options";
import { GenerationService } from "@/lib/db/generation-service";
import { generateGuestFingerprint } from "@/lib/guest-identification";
import { checkUsageLimits } from "@/lib/in-memory-tracking";
import type { ChatHistoryItem } from "@/lib/db/schema";

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
    
    console.log("Chat history fetch:", { userId, clientGuestId, guestId });
    
    // Create identifier for tracking
    const identifier = userId || guestId || 'unknown';
    
    let history: ChatHistoryItem[] = [];
    let limits;
    
    try {
      // Try to get chat history and limits from Redis
      history = await GenerationService.getChatHistory(userId, guestId || undefined);
      limits = await GenerationService.checkGenerationLimit(userId, guestId || undefined);
      console.log("Got history from Redis:", { count: history.length, limits });
    } catch (error) {
      // Fallback to in-memory tracking if Redis is not available
      console.log("Using in-memory tracking for chat history (Redis not configured):", error);
      limits = checkUsageLimits(identifier, !!userId);
      // History will remain empty in fallback mode
    }
    
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