import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { mono, sans } from '../lib/fonts';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ContribPilot',
    template: '%s · ContribPilot'
  },
  description:
    'Analyze a public GitHub repository, find evidenced places where a pull request helps, and get a guided path to a merged contribution.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}