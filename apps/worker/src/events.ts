import IORedis from 'ioredis';
import { getConfig } from '@contribpilot/config';
import type { SseEvent } from '@contribpilot/shared';

let publisher: IORedis | undefined;

function getPublisher(): IORedis {
  if (!publisher) {
    publisher = new IORedis(getConfig().secrets.redisUrl, {
      enableReadyCheck: false
    });
    publisher.on('error', () => {});
  }
  return publisher;
}

export function analysisChannel(analysisId: string): string {
  return `analysis:${analysisId}:events`;
}

export function draftChannel(draftId: string): string {
  return `draft:${draftId}:events`;
}

export function draftLogKey(draftId: string): string {
  return `draft:${draftId}:log`;
}

export function draftSeqKey(draftId: string): string {
  return `draft:${draftId}:seq`;
}

export function analysisLogKey(analysisId: string): string {
  return `analysis:${analysisId}:log`;
}

export function analysisSeqKey(analysisId: string): string {
  return `analysis:${analysisId}:seq`;
}

export async function publishDraftEvent(
  draftId: string,
  event: unknown
): Promise<void> {
  const config = getConfig();
  const publisher = getPublisher();
  const seq = await publisher.incr(draftSeqKey(draftId));
  const payload = JSON.stringify({ seq, event });
  await publisher
    .multi()
    .rpush(draftLogKey(draftId), payload)
    .expire(draftLogKey(draftId), config.sse.eventRetentionSeconds)
    .expire(draftSeqKey(draftId), config.sse.eventRetentionSeconds)
    .publish(draftChannel(draftId), payload)
    .exec();
}

export async function publishAnalysisEvent(
  analysisId: string,
  event: SseEvent
): Promise<void> {
  const config = getConfig();
  const publisher = getPublisher();

  const seq = await publisher.incr(analysisSeqKey(analysisId));
  const payload = JSON.stringify({ seq, event });

  await publisher
    .multi()
    .rpush(analysisLogKey(analysisId), payload)
    .expire(analysisLogKey(analysisId), config.sse.eventRetentionSeconds)
    .expire(analysisSeqKey(analysisId), config.sse.eventRetentionSeconds)
    .publish(analysisChannel(analysisId), payload)
    .exec();
}