import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { resetConfigForTests } from '@contribpilot/config';

vi.mock('./cache', () => ({
  readCache: vi.fn().mockResolvedValue(null),
  writeCache: vi.fn().mockResolvedValue(undefined),
  cacheKeyFor: vi.fn().mockReturnValue('test-cache-key')
}));

vi.mock('./limiter', () => ({
  acquireSlot: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
}));

vi.mock('./budget', () => ({
  assertBudget: vi.fn().mockResolvedValue(undefined),
  estimateTokens: vi.fn().mockReturnValue(10),
  recordUsage: vi.fn().mockResolvedValue(undefined)
}));

import { GroqProvider } from './groq';

const SampleOutput = z.object({ answer: z.string() });

interface FakeClient {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
}

function injectClient(provider: GroqProvider, create: ReturnType<typeof vi.fn>): void {
  (provider as unknown as { client: FakeClient }).client = {
    chat: { completions: { create } }
  };
}

beforeEach(() => {
  resetConfigForTests();
  process.env.DATABASE_URL = 'postgres://placeholder';
  process.env.REDIS_URL = 'redis://placeholder';
  process.env.GROQ_API_KEY = 'test';
  process.env.GROQ_MODEL_CODE = 'llama-3.3-70b-versatile';
  vi.clearAllMocks();
});

describe('GroqProvider.json', () => {
  it('parses valid JSON on the first try', async () => {
    const provider = new GroqProvider('test');
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: '{"answer":"ok"}' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 }
    });
    injectClient(provider, create);

    const result = await provider.json({
      task: 'classify_issue',
      system: 'sys',
      user: 'usr',
      schema: SampleOutput,
      promptVersion: 'v1',
      userId: 'user-1',
      model: 'llama-3.3-70b-versatile'
    });
    expect(result.answer).toBe('ok');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries once on invalid JSON then succeeds', async () => {
    const provider = new GroqProvider('test');
    const create = vi
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: 'not json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"answer":"fixed"}' } }] });
    injectClient(provider, create);

    const result = await provider.json({
      task: 'classify_issue',
      system: 'sys',
      user: 'usr',
      schema: SampleOutput,
      promptVersion: 'v1',
      userId: 'user-1',
      model: 'llama-3.3-70b-versatile'
    });
    expect(result.answer).toBe('fixed');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('throws AI_INVALID_OUTPUT when retry also fails', async () => {
    const provider = new GroqProvider('test');
    const create = vi
      .fn()
      .mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });
    injectClient(provider, create);

    await expect(
      provider.json({
        task: 'classify_issue',
        system: 'sys',
        user: 'usr',
        schema: SampleOutput,
        promptVersion: 'v1',
        userId: 'user-1',
        model: 'llama-3.3-70b-versatile'
      })
    ).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  });
});