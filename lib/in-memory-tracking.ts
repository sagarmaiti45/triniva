// Shared in-memory tracking for when Redis is not available
// This ensures consistent tracking across API routes

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const usageMap = new Map<string, { count: number; firstUsed: number }>();

export function checkRateLimit(identifier: string, isUser: boolean): { success: boolean; remaining: number } {
  const now = Date.now();
  const limit = isUser ? 100 : 10; // 100 per day for users, 10 per day for guests
  const window = 24 * 60 * 60 * 1000; // 24 hours
  
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + window });
    return { success: true, remaining: limit - 1 };
  }
  
  if (userLimit.count >= limit) {
    return { success: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { success: true, remaining: limit - userLimit.count };
}

export function checkUsageLimits(identifier: string, isUser: boolean): { used: number; limit: number; remaining: number; isGuest: boolean } {
  const limit = isUser ? 10 : 3;
  const usage = usageMap.get(identifier) || { count: 0, firstUsed: Date.now() };
  
  return {
    used: usage.count,
    limit,
    remaining: Math.max(0, limit - usage.count),
    isGuest: !isUser
  };
}

export function incrementUsage(identifier: string): void {
  const usage = usageMap.get(identifier) || { count: 0, firstUsed: Date.now() };
  usage.count++;
  usageMap.set(identifier, usage);
}

// Debug function to view current usage
export function getUsageStats() {
  const stats = Array.from(usageMap.entries()).map(([id, usage]) => ({
    id,
    ...usage
  }));
  return stats;
}