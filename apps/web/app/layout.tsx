import type { Metadata } from 'next';
import { Cormorant_Garamond, Nunito } from 'next/font/google';

import { BloomProvider } from '@/components/BloomProvider';
import { AppNav } from '@/components/nav/AppNav';
import { Toaster } from '@/components/ui/sonner';

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
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cream text-ink antialiased">
        <BloomProvider>
          <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
            {children}
          </main>
          <AppNav />
          <Toaster />
        </BloomProvider>
      </body>
    </html>
  );
}
