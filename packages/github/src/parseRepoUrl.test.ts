import { beforeEach, describe, expect, it } from 'vitest';
import { AppError, AppErrorCode } from '@contribpilot/shared';
import { resetConfigForTests } from '@contribpilot/config';
import { parseRepoUrl } from './parseRepoUrl';

beforeEach(() => {
  resetConfigForTests();
  process.env.DATABASE_URL = 'postgres://placeholder';
  process.env.REDIS_URL = 'redis://placeholder';
});

function expectInvalid(input: string): void {
  try {
    parseRepoUrl(input);
    throw new Error(`expected parseRepoUrl to reject: ${input}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(AppErrorCode.INVALID_REPO);
  }
}

describe('parseRepoUrl accepted forms', () => {
  it('accepts canonical https URL', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts .git suffix and strips it', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js.git')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts http scheme', () => {
    expect(parseRepoUrl('http://github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts www host', () => {
    expect(parseRepoUrl('https://www.github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts host without scheme', () => {
    expect(parseRepoUrl('github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts www host without scheme', () => {
    expect(parseRepoUrl('www.github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts bare owner/repo', () => {
    expect(parseRepoUrl('vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts bare owner/repo with .git', () => {
    expect(parseRepoUrl('vercel/next.js.git')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts /tree/<ref>', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/tree/canary')).toEqual({
      owner: 'vercel',
      name: 'next.js',
      ref: 'canary'
    });
  });

  it('accepts /tree/<ref>/<path>', () => {
    expect(
      parseRepoUrl('https://github.com/vercel/next.js/tree/canary/packages/next')
    ).toEqual({
      owner: 'vercel',
      name: 'next.js',
      ref: 'canary',
      path: 'packages/next'
    });
  });

  it('accepts /blob/<ref>/<file>', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/blob/canary/README.md')).toEqual({
      owner: 'vercel',
      name: 'next.js',
      ref: 'canary',
      path: 'README.md'
    });
  });

  it('accepts /issues/N and returns repo only', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/issues/123')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts /pull/N and returns repo only', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/pull/456')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts trailing slash', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseRepoUrl('  https://github.com/vercel/next.js  ')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts uppercase host', () => {
    expect(parseRepoUrl('https://GITHUB.COM/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('ignores query string', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js?ref=x')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('ignores fragment', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js#readme')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('decodes ref with encoded slash', () => {
    expect(
      parseRepoUrl('https://github.com/vercel/next.js/tree/feature%2Fbranch')
    ).toEqual({
      owner: 'vercel',
      name: 'next.js',
      ref: 'feature/branch'
    });
  });

  it('accepts /tree without a ref', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/tree')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts unknown deep path and returns repo only', () => {
    expect(parseRepoUrl('https://github.com/vercel/next.js/actions')).toEqual({
      owner: 'vercel',
      name: 'next.js'
    });
  });

  it('accepts single character owner and repo', () => {
    expect(parseRepoUrl('a/b')).toEqual({ owner: 'a', name: 'b' });
  });

  it('accepts owner at max length', () => {
    const owner = 'a'.repeat(39);
    expect(parseRepoUrl(`${owner}/repo`)).toEqual({ owner, name: 'repo' });
  });

  it('accepts repo with dots and dashes and underscores', () => {
    expect(parseRepoUrl('owner/my.repo-name_here')).toEqual({
      owner: 'owner',
      name: 'my.repo-name_here'
    });
  });
});

describe('parseRepoUrl rejected forms', () => {
  it('rejects empty string', () => {
    expectInvalid('');
  });

  it('rejects whitespace only', () => {
    expectInvalid('   ');
  });

  it('rejects missing repo', () => {
    expectInvalid('https://github.com/vercel');
  });

  it('rejects bare owner only', () => {
    expectInvalid('vercel');
  });

  it('rejects bare slash only', () => {
    expectInvalid('/');
  });

  it('rejects gitlab host', () => {
    expectInvalid('https://gitlab.com/owner/repo');
  });

  it('rejects bitbucket host', () => {
    expectInvalid('https://bitbucket.org/owner/repo');
  });

  it('rejects github.com subdomain spoof', () => {
    expectInvalid('https://github.com.evil.com/owner/repo');
  });

  it('rejects github.com prefix spoof', () => {
    expectInvalid('https://github.com-evil.com/owner/repo');
  });

  it('rejects wrong host with github in path', () => {
    expectInvalid('https://evil.com/github.com/owner/repo');
  });

  it('rejects credentials in URL', () => {
    expectInvalid('https://user:pass@github.com/owner/repo');
  });

  it('rejects username only in URL', () => {
    expectInvalid('https://user@github.com/owner/repo');
  });

  it('rejects owner starting with dash', () => {
    expectInvalid('https://github.com/-owner/repo');
  });

  it('rejects repo with invalid characters', () => {
    expectInvalid('https://github.com/owner/re po');
  });

  it('rejects unicode homoglyph in host', () => {
    expectInvalid('https://g\u0456thub.com/owner/repo');
  });

  it('rejects unicode owner', () => {
    expectInvalid('https://github.com/own\u00E9r/repo');
  });

  it('rejects ftp scheme', () => {
    expectInvalid('ftp://github.com/owner/repo');
  });

  it('rejects oversized input', () => {
    expectInvalid(`https://github.com/${'a'.repeat(400)}/repo`);
  });

  it('rejects owner over 39 characters', () => {
    expectInvalid(`${'a'.repeat(40)}/repo`);
  });

  it('rejects repo over 100 characters', () => {
    expectInvalid(`owner/${'a'.repeat(101)}`);
  });

  it('rejects bare owner/repo with colon', () => {
    expectInvalid('owner:repo');
  });

  it('rejects bare owner/repo with at sign', () => {
    expectInvalid('owner@repo');
  });
});