import { test } from '@playwright/test';
import Redis from 'ioredis';

/**
 * Rate Limit Setup
 * Clears all rate limit keys from Redis before running rate limit tests
 * This ensures tests start with a clean slate
 */

test('clear rate limit counters', async () => {
  console.log('\n🧹 Clearing rate limit counters from Redis...\n');

  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0,
  });

  try {
    // Find all rate limit keys
    const keys = await redis.keys('rate_limit:*');

    if (keys.length > 0) {
      console.log(`   Found ${keys.length} rate limit keys to delete`);
      await redis.del(...keys);
      console.log('✅ Rate limit counters cleared\n');
    } else {
      console.log('✅ No rate limit counters found (already clean)\n');
    }
  } catch (error) {
    console.error('❌ Failed to clear rate limit counters:', error);
    throw error;
  } finally {
    await redis.quit();
  }

  console.log('✨ Setup completed!\n');
});
