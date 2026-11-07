import { describe, expect, it } from 'vitest';
import { AppError, AppErrorCode } from '@contribpilot/shared';
import { toTrpcError } from './init';
import { TRPCError } from '@trpc/server';

function capture(fn: () => never): TRPCError {
  try {
    fn();
  } catch (error) {
    return error as TRPCError;
  }
  throw new Error('expected throw');
}

describe('toTrpcError', () => {
  it('maps INVALID_REPO to BAD_REQUEST', () => {
    const err = capture(() => toTrpcError(new AppError(AppErrorCode.INVALID_REPO, 'bad')));
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('maps REPO_NOT_FOUND to NOT_FOUND', () => {
    const err = capture(() => toTrpcError(new AppError(AppErrorCode.REPO_NOT_FOUND, 'nope')));
    expect(err.code).toBe('NOT_FOUND');
  });

  it('maps RATE_LIMITED to TOO_MANY_REQUESTS', () => {
    const err = capture(() => toTrpcError(new AppError(AppErrorCode.RATE_LIMITED, 'slow')));
    expect(err.code).toBe('TOO_MANY_REQUESTS');
  });

  it('maps GITHUB_PERMISSION to FORBIDDEN', () => {
    const err = capture(() => toTrpcError(new AppError(AppErrorCode.GITHUB_PERMISSION, 'denied')));
    expect(err.code).toBe('FORBIDDEN');
  });

  it('maps unknown errors to INTERNAL_SERVER_ERROR', () => {
    const err = capture(() => toTrpcError(new Error('boom')));
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
  });
});