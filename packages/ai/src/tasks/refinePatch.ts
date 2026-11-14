import type { LLMProvider } from '../types';
import { SYSTEM_PREAMBLE } from '../prompts/system';
import { DraftPatchOutput } from '../prompts/schemas';
import type { DraftPatchFileContext, DraftPatchResult } from './draftPatch';

const PROMPT_VERSION = 'refine_patch_v2';

export interface RefinePatchInput {
  repoFullName: string;
  priorDraft: DraftPatchResult;
  userInstruction: string;
  validatorErrors: string[];
  files: DraftPatchFileContext[];
  styleNotes: string[];
}

function renderPriorFiles(draft: DraftPatchResult): string {
  return draft.files
    .map(
      (file) =>
        `FILE ${file.path} (${file.action})\n"""\n${file.newContent.slice(0, 5000)}\n"""`
    )
    .join('\n\n');
}

export async function refinePatch(
  provider: LLMProvider,
  userId: string,
  input: RefinePatchInput
): Promise<DraftPatchResult> {
  const errors =
    input.validatorErrors.length > 0
      ? input.validatorErrors.map((error) => `- ${error}`).join('\n')
      : '(none)';

  const styleText =
    input.styleNotes.length > 0
      ? input.styleNotes.map((note) => `- ${note}`).join('\n')
      : '(no style notes)';

  const user = `Task: revise an existing patch draft based on user feedback and validator errors.

<repo_data>
Repository: ${input.repoFullName}

Prior draft summary: ${input.priorDraft.summary}
Prior rationale: ${input.priorDraft.rationale}

Prior file contents after the change:
${renderPriorFiles(input.priorDraft)}

Current repository file contents (before any change):
${input.files
  .map((file) => `FILE ${file.path}\n"""\n${file.content.slice(0, 5000)}\n"""`)
  .join('\n\n')}

Style notes:
${styleText}
</repo_data>

User instruction:
${input.userInstruction}

Validator errors to fix:
${errors}

Return JSON with these keys:
- summary: one short sentence describing the change.
- rationale: one short paragraph explaining why the change helps.
- files: array of { "path", "action", "newContent" }. newContent is the complete new content of the file.
- testsAdded: boolean.
- risks: short array.
- commitMessage, prTitle, prBody.

Rules:
- Return the complete new content for each file. Do NOT return a diff.
- Fix every validator error listed above.
- Follow the user instruction exactly.
- Preserve unrelated content.
- Return only JSON matching the schema.`;

  const result = await provider.json({
    task: 'refine_patch',
    system: SYSTEM_PREAMBLE,
    user,
    schema: DraftPatchOutput,
    promptVersion: PROMPT_VERSION,
    userId,
    maxTokens: 6000,
    temperature: 0.1,
    reasoningEffort: 'low'
  });

  return result;
}