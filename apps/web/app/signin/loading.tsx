import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
          <div className="h-7 w-56 animate-pulse rounded-sm bg-muted" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-sm bg-muted" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
          <div className="mt-8 h-11 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </main>
      <Footer />
    </div>
  );
}