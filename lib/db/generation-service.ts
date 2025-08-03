import { redis } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import type { 
  GuestUser, 
  ImageGeneration, 
  UserGenerationStats, 
  GenerationLimit,
  ChatHistoryItem 
} from './schema';

const GUEST_GENERATION_LIMIT = 3;
const FREE_USER_GENERATION_LIMIT = 10;

export class GenerationService {
  // Get or create guest user
  static async getOrCreateGuestUser(fingerprint: string, ipAddress: string): Promise<GuestUser> {
    const guestKey = `guest:${fingerprint}`;
    const existingGuest = await redis.get(guestKey);
    
    if (existingGuest && typeof existingGuest === 'string') {
      return JSON.parse(existingGuest);
    }
    
    const newGuest: GuestUser = {
      id: fingerprint,
      ipAddress,
      fingerprint,
      createdAt: new Date(),
      generationCount: 0
    };
    
    await redis.set(guestKey, JSON.stringify(newGuest));
    return newGuest;
  }
  
  // Get or create user generation stats
  static async getOrCreateUserStats(userId: string): Promise<UserGenerationStats> {
    const statsKey = `user_stats:${userId}`;
    const existingStats = await redis.get(statsKey);
    
    if (existingStats && typeof existingStats === 'string') {
      return JSON.parse(existingStats);
    }
    
    const newStats: UserGenerationStats = {
      userId,
      totalGenerations: 0,
      freeGenerationsUsed: 0,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await redis.set(statsKey, JSON.stringify(newStats));
    return newStats;
  }
  
  // Check generation limits
  static async checkGenerationLimit(userId?: string, guestId?: string): Promise<GenerationLimit> {
    if (userId) {
      const stats = await this.getOrCreateUserStats(userId);
      const limit = stats.isPremium ? Infinity : FREE_USER_GENERATION_LIMIT;
      const used = stats.freeGenerationsUsed;
      
      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        isGuest: false
      };
    } else if (guestId) {
      const guest = await redis.get(`guest:${guestId}`);
      if (!guest) {
        return {
          used: 0,
          limit: GUEST_GENERATION_LIMIT,
          remaining: GUEST_GENERATION_LIMIT,
          isGuest: true
        };
      }
      
      const guestData: GuestUser = JSON.parse(guest as string);
      return {
        used: guestData.generationCount,
        limit: GUEST_GENERATION_LIMIT,
        remaining: Math.max(0, GUEST_GENERATION_LIMIT - guestData.generationCount),
        isGuest: true
      };
    }
    
    throw new Error('Either userId or guestId must be provided');
  }
  
