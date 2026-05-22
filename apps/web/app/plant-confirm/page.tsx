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
      await plantEntry(pending, bounds);
      await clearWriteDraft();

      const { listEntries } = await import('@/lib/db/repositories/entries');
      const entries = await listEntries();
      const gardenMeta = await getOrCreateGardenMeta();

      setEntries(entries);
      setGardenMeta(gardenMeta);
      setPendingPlant(null);
      resetDraft();

      toast.success('Planted in your garden');
      if (!meta?.hasPlantedFirst) {
        router.replace('/garden');
      } else {
        router.replace('/garden');
      }
    } catch {
      toast.error('Could not plant your entry');
      setPlanting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-8 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Ready to plant this?</h1>

      <div className="flex items-center justify-center py-4">
        <FlowerSvg entry={previewEntry} size={220} animateBloom genomeOverride={genome} />
      </div>

      <p className="text-sm text-ink-muted">
        {new Date(previewEntry.createdAt).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </p>
      <p className="text-sm font-medium text-ink-soft">{moodLabel}</p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" disabled={planting} onClick={() => void confirmPlant()}>
          {planting ? 'Planting…' : 'Plant in garden'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Keep editing
        </Button>
      </div>
    </div>
  );
}
