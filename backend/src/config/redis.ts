import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { config } from './index';
import { logger } from '../utils/logger';

// Create Redis client — falls back to a no-op mock if Upstash not configured
function createRedisClient(): Redis {
  if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
    logger.warn('Upstash Redis not configured — using in-memory fallback (not suitable for production)');
    // Return a mock that satisfies the interface minimally
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      keys: async () => [],
    } as unknown as Redis;
  }
  return new Redis({
    url: config.UPSTASH_REDIS_REST_URL,
    token: config.UPSTASH_REDIS_REST_TOKEN,
  });
}

export const redis = createRedisClient();

// Rate limiters for different endpoints
export const rateLimiters = {
  // General API: 100 req/min per IP
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'rl:api',
  }),

  // Auth endpoints: 10 req/min per IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'rl:auth',
  }),

  // Chat widget: 30 messages/min per session
  chat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'rl:chat',
  }),

  // Strict rate limit for sensitive operations
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'rl:strict',
  }),
};

export async function getCacheValue<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    logger.error('Redis get error', { key, error });
    return null;
  }
}

export async function setCacheValue<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    logger.error('Redis set error', { key, error });
  }
}

export async function deleteCacheValue(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Redis delete error', { key, error });
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    logger.error('Redis invalidate error', { pattern, error });
  }
}
