import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const testKey = "test:boolean:values";
    
    // Test different ways of storing boolean values
    await redis.hset(testKey, {
      boolTrue: true,
      boolFalse: false,
      stringTrue: "true",
      stringFalse: "false",
      number1: 1,
      number0: 0,
    });
    
    // Retrieve the values
    const retrieved = await redis.hgetall(testKey);
    
    // Clean up
    await redis.del(testKey);
    
    return NextResponse.json({
      stored: {
        boolTrue: true,
        boolFalse: false,
        stringTrue: "true",
        stringFalse: "false",
        number1: 1,
        number0: 0,
      },
      retrieved,
      types: {
        boolTrue: typeof retrieved?.boolTrue,
        boolFalse: typeof retrieved?.boolFalse,
        stringTrue: typeof retrieved?.stringTrue,
        stringFalse: typeof retrieved?.stringFalse,
        number1: typeof retrieved?.number1,
        number0: typeof retrieved?.number0,
      },
      comparisons: {
        boolTrue_equals_true: retrieved?.boolTrue === true,
        boolTrue_equals_string_true: retrieved?.boolTrue === "true",
        boolTrue_equals_string_1: retrieved?.boolTrue === "1",
        boolFalse_equals_false: retrieved?.boolFalse === false,
        boolFalse_equals_string_false: retrieved?.boolFalse === "false",
        boolFalse_equals_string_0: retrieved?.boolFalse === "0",
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}