import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => console.error('❌ Redis error:', err));
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('✅ Redis ready'));

// Cache TTL constants (in seconds) - optimized for reduced database load
export const CACHE_TTL = {
  POOL_DATA: 300,         // 5 minutes (was 60s) - pools don't change often
  TOKEN_PRICE: 30,        // 30 seconds (was 15s) - reduce API calls
  USER_SESSION: 7200,     // 2 hours (was 1h) - longer sessions
  LEADERBOARD: 600,       // 10 minutes (was 5m) - leaderboard updates slowly
  USER_STATS: 600,        // 10 minutes (was 2m) - stats don't change rapidly
  REFERRAL_CODE: 86400,   // 24 hours - optimal
  PLATFORM_STATS: 1800,   // 30 minutes (was 10m) - platform stats are slow-changing
};

// Cache key generators
export const cacheKeys = {
  pool: (poolId: string) => `pool:${poolId}`,
  poolList: (protocol?: string) => protocol ? `pools:${protocol}` : 'pools:all',
  tokenPrice: (mint: string) => `price:${mint}`,
  userSession: (wallet: string) => `session:${wallet}`,
  userStats: (wallet: string) => `stats:${wallet}`,
  leaderboard: () => 'leaderboard:referrals',
  platformStats: () => 'stats:platform',
  referralCode: (code: string) => `referral:${code}`,
  userReferralCode: (wallet: string) => `user:${wallet}:referral_code`,
};

// Cache helpers
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Cache get error:', { key, error });
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('❌ Cache set error:', { key, error });
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('❌ Cache delete error:', { key, error });
  }
}

export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('❌ Cache delete pattern error:', { pattern, error });
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  await redis.quit();
  console.log('👋 Redis connection closed');
}
