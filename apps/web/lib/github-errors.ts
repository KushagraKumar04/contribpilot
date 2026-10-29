import { AppError, AppErrorCode } from '@contribpilot/shared';

interface GithubLikeError {
  status: number;
  response?: {
    headers?: Record<string, string | number | undefined>;
  };
}

function isGithubLikeError(value: unknown): value is GithubLikeError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { status?: unknown };
  return typeof candidate.status === 'number';
}

export function mapGithubError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isGithubLikeError(error)) {
    const status = error.status;
    const remaining = error.response?.headers?.['x-ratelimit-remaining'];

    if (status === 404) {
      return new AppError(AppErrorCode.REPO_NOT_FOUND, 'Repository was not found on GitHub');
    }

    if (status === 429) {
      return new AppError(
        AppErrorCode.RATE_LIMITED,
        'GitHub rate limit reached. Try again in a few minutes.'
      );
    }

    if (status === 403) {
      if (remaining === '0' || remaining === 0) {
        return new AppError(
          AppErrorCode.RATE_LIMITED,
          'GitHub rate limit reached. Try again in a few minutes.'
        );
      }
      return new AppError(
        AppErrorCode.GITHUB_PERMISSION,
        'GitHub denied access to this repository'
      );
    }

    if (status === 451) {
      return new AppError(AppErrorCode.REPO_PRIVATE, 'Repository is unavailable');
    }
  }

  return new AppError(AppErrorCode.INTERNAL, 'Could not load repository from GitHub');
}