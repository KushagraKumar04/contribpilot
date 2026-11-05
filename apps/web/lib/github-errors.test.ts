import { describe, expect, it } from 'vitest';
import { AppError, AppErrorCode } from '@contribpilot/shared';
import { mapGithubError } from './github-errors';

function makeGithubError(
  status: number,
  headers: Record<string, string | number> = {}
): unknown {
  return { status, response: { headers } };
}

describe('mapGithubError', () => {
  it('passes AppError through unchanged', () => {
    const original = new AppError(AppErrorCode.INVALID_REPO, 'bad');
    expect(mapGithubError(original)).toBe(original);
  });

  it('maps unknown errors to INTERNAL', () => {
    expect(mapGithubError(new Error('random')).code).toBe(AppErrorCode.INTERNAL);
    expect(mapGithubError(null).code).toBe(AppErrorCode.INTERNAL);
    expect(mapGithubError('string').code).toBe(AppErrorCode.INTERNAL);
  });

  it('maps 404 to REPO_NOT_FOUND', () => {
    expect(mapGithubError(makeGithubError(404)).code).toBe(AppErrorCode.REPO_NOT_FOUND);
  });

  it('maps 403 with exhausted limit to RATE_LIMITED', () => {
    const mapped = mapGithubError(makeGithubError(403, { 'x-ratelimit-remaining': '0' }));
    expect(mapped.code).toBe(AppErrorCode.RATE_LIMITED);
  });

  it('maps 403 with numeric zero remaining to RATE_LIMITED', () => {
    const mapped = mapGithubError(makeGithubError(403, { 'x-ratelimit-remaining': 0 }));
    expect(mapped.code).toBe(AppErrorCode.RATE_LIMITED);
  });

  it('maps 403 with remaining quota to GITHUB_PERMISSION', () => {
    const mapped = mapGithubError(makeGithubError(403, { 'x-ratelimit-remaining': '42' }));
    expect(mapped.code).toBe(AppErrorCode.GITHUB_PERMISSION);
  });

  it('maps 429 to RATE_LIMITED', () => {
    expect(mapGithubError(makeGithubError(429)).code).toBe(AppErrorCode.RATE_LIMITED);
  });

  it('maps 451 to REPO_PRIVATE', () => {
    expect(mapGithubError(makeGithubError(451)).code).toBe(AppErrorCode.REPO_PRIVATE);
  });
});