  // Save image generation
  static async saveGeneration(generation: Omit<ImageGeneration, 'id' | 'createdAt'>): Promise<ImageGeneration> {
    // Check for duplicate based on prompt and recent time window
    const historyKey = generation.userId 
      ? `history:user:${generation.userId}`
      : `history:guest:${generation.guestId}`;
    
    // Get ALL generations to check for exact duplicates
    const allIds = await redis.lrange(historyKey, 0, -1);
    
    if (allIds && allIds.length > 0) {
      // Check last 10 for exact prompt match
      const checkIds = allIds.slice(0, 10);
      
      for (const recentId of checkIds) {
        const recentGen = await redis.get(`generation:${recentId}`);
        if (recentGen) {
          const recent: ImageGeneration = JSON.parse(recentGen as string);
          const timeDiff = Date.now() - new Date(recent.createdAt).getTime();
          
          // If exact same prompt within 30 seconds, it's definitely a duplicate
          if (recent.prompt.toLowerCase().trim() === generation.prompt.toLowerCase().trim() && timeDiff < 30000) {
            console.log('Duplicate generation detected, returning existing');
            return recent; // Return existing generation
          }
        }
      }
    }
    
    const id = uuidv4();
    const createdAt = new Date();
    
    const fullGeneration: ImageGeneration = {
      ...generation,
      id,
      createdAt
    };
    
    // Save to Redis with TTL of 30 days for guests, permanent for users
    const ttl = generation.userId ? undefined : 30 * 24 * 60 * 60; // 30 days in seconds
    const key = `generation:${id}`;
    
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(fullGeneration));
    } else {
      await redis.set(key, JSON.stringify(fullGeneration));
    }
    
    // Add to user/guest history
    await redis.lpush(historyKey, id);
    
    // Limit history size to prevent unbounded growth
    await redis.ltrim(historyKey, 0, 99); // Keep only last 100 items
    
    // Update generation count
    if (generation.userId) {
      const stats = await this.getOrCreateUserStats(generation.userId);
      stats.freeGenerationsUsed++;
      stats.totalGenerations++;
      stats.updatedAt = new Date();
      await redis.set(`user_stats:${generation.userId}`, JSON.stringify(stats));
    } else if (generation.guestId) {
      const guest = await this.getOrCreateGuestUser(generation.guestId, '');
      guest.generationCount++;
      guest.lastGenerationAt = new Date();
      await redis.set(`guest:${generation.guestId}`, JSON.stringify(guest));
    }
    
    return fullGeneration;
  }
  
  // Get chat history
  static async getChatHistory(userId?: string, guestId?: string): Promise<ChatHistoryItem[]> {
    const historyKey = userId 
      ? `history:user:${userId}`
      : `history:guest:${guestId}`;
    
    // Get last 50 generation IDs
    const generationIds = await redis.lrange(historyKey, 0, 49);
    
    if (!generationIds || generationIds.length === 0) {
      return [];
    }
    
    // Fetch all generations
    const generations = await Promise.all(
      generationIds.map(async (id) => {
        const data = await redis.get(`generation:${id}`);
        return data && typeof data === 'string' ? JSON.parse(data) : null;
      })
    );
    
    // Filter out null values and remove duplicates based on exact prompt match
    const seen = new Map<string, ChatHistoryItem>();
    const promptCounts = new Map<string, number>();
    
    // First pass: count occurrences
    generations
      .filter(Boolean)
      .forEach((gen: ImageGeneration) => {
        const key = gen.prompt.toLowerCase().trim();
        promptCounts.set(key, (promptCounts.get(key) || 0) + 1);
      });
    
    // Second pass: only keep first occurrence of each prompt
    generations
      .filter(Boolean)
      .forEach((gen: ImageGeneration) => {
        const key = gen.prompt.toLowerCase().trim();
        
        // Skip if we've already seen this exact prompt
        if (seen.has(key)) {
          return;
        }
        
        seen.set(key, {
          id: gen.id,
          prompt: gen.prompt,
          imageUrl: gen.imageUrl,
          createdAt: gen.createdAt,
          metadata: gen.metadata
        });
      });
    
    // Return unique items sorted by date (newest first)
    return Array.from(seen.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  // Merge guest history with user account
  static async mergeGuestToUser(userId: string, guestId: string): Promise<void> {
    // Get guest history
    const guestHistoryKey = `history:guest:${guestId}`;
    const userHistoryKey = `history:user:${userId}`;
    
    const guestGenerationIds = await redis.lrange(guestHistoryKey, 0, -1);
    
    if (guestGenerationIds && guestGenerationIds.length > 0) {
      // Update each generation to belong to the user
      for (const genId of guestGenerationIds) {
        const genData = await redis.get(`generation:${genId}`);
        if (genData) {
          const generation: ImageGeneration = JSON.parse(genData as string);
          generation.userId = userId;
          generation.guestId = undefined;
          
          // Save updated generation
          await redis.set(`generation:${genId}`, JSON.stringify(generation));
          
          // Add to user history
          await redis.lpush(userHistoryKey, genId);
        }
      }
      
      // Update user stats with guest generations
      const guest = await redis.get(`guest:${guestId}`);
      if (guest) {
        const guestData: GuestUser = JSON.parse(guest as string);
        const userStats = await this.getOrCreateUserStats(userId);
        
        userStats.freeGenerationsUsed += guestData.generationCount;
        userStats.totalGenerations += guestData.generationCount;
        userStats.updatedAt = new Date();
        
        await redis.set(`user_stats:${userId}`, JSON.stringify(userStats));
      }
      
      // Clean up guest data
      await redis.del(guestHistoryKey);
      await redis.del(`guest:${guestId}`);
    }
  }
  
  // Cleanup duplicate entries (maintenance function)
  static async cleanupDuplicates(userId?: string, guestId?: string): Promise<number> {
    const historyKey = userId 
      ? `history:user:${userId}`
      : `history:guest:${guestId}`;
    
    // Get all generation IDs
    const allIds = await redis.lrange(historyKey, 0, -1);
    
    if (!allIds || allIds.length === 0) {
      return 0;
    }
    
    // Track seen prompts and their timestamps
    const seenPrompts = new Map<string, { id: string; timestamp: number }>();
    const duplicateIds: string[] = [];
    
    // Process each generation
    for (const id of allIds) {
      const data = await redis.get(`generation:${id}`);
      if (!data) continue;
      
      const gen: ImageGeneration = JSON.parse(data as string);
      const promptKey = gen.prompt.toLowerCase().trim();
      const timestamp = new Date(gen.createdAt).getTime();
      
      const existing = seenPrompts.get(promptKey);
      
      if (!existing) {
        seenPrompts.set(promptKey, { id, timestamp });
      } else {
        // If prompts are the same and within 10 seconds, mark as duplicate
        if (Math.abs(timestamp - existing.timestamp) < 10000) {
          // Keep the newer one
          if (timestamp > existing.timestamp) {
            duplicateIds.push(existing.id);
            seenPrompts.set(promptKey, { id, timestamp });
          } else {
            duplicateIds.push(id);
          }
        } else {
          // Different time, keep both
          seenPrompts.set(`${promptKey}_${timestamp}`, { id, timestamp });
        }
      }
    }
    
    // Remove duplicates from history
    if (duplicateIds.length > 0) {
      const pipeline = redis.pipeline();
      
      for (const dupId of duplicateIds) {
        pipeline.lrem(historyKey, 0, dupId);
        pipeline.del(`generation:${dupId}`);
      }
      
      await pipeline.exec();
    }
    
    return duplicateIds.length;
  }
}