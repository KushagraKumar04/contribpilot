import IORedis from 'ioredis';
import { getConfig } from '@contribpilot/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const config = getConfig();
  const channel = `analysis:${id}:events`;
  const logKey = `analysis:${id}:log`;

  const reader = new IORedis(config.secrets.redisUrl, {
    enableReadyCheck: false,
    maxRetriesPerRequest: 3
  });
  const subscriber = new IORedis(config.secrets.redisUrl, {
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  });
  reader.on('error', () => {});
  subscriber.on('error', () => {});

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  function send(text: string): void {
    if (closed) return;
    writer.write(encoder.encode(text)).catch(() => {});
  }

  async function cleanup(): Promise<void> {
    if (closed) return;
    closed = true;
    if (keepAlive) clearInterval(keepAlive);
    await subscriber.unsubscribe(channel).catch(() => {});
    await subscriber.quit().catch(() => {});
    await reader.quit().catch(() => {});
    await writer.close().catch(() => {});
  }

  subscriber.on('message', (_channel, message) => {
    try {
      const parsed = JSON.parse(message) as { seq: number };
      send(`id: ${parsed.seq}\ndata: ${message}\n\n`);
    } catch {
      /* ignore malformed */
    }
  });

  void (async () => {
    try {
      const history = await reader.lrange(logKey, 0, -1);
      for (const entry of history) {
        try {
          const parsed = JSON.parse(entry) as { seq: number };
          send(`id: ${parsed.seq}\ndata: ${entry}\n\n`);
        } catch {
          /* skip bad entry */
        }
      }
      await subscriber.subscribe(channel);
      keepAlive = setInterval(() => send(': keep-alive\n\n'), config.sse.keepAliveMs);
    } catch {
      await cleanup();
    }
  })();

  request.signal.addEventListener('abort', () => {
    void cleanup();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}