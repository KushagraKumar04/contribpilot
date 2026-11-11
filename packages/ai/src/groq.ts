import Groq from 'groq-sdk';
import { getConfig } from '@contribpilot/config';
import { aiInvalidOutput, aiUnavailable } from './errors';
import { readCache, writeCache, cacheKeyFor } from './cache';
import { acquireSlot } from './limiter';
import { assertBudget, estimateTokens, recordUsage } from './budget';
import type { JsonCallArgs, LLMProvider } from './types';

const MODELS_CACHE_KEY = 'ai:models:list';

interface ChatResponse {
  choices: Array<{ message: { content: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class GroqProvider implements LLMProvider {
  private readonly client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async listModels(): Promise<string[]> {
    const config = getConfig();
    const cached = await readCacheRaw(MODELS_CACHE_KEY);
    if (cached) {
      return cached;
    }
    const response = await this.client.models.list();
    const ids = response.data.map((model) => model.id).filter((id) => id.length > 0);
    await writeCacheRaw(MODELS_CACHE_KEY, ids, config.ai.modelValidation.cacheSeconds);
    return ids;
  }

  async validateConfiguredModels(): Promise<{ ok: boolean; missing: string[] }> {
    const config = getConfig();
    if (!config.ai.modelValidation.enabled) {
      return { ok: true, missing: [] };
    }
    const available = new Set(await this.listModels());
    const wanted = [
      config.ai.models.fast,
      config.ai.models.code,
      config.ai.models.fallback
    ].filter((value): value is string => Boolean(value));
    const missing = wanted.filter((model) => !available.has(model));
    return { ok: missing.length === 0, missing };
  }

  async json<T>(args: JsonCallArgs<T>): Promise<T> {
    const config = getConfig();
    const model =
      args.model ??
      config.ai.models.code ??
      config.ai.models.fast ??
      config.ai.models.fallback;
    if (!model) {
      throw aiUnavailable('No AI model is configured');
    }

    const cacheKey = args.cacheKey
      ? cacheKeyFor({
          task: args.task,
          model,
          promptVersion: args.promptVersion,
          input: args.cacheKey
        })
      : null;

    if (cacheKey) {
      const cached = await readCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const projected = estimateTokens(args.system) + estimateTokens(args.user) + (args.maxTokens ?? 800);
    await assertBudget(args.userId, projected);

    const slot = await acquireSlot('rpm');
    if (!slot.allowed) {
      throw aiUnavailable('AI rate limit reached', { retryAfterSeconds: slot.retryAfterSeconds });
    }

    const instruction = `${args.user}\n\nReturn only valid JSON that matches the required schema.`;
    const parsed = await this.callAndParse<T>({
      model,
      system: args.system,
      user: instruction,
      schema: args.schema,
      temperature: args.temperature ?? 0,
      maxTokens: args.maxTokens ?? 800,
      retryWithFeedback: true,
      reasoningEffort: args.reasoningEffort
    });

    await recordUsage(args.userId, projected);
    if (cacheKey) {
      await writeCache(cacheKey, parsed);
    }
    return parsed;
  }

  private async callAndParse<T>(args: {
    model: string;
    system: string;
    user: string;
    schema: JsonCallArgs<T>['schema'];
    temperature: number;
    maxTokens: number;
    retryWithFeedback: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high' | undefined;
  }): Promise<T> {
    let feedback = '';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const payload: Record<string, unknown> = {
        model: args.model,
        messages: [
          { role: 'system', content: args.system },
          {
            role: 'user',
            content: feedback
              ? `${args.user}\n\nYour previous output failed validation: ${feedback}\nReturn only valid JSON.`
              : args.user
          }
        ],
        temperature: args.temperature,
        max_tokens: args.maxTokens,
        response_format: { type: 'json_object' }
      };
      if (args.reasoningEffort) {
        payload.reasoning_effort = args.reasoningEffort;
      }

      const response = (await this.client.chat.completions.create(
        payload as unknown as Parameters<typeof this.client.chat.completions.create>[0]
      )) as unknown as ChatResponse;

      const content = response.choices[0]?.message.content ?? '';
      if (!content) {
        feedback = 'empty response';
        continue;
      }
      const finishReason = (response.choices[0] as { finish_reason?: string } | undefined)
        ?.finish_reason;
      if (finishReason === 'length') {
        feedback = 'response was cut off before completing the JSON';
        continue;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        feedback = 'response was not valid JSON';
        continue;
      }

      const result = args.schema.safeParse(parsedJson);
      if (!result.success) {
        feedback = result.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; ');
        continue;
      }
      return result.data;
    }
    throw aiInvalidOutput('Model returned invalid output after retry', { feedback });
  }
}

let modelsClient: Groq | undefined;

function getModelsClient(): Groq {
  if (!modelsClient) {
    const config = getConfig();
    if (!config.secrets.groqApiKey) {
      throw aiUnavailable('GROQ_API_KEY is not set');
    }
    modelsClient = new Groq({ apiKey: config.secrets.groqApiKey });
  }
  return modelsClient;
}

let cachedModelsRaw: string | undefined;

async function readCacheRaw(key: string): Promise<string[] | null> {
  if (cachedModelsRaw) {
    try {
      return JSON.parse(cachedModelsRaw) as string[];
    } catch {
      cachedModelsRaw = undefined;
    }
  }
  const client = getModelsClient();
  void client;
  const redis = (await import('ioredis')).default;
  const config = getConfig();
  const r = new redis(config.secrets.redisUrl, { enableReadyCheck: false });
  r.on('error', () => {});
  const value = await r.get(key);
  await r.quit();
  if (!value) return null;
  cachedModelsRaw = value;
  try {
    return JSON.parse(value) as string[];
  } catch {
    return null;
  }
}

async function writeCacheRaw(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const { default: Redis } = await import('ioredis');
  const config = getConfig();
  const r = new Redis(config.secrets.redisUrl, { enableReadyCheck: false });
  r.on('error', () => {});
  await r.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  await r.quit();
  cachedModelsRaw = undefined;
}