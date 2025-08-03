import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function deleteAllUsers() {
  try {
    // Initialize Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    console.log("🔍 Finding all user keys...");
    
    // Find all user-related keys
    const userKeys = await redis.keys("user:*");
    const otpKeys = await redis.keys("otp:*");
    const sessionKeys = await redis.keys("session:*");
    
    console.log(`Found ${userKeys.length} user keys`);
    console.log(`Found ${otpKeys.length} OTP keys`);
    console.log(`Found ${sessionKeys.length} session keys`);
    
    if (userKeys.length === 0 && otpKeys.length === 0 && sessionKeys.length === 0) {
      console.log("✅ No user data found to delete");
      return;
    }
    
    // Delete all keys
    const allKeys = [...userKeys, ...otpKeys, ...sessionKeys];
    
    console.log(`\n⚠️  WARNING: This will delete ${allKeys.length} keys from Redis!`);
    console.log("Keys to be deleted:");
    allKeys.forEach(key => console.log(`  - ${key}`));
    
    console.log("\n🗑️  Deleting all user data...");
    
    // Delete in batches to avoid potential issues with large datasets
    const batchSize = 100;
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize);
      await redis.del(...batch);
      console.log(`Deleted ${Math.min(i + batchSize, allKeys.length)} / ${allKeys.length} keys`);
    }
    
    console.log("\n✅ Successfully deleted all user data!");
    
    // Verify deletion
    const remainingUserKeys = await redis.keys("user:*");
    const remainingOtpKeys = await redis.keys("otp:*");
    const remainingSessionKeys = await redis.keys("session:*");
    
    console.log("\n📊 Verification:");
    console.log(`Remaining user keys: ${remainingUserKeys.length}`);
    console.log(`Remaining OTP keys: ${remainingOtpKeys.length}`);
    console.log(`Remaining session keys: ${remainingSessionKeys.length}`);
    
  } catch (error) {
    console.error("❌ Error deleting users:", error);
    process.exit(1);
  }
}

// Run the script
console.log("🚀 Starting user deletion script...\n");
deleteAllUsers()
  .then(() => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });