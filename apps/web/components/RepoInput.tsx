'use client';

import { ArrowRightIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function normalise(input: string): { owner: string; name: string } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: 'Paste a GitHub repository URL' };
  }
  if (trimmed.length > 300) {
    return { error: 'Repository URL is too long' };
  }
  if (!/^[\x00-\x7F]+$/.test(trimmed)) {
    return { error: 'Repository URL must use ASCII characters' };
  }

  let pathname: string;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return { error: 'That does not look like a valid URL' };
    }
    if (url.username || url.password) {
      return { error: 'Credentials are not allowed in the URL' };
    }
    const host = url.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') {
      return { error: 'Only github.com repositories are supported' };
    }
    pathname = url.pathname;
  } else if (/^[A-Za-z0-9-]+\.[A-Za-z0-9.-]+(?:\/|$)/.test(trimmed)) {
    return { error: 'Only github.com repositories are supported' };
  } else if (/[:@]/.test(trimmed)) {
    return { error: 'Use owner/repo form or paste the full URL' };
  } else {
    pathname = `/${trimmed}`;
  }

  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    return { error: 'Include the owner and the repository name' };
  }

  const owner = segments[0] ?? '';
  const rawRepo = segments[1] ?? '';
  const name = rawRepo.endsWith('.git') ? rawRepo.slice(0, -4) : rawRepo;

  if (!OWNER_PATTERN.test(owner)) {
    return { error: 'Invalid owner name' };
  }
  if (!REPO_PATTERN.test(name)) {
    return { error: 'Invalid repository name' };
  }

  return { owner, name };
}

export function RepoInput() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const prefetch = useCallback(
    (raw: string) => {
      const parsed = normalise(raw);
      if ('error' in parsed) return;
      router.prefetch(
        `/repo/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`
      );
    },
    [router]
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = normalise(value);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setPending(true);
    router.push(
      `/repo/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="repo-url">
          GitHub repository URL
        </label>
        <input
          id="repo-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/owner/repo"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          onBlur={() => {
            if (value.length > 0) prefetch(value);
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'repo-url-error' : undefined}
          className="h-11 flex-1 rounded-md border border-border bg-background px-3 font-mono text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? 'Opening repository' : 'Analyze repository'}
          <ArrowRightIcon aria-hidden="true" />
        </button>
      </div>
      {error ? (
        <p id="repo-url-error" role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}