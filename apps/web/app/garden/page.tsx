'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { useBloomStore } from '@/stores/useBloomStore';

const BloomMeadow = dynamic(
  () => import('@/components/garden/bloom/BloomMeadow').then((m) => m.BloomMeadow),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading garden…</p>
      </div>
    ),
  }
);

function GardenContent() {
  const router = useRouter();
  const ready = useBloomStore((s) => s.ready);
  const meta = useBloomStore((s) => s.gardenMeta);
  const entries = useBloomStore((s) => s.entries);

  useEffect(() => {
    if (!ready || !meta) return;
    if (!meta.hasPlantedFirst) {
      router.replace('/write');
    }
  }, [ready, meta, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading garden…</p>
      </div>
    );
  }

  if (!meta?.hasPlantedFirst) {
    return null;
  }

  return <BloomMeadow entries={entries} />;
}

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
