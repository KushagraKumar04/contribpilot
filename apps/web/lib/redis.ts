import { getConfig } from '@contribpilot/config';
import Redis from 'ioredis';

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(getConfig().secrets.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true
    });
    client.on('error', () => {});
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}