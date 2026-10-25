import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import type { RepoMeta } from '@contribpilot/shared';

interface Props {
  meta: RepoMeta;
  inactiveMonthsWarning: number;
}

interface Warning {
  key: string;
  text: string;
}

function monthsSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60 * 24 * 30.44);
}

export function RepoWarnings({ meta, inactiveMonthsWarning }: Props) {
  const warnings: Warning[] = [];

  if (meta.archived) {
    warnings.push({
      key: 'archived',
      text: 'This repository is archived. It will not accept new contributions.'
    });
  }

  if (!meta.license) {
    warnings.push({
      key: 'license',
      text: 'No license was detected. Contributors and users have no clear legal terms.'
    });
  }

  const inactiveMonths = monthsSince(meta.lastPushAt);
  if (inactiveMonths > inactiveMonthsWarning) {
    warnings.push({
      key: 'inactive',
      text: `Last push was about ${Math.round(inactiveMonths)} months ago. Maintainer response may be slow.`
    });
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="warnings-heading"
      className="rounded-md border border-border bg-muted/40 p-4"
    >
      <h2 id="warnings-heading" className="text-sm font-medium">
        Before you contribute
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {warnings.map((warning) => (
          <li key={warning.key} className="flex gap-2">
            <ExclamationTriangleIcon aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{warning.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle-foreground">
        Read the{' '}
        <Link
          href={`${meta.htmlUrl}/blob/${meta.defaultBranch}/CONTRIBUTING.md`}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-4"
        >
          contribution guidelines
        </Link>{' '}
        when they exist.
      </p>
    </section>
  );
}