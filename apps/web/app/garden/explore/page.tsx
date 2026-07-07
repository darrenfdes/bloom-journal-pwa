'use client';

import { Suspense } from 'react';

import { ExploreContent } from './ExploreContent';

export default function GardenExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-1 items-center justify-center">
          <p className="text-ink-muted">Growing your meadow…</p>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
