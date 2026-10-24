import Link from 'next/link';

interface Props {
  id: string;
  type: string;
  title: string;
  summary: string;
  effort: string;
  beginner: boolean;
  score: number;
  duplicateRisk: number;
  inProgress: unknown;
}

function firstInProgress(value: unknown): { prNumber: number; url: string } | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as { prNumber?: unknown; url?: unknown };
  if (typeof first?.prNumber === 'number' && typeof first?.url === 'string') {
    return { prNumber: first.prNumber, url: first.url };
  }
  return null;
}

export function OpportunityCard(props: Props) {
  const inProgress = firstInProgress(props.inProgress);
  const highDup = props.duplicateRisk >= 0.5;

  return (
    <li className="py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-medium">
          <Link
            href={`/opportunity/${props.id}`}
            className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
          >
            {props.title}
          </Link>
        </h3>
        <span className="shrink-0 font-mono text-xs text-subtle-foreground">
          {Math.round(props.score)}
        </span>
      </div>

      {inProgress ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
          In progress by{' '}
          <a
            href={inProgress.url}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-4"
          >
            PR #{inProgress.prNumber}
          </a>
        </p>
      ) : null}

      {highDup && !inProgress ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
          Possible duplicate work, review carefully
        </p>
      ) : null}

      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {props.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-subtle-foreground">
        <span className="font-mono">{props.type}</span>
        <span>effort {props.effort}</span>
        {props.beginner ? <span>beginner friendly</span> : null}
      </div>
    </li>
  );
}