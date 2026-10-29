import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { getConfig } from '@contribpilot/config';

let bullConnection: IORedis | undefined;
let analysisQueue: Queue | undefined;
let draftQueue: Queue | undefined;

function getBullRedis(): IORedis {
  if (!bullConnection) {
    bullConnection = new IORedis(getConfig().secrets.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
    bullConnection.on('error', () => {});
  }
  return bullConnection;
}

export function getAnalysisQueue(): Queue {
  if (!analysisQueue) {
    analysisQueue = new Queue(getConfig().queues.names.analysis, {
      connection: getBullRedis()
    });
  }
  return analysisQueue;
}

export function getDraftQueue(): Queue {
  if (!draftQueue) {
    draftQueue = new Queue(getConfig().queues.names.draft, {
      connection: getBullRedis()
    });
  }
  return draftQueue;
}

let prQueue: Queue | undefined;

export function getPrQueue(): Queue {
  if (!prQueue) {
    prQueue = new Queue(getConfig().queues.names.pr, {
      connection: getBullRedis()
    });
  }
  return prQueue;
}