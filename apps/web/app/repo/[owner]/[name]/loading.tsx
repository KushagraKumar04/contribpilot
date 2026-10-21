import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-muted" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded-sm bg-muted" />
          <div className="mt-5 h-4 w-full animate-pulse rounded-sm bg-muted" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded-sm bg-muted" />

          <div className="mt-8 flex gap-4">
            <div className="h-5 w-32 animate-pulse rounded-sm bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded-sm bg-muted" />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="h-3 w-20 animate-pulse rounded-sm bg-muted" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded-sm bg-muted" />
              </div>
            ))}
          </dl>

          <section className="mt-10 rounded-md border border-border p-6">
            <div className="h-5 w-56 animate-pulse rounded-sm bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-sm bg-muted" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="mt-5 h-11 w-40 animate-pulse rounded-md bg-muted" />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}