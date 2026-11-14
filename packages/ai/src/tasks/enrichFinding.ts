import type { Effort, Finding } from '@contribpilot/shared';
import type { LLMProvider } from '../types';
import { SYSTEM_PREAMBLE } from '../prompts/system';
import { EnrichFindingOutput } from '../prompts/schemas';

const PROMPT_VERSION = 'enrich_finding_v1';

export interface EnrichFindingInput {
  repoFullName: string;
  finding: Finding;
}

export interface EnrichFindingResult {
  rationale: string;
  plan: string[];
  effort: Effort;
}

export async function enrichFinding(
  provider: LLMProvider,
  userId: string,
  input: EnrichFindingInput
): Promise<EnrichFindingResult> {
  const evidenceText = input.finding.evidence
    .map((evidence) => {
      const parts: string[] = [];
      if (evidence.path) parts.push(`path=${evidence.path}`);
      if (evidence.url) parts.push(`url=${evidence.url}`);
      if (evidence.snippet) parts.push(`snippet=${evidence.snippet.slice(0, 300)}`);
      return parts.join(' ');
    })
    .join('\n');

  const user = `Task: explain a static analysis finding and provide a short action plan.

<repo_data>
Repository: ${input.repoFullName}
Analyzer: ${input.finding.analyzer}
Type: ${input.finding.type}
Title: ${input.finding.title}
Summary: ${input.finding.summary}
Evidence:
${evidenceText}
</repo_data>

Return JSON with:
- rationale: why this finding matters, one short paragraph, no marketing language.
- plan: 3 to 6 concrete steps a contributor can follow.
- effort: XS, S, M or L.

Do not invent files or APIs that are not in the evidence.`;

  const result = await provider.json({
    task: 'enrich_finding',
    system: SYSTEM_PREAMBLE,
    user,
    schema: EnrichFindingOutput,
    promptVersion: PROMPT_VERSION,
    userId,
    cacheKey: `enrich:${input.repoFullName}:${input.finding.fingerprint}`,
    maxTokens: 2500,
    temperature: 0,
    reasoningEffort: 'low'
  });

  return result;
}