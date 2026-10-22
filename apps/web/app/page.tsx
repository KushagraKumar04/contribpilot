import Link from 'next/link';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { RepoInput } from '../components/RepoInput';

const FINDINGS = [
  'Issues labelled good first issue or help wanted',
  'Typos and grammar in docs, comments and strings',
  'Broken links in markdown and docs',
  'Source files without matching tests',
  'Missing or outdated README sections',
  'TODOs with a clear, small scope',
  'Missing community files',
  'Outdated dependencies and known advisories'
];

const STEPS = [
  {
    n: '01',
    title: 'Paste a public GitHub repository',
    body: 'ContribPilot reads the repository, its contribution rules and its open work.'
  },
  {
    n: '02',
    title: 'Get a ranked list with evidence',
    body: 'Every opportunity points to a file and a line, or to an issue. Nothing is shown without evidence.'
  },
  {
    n: '03',
    title: 'Follow a repo specific guide',
    body: 'Branch naming, commit convention, lint and test commands. Copied from the repository itself.'
  },
  {
    n: '04',
    title: 'Review the diff, then submit',
    body: 'Draft a change with AI, edit it inline, and either copy the git commands or let ContribPilot open the pull request.'
  }
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Make your first useful pull request
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Paste a public GitHub repository. ContribPilot finds evidenced places where a pull
            request helps, ranks them, and walks you through every step to get it merged.
          </p>
          <div className="mt-8 max-w-2xl">
            <RepoInput />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:grid-cols-[280px_1fr] sm:px-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                What it looks for
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Each analyzer only reports what it can point at inside the repository.
              </p>
            </div>
            <ul className="grid gap-x-8 gap-y-3 text-base sm:grid-cols-2">
              {FINDINGS.map((item) => (
                <li key={item} className="border-b border-border pb-2.5 last:border-b-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              How it works
            </h2>
            <ol className="mt-8 grid gap-10 sm:grid-cols-2">
              {STEPS.map((step) => (
                <li key={step.n}>
                  <div className="font-mono text-xs text-subtle-foreground">{step.n}</div>
                  <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-lg font-medium">What ContribPilot does not do</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              It does not generate fake activity or inflate a contribution graph. It does not open a
              pull request without your confirmation. Every diff is shown to you before anything is
              pushed, and every suggestion points to evidence in the repository.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Read the{' '}
              <Link href="/terms" className="text-foreground underline underline-offset-4">
                Terms of Service
              </Link>{' '}
              and the{' '}
              <Link href="/privacy" className="text-foreground underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}