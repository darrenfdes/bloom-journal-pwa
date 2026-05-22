'use client';

import { useRouter } from 'next/navigation';

import { GardenScene } from '@/components/garden/GardenScene';
import { Button } from '@/components/ui/button';
import { useBloomStore } from '@/stores/useBloomStore';

export default function GardenPage() {
  const router = useRouter();
  const ready = useBloomStore((s) => s.ready);
  const meta = useBloomStore((s) => s.gardenMeta);
  const entries = useBloomStore((s) => s.entries);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading garden…</p>
      </div>
    );
  }

  if (!meta?.hasPlantedFirst) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Your garden awaits</h1>
        <p className="max-w-sm text-sm text-ink-muted">
          Plant your first memory to see flowers bloom here.
        </p>
        <Button onClick={() => router.push('/write')}>Start writing</Button>
      </div>
    );
  }

  return <GardenScene meta={meta} entries={entries} />;
}
