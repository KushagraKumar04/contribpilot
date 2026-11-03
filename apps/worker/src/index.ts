import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'bullmq';
import { getConfig } from '@contribpilot/config';
import { analyzeRepo } from './jobs/analyzeRepo';
import { draftChange } from './jobs/draftChange';
import { getRedisConnection } from './queues';
import { createPr } from './jobs/createPr';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });

const config = getConfig();

const analysisWorker = new Worker(config.queues.names.analysis, analyzeRepo, {
  connection: getRedisConnection(),
  concurrency: config.queues.concurrency.analysis
});

analysisWorker.on('ready', () => {
  console.log(`[worker] analysis worker ready (concurrency=${config.queues.concurrency.analysis})`);
});

analysisWorker.on('failed', (job, error) => {
  console.error(`[worker] job ${job?.id ?? 'unknown'} failed`, error);
});

analysisWorker.on('completed', (job) => {
  console.log(`[worker] job ${job.id ?? 'unknown'} completed`);
});

const draftWorker = new Worker(config.queues.names.draft, draftChange, {
  connection: getRedisConnection(),
  concurrency: config.queues.concurrency.draft
});

const prWorker = new Worker(config.queues.names.pr, createPr, {
  connection: getRedisConnection(),
  concurrency: config.queues.concurrency.pr
});

draftWorker.on('ready', () => {
  console.log(`[worker] draft worker ready (concurrency=${config.queues.concurrency.draft})`);
});

draftWorker.on('failed', (job, error) => {
  console.error(`[worker] draft job ${job?.id ?? 'unknown'} failed`, error);
});

draftWorker.on('completed', (job) => {
  console.log(`[worker] draft job ${job.id ?? 'unknown'} completed`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal}, closing`);
  await analysisWorker.close();
  await draftWorker.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

console.log('[worker] started');