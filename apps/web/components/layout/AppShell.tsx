'use client';

import { usePathname } from 'next/navigation';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { BloomProvider } from '@/components/BloomProvider';
import { AppNav } from '@/components/nav/AppNav';
import { PwaLifecycle } from '@/components/pwa/PwaLifecycle';
import { ReleaseNotesDialog } from '@/components/release-notes/ReleaseNotesDialog';
import { SyncBadge } from '@/components/sync/SyncBadge';
import { Toaster } from '@/components/ui/sonner';
import { QuickWrite } from '@/components/write/QuickWrite';
import { cn } from '@/lib/utils';

const FULL_WIDTH_PREFIXES = ['/garden', '/plant-confirm', '/preview', '/welcome'];
// Compose routes (`/write`, `/revisit`) hide the floating nav for a focused
// editor — they render their own pinned "Plant it" bar at the bottom instead.
const HIDE_NAV_PREFIXES = ['/plant-confirm', '/preview', '/welcome', '/write', '/revisit'];

function isFullWidthRoute(pathname: string): boolean {
  return FULL_WIDTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function shouldHideNav(pathname: string): boolean {
  return HIDE_NAV_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullWidth = isFullWidthRoute(pathname);
  const hideNav = shouldHideNav(pathname);

  return (
    <AuthProvider>
      <BloomProvider>
      <main
        className={cn(
          'flex w-full flex-1 flex-col',
          fullWidth
            ? 'max-w-none overflow-hidden p-0'
            : 'mx-auto max-w-lg px-4 pt-6 pb-[calc(7rem+var(--safe-bottom))]'
        )}
      >
        {children}
      </main>
      {!hideNav ? <SyncBadge /> : null}
      {!hideNav ? <AppNav /> : null}
      {!hideNav ? <QuickWrite /> : null}
      <PwaLifecycle />
      <Toaster />
      {!hideNav ? <ReleaseNotesDialog /> : null}
      </BloomProvider>
    </AuthProvider>
  );
}
