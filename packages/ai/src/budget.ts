import IORedis from 'ioredis';
import { getConfig } from '@contribpilot/config';
import { aiBudgetExceeded } from './errors';

let client: IORedis | undefined;

function getClient(): IORedis {
  if (!client) {
    client = new IORedis(getConfig().secrets.redisUrl, { enableReadyCheck: false });
    client.on('error', () => {});
  }
  return client;
}

function todayKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `ai:budget:${userId}:${day}`;
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function assertBudget(userId: string, projectedTokens: number): Promise<void> {
  const config = getConfig();
  if (!config.ai.budget.enabled) return;

  const redis = getClient();
  const used = Number((await redis.get(todayKey(userId))) ?? '0');
  if (used + projectedTokens > config.ai.dailyTokensPerUser) {
    throw aiBudgetExceeded('Daily AI token budget reached for this account', {
      used,
      limit: config.ai.dailyTokensPerUser
    });
  }
}

export async function recordUsage(userId: string, tokens: number): Promise<void> {
  const config = getConfig();
  if (!config.ai.budget.enabled) return;

  const redis = getClient();
  const key = todayKey(userId);
  const next = await redis.incrby(key, tokens);
  if (next === tokens) {
    await redis.expire(key, 60 * 60 * 24 * 2);
  }
}