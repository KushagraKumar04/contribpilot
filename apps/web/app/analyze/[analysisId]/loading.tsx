import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="h-8 w-72 animate-pulse rounded-sm bg-muted" />
          <div className="mt-3 h-3 w-64 animate-pulse rounded-sm bg-muted" />
          <div className="mt-10 h-4 w-40 animate-pulse rounded-sm bg-muted" />
          <div className="mt-3 h-1.5 w-full animate-pulse rounded-sm bg-muted" />
          <div className="mt-10 space-y-4">
            <div className="h-4 w-full animate-pulse rounded-sm bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}