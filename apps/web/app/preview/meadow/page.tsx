'use client';

/**
 * Standalone Bloom Meadow playground — mounts the real `BloomMeadow` with the reference's
 * sample dataset so the scene (and its live phase + rain toggles) can be exercised without
 * IndexedDB/auth. The live `/garden` is unaffected. See the future-pass note in the plan.
 */
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { buildSampleEntries } from '@/lib/garden/bloom/sample-entries';

const BloomMeadow = dynamic(
  () => import('@/components/garden/bloom/BloomMeadow').then((m) => m.BloomMeadow),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading meadow…</p>
      </div>
    ),
  }
);

export default function MeadowPreviewPage() {
  const entries = useMemo(() => buildSampleEntries(), []);
  return <BloomMeadow entries={entries} preview creatures />;
}
