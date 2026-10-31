import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Session } from 'next-auth';
import { isAppError } from '@contribpilot/shared';

export interface TrpcContext {
  session: Session | null;
  ip: string | null;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause: unknown = error.cause;
    if (isAppError(cause)) {
      return {
        ...shape,
        data: {
          ...shape.data,
          appCode: cause.code,
          appDetails: cause.details ?? null
        }
      };
    }
    return shape;
  }
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

const CODE_MAP = {
  INVALID_REPO: 'BAD_REQUEST',
  REPO_NOT_FOUND: 'NOT_FOUND',
  REPO_PRIVATE: 'FORBIDDEN',
  RATE_LIMITED: 'TOO_MANY_REQUESTS',
  AI_BUDGET_EXCEEDED: 'TOO_MANY_REQUESTS',
  AI_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AI_INVALID_OUTPUT: 'INTERNAL_SERVER_ERROR',
  PATCH_INVALID: 'BAD_REQUEST',
  POLICY_BLOCKED: 'BAD_REQUEST',
  GITHUB_PERMISSION: 'FORBIDDEN',
  INTERNAL: 'INTERNAL_SERVER_ERROR'
} as const;

export function toTrpcError(error: unknown): never {
  if (isAppError(error)) {
    throw new TRPCError({
      code: CODE_MAP[error.code] ?? 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error
    });
  }
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
}