// Database schema for image generation tracking

export interface GuestUser {
  id: string; // Unique ID generated from fingerprint
  ipAddress: string;
  fingerprint: string; // Browser fingerprint
  createdAt: Date;
  generationCount: number;
  lastGenerationAt?: Date;
}

export interface ImageGeneration {
  id: string;
  userId?: string; // Optional - for logged in users
  guestId?: string; // Optional - for guest users
  prompt: string;
  negativePrompt?: string;
  imageUrl: string;
  imageData?: string; // Base64 encoded image data for storage
  modelId: string;
  aspectRatio: string;
  outputFormat: string;
  createdAt: Date;
  metadata?: {
    width: number;
    height: number;
    seed?: number;
    steps?: number;
    cfgScale?: number;
  };
}

export interface UserGenerationStats {
  userId: string;
  totalGenerations: number;
  freeGenerationsUsed: number;
  isPremium: boolean;
  subscriptionEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper types for API responses
export interface GenerationLimit {
  used: number;
  limit: number;
  remaining: number;
  isGuest: boolean;
}

export interface ChatHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
  metadata?: ImageGeneration['metadata'];
}