import type { Effort } from '@contribpilot/shared';
import type { LLMProvider } from '../types';
import { SYSTEM_PREAMBLE } from '../prompts/system';
import { ClassifyIssueOutput } from '../prompts/schemas';

const PROMPT_VERSION = 'classify_issue_v1';

export interface ClassifyIssueInput {
  repoFullName: string;
  issueNumber: number;
  title: string;
  body: string;
  labels: string[];
}

export interface ClassifyIssueResult {
  actionable: boolean;
  effort: Effort;
  beginnerFriendly: boolean;
  reasoning: string;
  suggestedPlan: string[];
}

export async function classifyIssue(
  provider: LLMProvider,
  userId: string,
  input: ClassifyIssueInput
): Promise<ClassifyIssueResult> {
  const user = `Task: classify an open issue for a potential contributor.

<repo_data>
Repository: ${input.repoFullName}
Issue number: ${input.issueNumber}
Title: ${input.title}
Labels: ${input.labels.join(', ') || 'none'}
Body:
${input.body.slice(0, 4000)}
</repo_data>

Decide:
- actionable: true only if the issue has a clear, small scope and no maintainer objection visible in the text.
- effort: XS, S, M or L.
- beginnerFriendly: true only if the scope is well-defined and does not require deep architectural knowledge.
- reasoning: one short paragraph.
- suggestedPlan: 3 to 6 short, concrete steps.

Return JSON only.`;

  const result = await provider.json({
    task: 'classify_issue',
    system: SYSTEM_PREAMBLE,
    user,
    schema: ClassifyIssueOutput,
    promptVersion: PROMPT_VERSION,
    userId,
    cacheKey: `classify:${input.repoFullName}:${input.issueNumber}:${input.title}`,
    maxTokens: 2500,
    temperature: 0,
    reasoningEffort: 'low'
  });

  return result;
}