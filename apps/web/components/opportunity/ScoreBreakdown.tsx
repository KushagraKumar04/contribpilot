'use client';

interface Props {
  breakdown: Record<string, number>;
  defaultOpen?: boolean;
}

const LABELS: Record<string, string> = {
  acceptance: 'Acceptance likelihood',
  impact: 'Impact',
  ease: 'Ease',
  freshness: 'Freshness',
  confidence: 'Confidence',
  tolerance: 'Maintainer tolerance',
  beginner: 'Beginner bonus'
};

export function ScoreBreakdown({ breakdown, defaultOpen = false }: Props) {
  const entries = Object.entries(breakdown).filter(([, value]) => typeof value === 'number');
  if (entries.length === 0) return null;

  return (
    <details className="mt-3" open={defaultOpen}>
      <summary className="cursor-pointer text-xs uppercase tracking-wider text-subtle-foreground">
        Why this ranks here
      </summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt>{LABELS[key] ?? key}</dt>
            <dd className="font-mono">{value.toFixed(3)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}