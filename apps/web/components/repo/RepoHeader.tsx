import { StarIcon, GitHubLogoIcon } from '@radix-ui/react-icons';
import type { RepoMeta } from '@contribpilot/shared';

interface Props {
  meta: RepoMeta;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-subtle-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

export function RepoHeader({ meta }: Props) {
  return (
    <section>
      <p className="font-mono text-xs text-subtle-foreground">
        {meta.owner} / {meta.name}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        {meta.name}
        {meta.archived ? (
          <span className="ml-3 align-middle text-sm font-normal text-muted-foreground">
            archived
          </span>
        ) : null}
      </h1>

      {meta.description ? (
        <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
      ) : (
        <p className="mt-3 text-sm text-subtle-foreground">No description on GitHub.</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <a
          href={meta.htmlUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-4"
        >
          <GitHubLogoIcon aria-hidden="true" />
          View on GitHub
        </a>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <StarIcon aria-hidden="true" />
          {meta.stars.toLocaleString()} stars
        </span>
        {meta.topics.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {meta.topics.slice(0, 6).map((topic) => (
              <li
                key={topic}
                className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {topic}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
        <Stat label="Language" value={meta.language ?? 'Unknown'} />
        <Stat label="License" value={meta.license ?? 'None detected'} />
        <Stat label="Forks" value={meta.forks.toLocaleString()} />
        <Stat label="Open issues" value={meta.openIssues.toLocaleString()} />
        <Stat label="Default branch" value={meta.defaultBranch} />
        <Stat
          label="Last push"
          value={new Date(meta.lastPushAt).toISOString().slice(0, 10)}
        />
      </dl>
    </section>
  );
}