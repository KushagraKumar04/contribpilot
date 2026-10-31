import { z } from 'zod';
import { getConfig } from '@contribpilot/config';
import { AppError, AppErrorCode, RepoRef } from '@contribpilot/shared';
import { parseRepoUrl } from '@contribpilot/github';
import { getGithubProvider } from '../../github';
import { mapGithubError } from '../../github-errors';
import { getRedis } from '../../redis';
import { checkRateLimit } from '../../rate-limit';
import { publicProcedure, router, toTrpcError } from '../init';

export const repoRouter = router({
  parse: publicProcedure
    .input(z.object({ input: z.string().min(1).max(400) }))
    .mutation(({ input }) => {
      try {
        return parseRepoUrl(input.input);
      } catch (error) {
        toTrpcError(error);
      }
    }),

  preview: publicProcedure.input(RepoRef).query(async ({ ctx, input }) => {
    const config = getConfig();
    const limitKey = ctx.session?.user?.id
      ? `preview:user:${ctx.session.user.id}`
      : `preview:ip:${ctx.ip ?? 'unknown'}`;

    const rate = await checkRateLimit(
      limitKey,
      config.limits.analysesPerHour.user,
      3600
    );

    if (!rate.allowed) {
      throw new AppError(AppErrorCode.RATE_LIMITED, 'Too many requests. Try again later.', {
        resetSeconds: rate.resetSeconds
      });
    }

    const cacheKey = `repo:${input.owner}/${input.name}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    try {
      const meta = await getGithubProvider().getRepo(input);
      await redis.set(
        cacheKey,
        JSON.stringify(meta),
        'EX',
        config.cache.ttl.repoMetaSeconds
      );
      return meta;
    } catch (error) {
      throw mapGithubError(error);
    }
  })
});