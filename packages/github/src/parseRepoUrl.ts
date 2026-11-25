import { getConfig } from '@contribpilot/config';
import { AppError, AppErrorCode, type RepoRef } from '@contribpilot/shared';

function invalid(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(AppErrorCode.INVALID_REPO, message, details);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHostProbe(allowedHosts: string[]): RegExp {
  const alternation = allowedHosts.map(escapeRegExp).join('|');
  return new RegExp(`^(?:https?://)?(?:${alternation})(?:/|$)`, 'i');
}

interface ParsedUrl {
  host: string;
  pathname: string;
}

function readUrl(input: string): ParsedUrl | null {
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.username || url.password) {
    throw invalid('Credentials are not allowed in the repository URL');
  }
  return { host: url.hostname.toLowerCase(), pathname: url.pathname };
}

export function parseRepoUrl(input: string): RepoRef {
  const config = getConfig();
  const { allowedHosts, maxInputLength, ownerPattern, repoPattern } = config.github;

  if (typeof input !== 'string') {
    throw invalid('Repository URL must be a string');
  }

  const trimmed = input.trim();

  if (!trimmed) {
    throw invalid('Repository URL is required');
  }

  if (trimmed.length > maxInputLength) {
    throw invalid('Repository URL is too long', { max: maxInputLength });
  }

  if (/[\u0080-\uFFFF]/.test(trimmed)) {
    throw invalid('Repository URL must contain only ASCII characters');
  }

  let pathname: string;
  const hostProbe = buildHostProbe(allowedHosts);

  if (hostProbe.test(trimmed)) {
    const parsed = readUrl(trimmed);
    if (!parsed) {
      throw invalid('Could not parse repository URL');
    }
    if (!allowedHosts.includes(parsed.host)) {
      throw invalid('Only GitHub repositories are supported', { host: parsed.host });
    }
    pathname = parsed.pathname;
  } else if (/^https?:\/\//i.test(trimmed)) {
    throw invalid('Only GitHub repositories are supported');
  } else if (/^[A-Za-z0-9-]+\.[A-Za-z0-9.-]+(?:\/|$)/.test(trimmed)) {
    throw invalid('Only GitHub repositories are supported');
  } else if (/[:@]/.test(trimmed)) {
    throw invalid('Repository URL must be in owner/repo form');
  } else {
    pathname = `/${trimmed}`;
  }

  const segments = pathname.split('/').filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    throw invalid('Repository URL must include an owner and a repository name');
  }

  const owner = segments[0] ?? '';
  const rawRepo = segments[1] ?? '';
  const name = rawRepo.endsWith('.git') ? rawRepo.slice(0, -4) : rawRepo;

  const ownerRegex = new RegExp(ownerPattern);
  const repoRegex = new RegExp(repoPattern);

  if (!ownerRegex.test(owner)) {
    throw invalid('Invalid owner name', { owner });
  }

  if (!repoRegex.test(name)) {
    throw invalid('Invalid repository name', { name });
  }

  const keyword = segments[2];
  let ref: string | undefined;
  let path: string | undefined;

  if (keyword === 'tree' || keyword === 'blob') {
    const refSegment = segments[3];
    if (refSegment) {
      try {
        ref = decodeURIComponent(refSegment);
      } catch {
        throw invalid('Invalid ref encoding in repository URL');
      }
    }
    if (segments.length > 4) {
      try {
        path = segments.slice(4).map(decodeURIComponent).join('/');
      } catch {
        throw invalid('Invalid path encoding in repository URL');
      }
    }
  }

  const result: RepoRef = { owner, name };
  if (ref !== undefined && ref.length > 0) {
    result.ref = ref;
  }
  if (path !== undefined && path.length > 0) {
    result.path = path;
  }

  return result;
}