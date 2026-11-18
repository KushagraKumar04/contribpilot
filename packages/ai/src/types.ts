import type { z } from 'zod';

export type TaskName =
  | 'classify_issue'
  | 'enrich_finding'
  | 'extract_rules'
  | 'draft_patch'
  | 'refine_patch'
  | 'write_pr_text'
  | 'draft_issue_claim_comment'
  | 'review_reply';

export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface JsonCallArgs<T> {
  task: TaskName;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  promptVersion: string;
  userId: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  reasoningEffort?: ReasoningEffort;
}

export interface LLMProvider {
  listModels(): Promise<string[]>;
  json<T>(args: JsonCallArgs<T>): Promise<T>;
}