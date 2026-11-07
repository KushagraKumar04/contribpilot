import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { getConfig } from '@contribpilot/config';

let connection: IORedis | undefined;
let analysisQueue: Queue | undefined;
let draftQueue: Queue | undefined;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(getConfig().secrets.redisUrl, {
      maxRetriesPerRequest: null
    });
  }
  return connection;
}

export function getAnalysisQueue(): Queue {
  if (!analysisQueue) {
    analysisQueue = new Queue(getConfig().queues.names.analysis, {
      connection: getRedisConnection()
    });
  }
  return analysisQueue;
}

export function getDraftQueue(): Queue {
  if (!draftQueue) {
    draftQueue = new Queue(getConfig().queues.names.draft, {
      connection: getRedisConnection()
    });
  }
  return draftQueue;
}