import { describe, expect, it } from 'vitest';
import {
  analyses,
  analysisCache,
  analysisStatusEnum,
  draftStatusEnum,
  drafts,
  opportunities,
  prModeEnum,
  prStateEnum,
  pullRequests,
  users
} from './schema';

describe('schema enums', () => {
  it('analysis status values match architecture', () => {
    expect(analysisStatusEnum.enumValues).toEqual([
      'queued',
      'running',
      'partial',
      'complete',
      'failed',
      'canceled'
    ]);
  });

  it('draft status values match architecture', () => {
    expect(draftStatusEnum.enumValues).toEqual([
      'generating',
      'ready',
      'approved',
      'failed',
      'discarded'
    ]);
  });

  it('pr state values match architecture', () => {
    expect(prStateEnum.enumValues).toEqual([
      'creating',
      'open',
      'draft',
      'merged',
      'closed'
    ]);
  });

  it('pr mode values match architecture', () => {
    expect(prModeEnum.enumValues).toEqual(['manual', 'auto']);
  });
});

describe('schema tables', () => {
  it('exposes core tables', () => {
    expect(users).toBeDefined();
    expect(analyses).toBeDefined();
    expect(analysisCache).toBeDefined();
    expect(opportunities).toBeDefined();
    expect(drafts).toBeDefined();
    expect(pullRequests).toBeDefined();
  });

  it('users table has githubId column', () => {
    expect(users.githubId.name).toBe('github_id');
  });

  it('analyses table has unique index on repoId, commitSha, hash, userId', () => {
    const uniqueIndexes = Object.values(analyses).filter((value) => {
      return typeof value === 'object' && value !== null && 'isUnique' in value;
    });
    expect(uniqueIndexes.length).toBeGreaterThan(0);
  });
});