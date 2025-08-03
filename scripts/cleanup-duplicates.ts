import { redis } from '@/lib/redis';
import { GenerationService } from '@/lib/db/generation-service';

async function cleanupAllDuplicates() {
  console.log('Starting duplicate cleanup...');
  
  try {
    // Get all history keys
    const userKeys = await redis.keys('history:user:*');
    const guestKeys = await redis.keys('history:guest:*');
    
    let totalRemoved = 0;
    
    // Process user histories
    for (const key of userKeys) {
      const userId = key.split(':')[2];
      const removed = await GenerationService.cleanupDuplicates(userId, undefined);
      if (removed > 0) {
        console.log(`Removed ${removed} duplicates from user ${userId}`);
        totalRemoved += removed;
      }
    }
    
    // Process guest histories
    for (const key of guestKeys) {
      const guestId = key.split(':')[2];
      const removed = await GenerationService.cleanupDuplicates(undefined, guestId);
      if (removed > 0) {
        console.log(`Removed ${removed} duplicates from guest ${guestId}`);
        totalRemoved += removed;
      }
    }
    
    console.log(`Cleanup complete! Total duplicates removed: ${totalRemoved}`);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupAllDuplicates().then(() => process.exit(0));
}

export { cleanupAllDuplicates };