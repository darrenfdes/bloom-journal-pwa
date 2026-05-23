'use client';

import { usePathname } from 'next/navigation';

import { BloomProvider } from '@/components/BloomProvider';
import { AppNav } from '@/components/nav/AppNav';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const IMMERSIVE_PREFIXES = ['/garden', '/plant-confirm'];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  return (
    <BloomProvider>
      <main
        className={cn(
          'flex w-full flex-1 flex-col',
          immersive
            ? 'max-w-none overflow-hidden p-0'
            : 'mx-auto max-w-lg px-4 py-6'
        )}
      >
        {children}
      </main>
      {!immersive ? <AppNav /> : null}
      <Toaster />
    </BloomProvider>
  );
}
