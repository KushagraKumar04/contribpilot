import type { GuardrailResult } from './types';

export function checkAiPolicy(
  policy: 'allowed' | 'disclosure_required' | 'prohibited' | 'unknown',
  wantsAi: boolean
): GuardrailResult {
  if (policy === 'prohibited' && wantsAi) {
    return {
      id: 'GR-4',
      status: 'fail',
      message:
        'This repository prohibits AI-generated contributions. AI drafting is disabled. Use the manual guide to write the change yourself.',
      details: { policy }
    };
  }

  if (policy === 'disclosure_required' && wantsAi) {
    return {
      id: 'GR-4',
      status: 'warn',
      message: 'This repository requires AI assistance to be disclosed in the pull request.'
    };
  }

  return {
    id: 'GR-4',
    status: 'pass',
    message: 'Repository AI policy is compatible with this action'
  };
}