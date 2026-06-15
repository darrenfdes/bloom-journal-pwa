'use client';

import { Suspense } from 'react';

import { GardenContent } from './GardenContent';

export default function GardenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-1 items-center justify-center">
          <p className="text-ink-muted">Loading garden…</p>
        </div>
      }
    >
      <GardenContent />
    </Suspense>
  );
}
