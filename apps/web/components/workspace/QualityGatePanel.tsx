'use client';

interface Check {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

interface Props {
  checks: Check[];
  passed: boolean;
}

function statusColor(status: Check['status']): string {
  if (status === 'pass') return 'text-foreground';
  if (status === 'warn') return 'text-muted-foreground';
  return 'text-danger';
}

function statusLabel(status: Check['status']): string {
  if (status === 'pass') return 'pass';
  if (status === 'warn') return 'warn';
  return 'fail';
}

export function QualityGatePanel({ checks, passed }: Props) {
  return (
    <section className="rounded-md border border-border">
      <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Quality gate</h2>
        <span
          className={`font-mono text-xs ${passed ? 'text-foreground' : 'text-danger'}`}
        >
          {passed ? 'passed' : 'blocked'}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {checks.map((check) => (
          <li key={check.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
            <span className={`font-mono text-xs ${statusColor(check.status)}`}>
              {statusLabel(check.status)}
            </span>
            <span className="text-muted-foreground">{check.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}