interface EvidenceShape {
  kind?: string;
  path?: string;
  url?: string;
  snippet?: string;
  startLine?: number;
  endLine?: number;
}

interface Props {
  items: EvidenceShape[];
}

function lineRange(item: EvidenceShape): string | null {
  if (item.startLine === undefined) return null;
  if (item.endLine === undefined || item.endLine === item.startLine) {
    return `line ${item.startLine}`;
  }
  return `lines ${item.startLine}-${item.endLine}`;
}

export function EvidenceSnippet({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence recorded.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item, index) => {
        const range = lineRange(item);
        return (
          <li key={index} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              {item.path ? (
                <p className="font-mono text-xs text-foreground">
                  {item.path}
                  {range ? <span className="text-subtle-foreground"> {range}</span> : null}
                </p>
              ) : null}
              {item.kind ? (
                <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-subtle-foreground">
                  {item.kind}
                </span>
              ) : null}
            </div>

            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 block break-all text-sm text-foreground underline underline-offset-4"
              >
                {item.url}
              </a>
            ) : null}

            {item.snippet ? (
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
                {item.snippet}
              </pre>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}