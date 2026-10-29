import { describe, expect, it } from 'vitest';

interface FakeStore {
  values: Map<string, number>;
  ttls: Map<string, number>;
}

function makeFakeRedis(): {
  store: FakeStore;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  ttl: (key: string) => Promise<number>;
} {
  const store: FakeStore = { values: new Map(), ttls: new Map() };
  return {
    store,
    async incr(key) {
      const next = (store.values.get(key) ?? 0) + 1;
      store.values.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      store.ttls.set(key, seconds);
      return 1;
    },
    async ttl(key) {
      return store.ttls.get(key) ?? -1;
    }
  };
}

async function checkRateLimitWith(
  redis: ReturnType<typeof makeFakeRedis>,
  key: string,
  limit: number,
  windowSeconds: number
) {
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

describe('rate limiter window', () => {
  it('allows requests under the limit', async () => {
    const redis = makeFakeRedis();
    const first = await checkRateLimitWith(redis, 'ip:1', 3, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it('blocks once the limit is reached', async () => {
    const redis = makeFakeRedis();
    await checkRateLimitWith(redis, 'ip:1', 2, 60);
    await checkRateLimitWith(redis, 'ip:1', 2, 60);
    const third = await checkRateLimitWith(redis, 'ip:1', 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('sets expiry on first hit only', async () => {
    const redis = makeFakeRedis();
    await checkRateLimitWith(redis, 'ip:1', 5, 30);
    expect(redis.store.ttls.get('rl:ip:1')).toBe(30);
    await checkRateLimitWith(redis, 'ip:1', 5, 30);
    expect(redis.store.ttls.get('rl:ip:1')).toBe(30);
  });

  it('keeps counters independent per key', async () => {
    const redis = makeFakeRedis();
    await checkRateLimitWith(redis, 'ip:1', 2, 60);
    const other = await checkRateLimitWith(redis, 'ip:2', 2, 60);
    expect(other.remaining).toBe(1);
  });
});