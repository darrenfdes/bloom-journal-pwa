import type { Metadata } from 'next';
import { Cormorant_Garamond, Nunito } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';

import { AppShell } from '@/components/layout/AppShell';

import './globals.css';

const display = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const body = Nunito({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Bloom Journal',
  description: 'A mood-aware journal where each entry grows a flower in your garden.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full min-h-dvh`}>
      <body className="flex min-h-dvh flex-col bg-cream text-ink antialiased">
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
