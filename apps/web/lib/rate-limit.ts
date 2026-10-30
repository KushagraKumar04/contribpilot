import { getRedis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  limit: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const bucket = `rl:${key}`;
  const count = await redis.incr(bucket);

  if (count === 1) {
    await redis.expire(bucket, windowSeconds);
  }

  const ttl = await redis.ttl(bucket);
  const resetSeconds = ttl < 0 ? windowSeconds : ttl;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetSeconds,
    limit
  };
}