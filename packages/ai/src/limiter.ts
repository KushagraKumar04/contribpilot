import IORedis from 'ioredis';
import { getConfig } from '@contribpilot/config';

let client: IORedis | undefined;

function getClient(): IORedis {
  if (!client) {
    client = new IORedis(getConfig().secrets.redisUrl, { enableReadyCheck: false });
    client.on('error', () => {});
  }
  return client;
}

export interface LimiterDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function acquireSlot(scope: string): Promise<LimiterDecision> {
  const config = getConfig();
  if (!config.ai.limiter.enabled) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const key = `${config.ai.limiter.keyPrefix}:${scope}`;
  const windowSeconds = 60;
  const redis = getClient();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const limit = scope === 'tpm' ? config.ai.tpmLimit : config.ai.rpmLimit;
  const ttl = await redis.ttl(key);
  const reset = ttl > 0 ? ttl : windowSeconds;

  if (count > limit) {
    return { allowed: false, retryAfterSeconds: reset };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}