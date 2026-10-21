'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { TrpcProvider } from '@/lib/trpc/provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TrpcProvider>{children}</TrpcProvider>
    </ThemeProvider>
  );
}