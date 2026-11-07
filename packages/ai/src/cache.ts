import IORedis from 'ioredis';
import { createHash } from 'node:crypto';
import { getConfig } from '@contribpilot/config';

let client: IORedis | undefined;

function getClient(): IORedis {
  if (!client) {
    client = new IORedis(getConfig().secrets.redisUrl, { enableReadyCheck: false });
    client.on('error', () => {});
  }
  return client;
}

export function cacheKeyFor(parts: {
  task: string;
  model: string;
  promptVersion: string;
  input: string;
}): string {
  const hash = createHash('sha256')
    .update(`${parts.task}|${parts.model}|${parts.promptVersion}|${parts.input}`)
    .digest('hex');
  return `ai:cache:${hash}`;
}

export async function readCache<T>(key: string): Promise<T | null> {
  const config = getConfig();
  if (!config.ai.cache.enabled) return null;
  const raw = await getClient().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  const config = getConfig();
  if (!config.ai.cache.enabled) return;
  await getClient().set(key, JSON.stringify(value), 'EX', config.cache.ttl.llmSeconds);
}