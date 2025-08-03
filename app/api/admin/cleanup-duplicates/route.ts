import { NextRequest, NextResponse } from "next/server";
import { GenerationService } from "@/lib/db/generation-service";
import { redis } from "@/lib/redis";

// This is an admin endpoint - should be protected in production
export async function POST(req: NextRequest) {
  try {
    // In production, add authentication check here
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { userId, guestId, cleanAll } = await req.json();
    
    let totalCleaned = 0;
    
    if (cleanAll) {
      // Clean all users and guests (be careful with this!)
      const allUserKeys = await redis.keys("history:user:*");
      const allGuestKeys = await redis.keys("history:guest:*");
      
      for (const key of [...allUserKeys, ...allGuestKeys]) {
        const [, type, id] = key.split(":");
        const cleaned = await GenerationService.cleanupDuplicates(
          type === "user" ? id : undefined,
          type === "guest" ? id : undefined
        );
        totalCleaned += cleaned;
      }
    } else if (userId || guestId) {
      // Clean specific user or guest
      totalCleaned = await GenerationService.cleanupDuplicates(userId, guestId);
    } else {
      return NextResponse.json(
        { error: "Please provide userId, guestId, or cleanAll flag" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: `Successfully cleaned ${totalCleaned} duplicate entries`,
      duplicatesRemoved: totalCleaned
    });
    
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}