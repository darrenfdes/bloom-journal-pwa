'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useBloomStore } from '@/stores/useBloomStore';

export default function HomePage() {
  const router = useRouter();
  const ready = useBloomStore((s) => s.ready);
  const meta = useBloomStore((s) => s.gardenMeta);

  useEffect(() => {
    if (!ready) return;
    if (!meta?.hasPlantedFirst) {
      router.replace('/write');
    } else {
      router.replace('/garden');
    }
  }, [ready, meta, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-cream">
        <p className="font-display text-lg text-ink-muted">Opening your garden…</p>
      </div>
    );
  }

  return null;
}
