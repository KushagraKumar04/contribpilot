import { getConfig } from '@contribpilot/config';
import { Octokit } from 'octokit';

export type GithubClient = Octokit;

export interface CreateClientOptions {
  token?: string;
}

interface RateLimitOptions {
  method: string;
  url: string;
}

type RateLimitHandler = (
  retryAfter: number,
  options: RateLimitOptions,
  octokit: GithubClient,
  retryCount: number
) => boolean;

const handleRateLimit: RateLimitHandler = (retryAfter, options, octokit, retryCount) => {
  octokit.log.warn(
    `Rate limit hit on ${options.method} ${options.url}, retry after ${retryAfter}s`
  );
  return retryCount < 2;
};

const handleSecondaryRateLimit: RateLimitHandler = (
  retryAfter,
  options,
  octokit,
  retryCount
) => {
  octokit.log.warn(
    `Secondary rate limit on ${options.method} ${options.url}, retry after ${retryAfter}s`
  );
  return retryCount < 2;
};

export function createGithubClient(options: CreateClientOptions = {}): GithubClient {
  const config = getConfig();
  const auth = options.token ?? config.github.readToken;

  return new Octokit({
    auth,
    userAgent: config.github.userAgent ?? config.app.name,
    baseUrl: config.github.apiBaseUrl,
    request: {
      retries: 3,
      retryAfter: 1,
      headers: {
        accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': config.github.apiVersion
      }
    },
    throttle: {
      onRateLimit: handleRateLimit,
      onSecondaryRateLimit: handleSecondaryRateLimit
    }
  });
}