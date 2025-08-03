import { Redis } from "@upstash/redis";

// Lazy initialization with caching
let redisInstance: Redis | null = null;

export const redis = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    if (!redisInstance) {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error("Redis credentials not configured");
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

// Re-export Redis type for convenience
export { Redis } from "@upstash/redis";