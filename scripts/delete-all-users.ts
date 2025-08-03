import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function deleteAllKeys() {
  try {
    // Initialize Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    console.log("🔍 Finding all keys in database...");
    
    // Find ALL keys in the database
    const allKeys = await redis.keys("*");
    
    console.log(`\n📊 Found ${allKeys.length} total keys in database`);
    
    if (allKeys.length === 0) {
      console.log("✅ Database is already empty");
      return;
    }
    
    // Group keys by type for better visibility
    const keyGroups: Record<string, string[]> = {};
    allKeys.forEach(key => {
      const prefix = key.split(':')[0];
      if (!keyGroups[prefix]) {
        keyGroups[prefix] = [];
      }
      keyGroups[prefix].push(key);
    });
    
    console.log("\n📋 Keys grouped by type:");
    Object.entries(keyGroups).forEach(([prefix, keys]) => {
      console.log(`  - ${prefix}: ${keys.length} keys`);
    });
    
    console.log(`\n⚠️  WARNING: This will delete ALL ${allKeys.length} keys from Redis!`);
    console.log("This includes:");
    Object.keys(keyGroups).forEach(prefix => {
      console.log(`  - All ${prefix} data`);
    });
    
    // Add confirmation prompt
    console.log("\n⏳ Starting deletion in 5 seconds... Press Ctrl+C to cancel");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log("\n🗑️  Deleting all keys...");
    
    // Delete in batches to avoid potential issues with large datasets
    const batchSize = 100;
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize);
      await redis.del(...batch);
      console.log(`Deleted ${Math.min(i + batchSize, allKeys.length)} / ${allKeys.length} keys`);
    }
    
    console.log("\n✅ Successfully deleted all data from Redis!");
    
    // Verify deletion
    const remainingKeys = await redis.keys("*");
    
    console.log("\n📊 Verification:");
    console.log(`Remaining keys in database: ${remainingKeys.length}`);
    
    if (remainingKeys.length > 0) {
      console.log("⚠️  Some keys were not deleted:");
      remainingKeys.forEach(key => console.log(`  - ${key}`));
    }
    
  } catch (error) {
    console.error("❌ Error deleting keys:", error);
    process.exit(1);
  }
}

// Run the script
console.log("🚀 Starting database cleanup script...\n");
console.log("⚠️  This will delete ALL data from your Redis database!");
console.log("Press Ctrl+C now if you want to cancel.\n");

deleteAllKeys()
  .then(() => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });