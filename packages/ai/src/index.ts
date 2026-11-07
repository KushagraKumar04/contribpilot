export type { JsonCallArgs, LLMProvider, ReasoningEffort, TaskName } from './types';
export { GroqProvider } from './groq';
export { aiInvalidOutput, aiUnavailable, aiBudgetExceeded } from './errors';
export { estimateTokens, assertBudget, recordUsage } from './budget';
export { acquireSlot, type LimiterDecision } from './limiter';
export { cacheKeyFor, readCache, writeCache } from './cache';
export * from './prompts';
export * from './tasks';
import { getConfig } from '@contribpilot/config';
import { GroqProvider } from './groq';
import { aiUnavailable } from './errors';

let cachedProvider: GroqProvider | undefined;

export function getGroqProvider(): GroqProvider {
  if (!cachedProvider) {
    const config = getConfig();
    const apiKey = config.secrets.groqApiKey;
    if (!apiKey) {
      throw aiUnavailable('GROQ_API_KEY is not configured');
    }
    cachedProvider = new GroqProvider(apiKey);
  }
  return cachedProvider;
}