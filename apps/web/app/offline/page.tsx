import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-sage-dark">
          Offline
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Your garden is still here
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Bloom Journal keeps your writing on this device. Some live sky,
          weather, and sync details will refresh when you are back online.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href="/garden">Open garden</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/write">Write offline</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/settings">Settings</Link>
        </Button>
      </div>
    </div>
  );
}
