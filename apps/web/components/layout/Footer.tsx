import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          ContribPilot helps you make useful pull requests. You review every diff before anything is
          pushed.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <a
            href="https://github.com"
            rel="noreferrer noopener"
            target="_blank"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}