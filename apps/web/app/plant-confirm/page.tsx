'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Button } from '@/components/ui/button';
import { MOODS } from '@/lib/constants/moods';
import { plantEntry } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { clearWriteDraft } from '@/lib/db/repositories/settings';
import { resolveMood } from '@/lib/sentiment/infer';
import { buildFlowerGenome } from '@bloom/core/flowers/genome';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

export default function PlantConfirmPage() {
  const router = useRouter();
  const pending = useBloomStore((s) => s.pendingPlant);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setEntries = useBloomStore((s) => s.setEntries);
  const resetDraft = useBloomStore((s) => s.resetDraft);
  const setHighlightEntryId = useBloomStore((s) => s.setHighlightEntryId);
  const meta = useBloomStore((s) => s.gardenMeta);
  const [planting, setPlanting] = useState(false);

  const previewEntry: EntryRecord | null = useMemo(() => {
    if (!pending) return null;
    const { mood, inferredSentiment } = resolveMood(pending.mood, pending.content);
    const now = new Date().toISOString();
    return {
      id: 'preview',
      userId: 'local',
      title: pending.title.trim() || null,
      content: pending.content,
      mood,
      inferredSentiment,
      tags: pending.tags,
      createdAt: pending.createdAtOverride ?? now,
      updatedAt: now,
      flowerSeed: 42,
      flowerStyle: '{}',
      gardenPosition: null,
      isFavourited: false,
      revisitOf: pending.revisitOf,
      isDeleted: false,
    };
  }, [pending]);

  useEffect(() => {
    if (!pending || !previewEntry) {
      router.replace('/write');
    }
  }, [pending, previewEntry, router]);

  if (!pending || !previewEntry) {
    return null;
  }

  const moodLabel = MOODS.find((m) => m.id === previewEntry.mood)?.label ?? previewEntry.mood;
  const genome = buildFlowerGenome({ ...previewEntry, mood: previewEntry.mood! });

  const confirmPlant = async () => {
    if (planting) return;
    setPlanting(true);
    try {
      const bounds = {
        width: typeof window !== 'undefined' ? window.innerWidth : 390,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
      };
      const entry = await plantEntry(pending, bounds);
      await clearWriteDraft();

      const { listEntries } = await import('@/lib/db/repositories/entries');
      const entries = await listEntries();
      const gardenMeta = await getOrCreateGardenMeta();

      setEntries(entries);
      setGardenMeta(gardenMeta);
      setPendingPlant(null);
      resetDraft();

      toast.success('Planted in your garden');
      setHighlightEntryId(entry.id);

      if (!meta?.hasPlantedFirst) {
        router.replace(`/garden?bloom=${entry.id}`);
      } else {
        router.replace('/garden');
      }
    } catch {
      toast.error('Could not plant your entry');
      setPlanting(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 px-7 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">Ready to plant this?</h1>

      <div className="flex items-center justify-center py-4">
        <FlowerSvg entry={previewEntry} size={220} animateBloom genomeOverride={genome} />
      </div>

      <p className="text-sm text-ink-soft">
        {new Date(previewEntry.createdAt).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </p>
      <p className="text-sm font-semibold uppercase tracking-wide text-sage">{moodLabel}</p>

      <p className="text-sm italic text-ink-muted">
        Every entry grows a flower — no two alike.
      </p>

      <div className="flex w-full flex-col gap-3">
        <Button size="lg" disabled={planting} onClick={() => void confirmPlant()}>
          {planting ? 'Planting…' : 'Plant this memory'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Keep editing
        </Button>
      </div>
    </div>
  );
}
