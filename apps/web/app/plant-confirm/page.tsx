'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Button } from '@/components/ui/button';
import { getMood } from '@/lib/constants/moods';
import { plantEntry } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { clearWriteDraft } from '@/lib/db/repositories/settings';
import { buildPlantSceneSnapshot } from '@/lib/scene/plantSnapshot';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { resolveMood } from '@/lib/sentiment/infer';
import { buildFlowerGenome } from '@bloom/core/flowers/genome';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

export default function PlantConfirmPage() {
  const router = useRouter();
  const scene = useSceneContext();
  const pending = useBloomStore((s) => s.pendingPlant);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setEntries = useBloomStore((s) => s.setEntries);
  const resetDraft = useBloomStore((s) => s.resetDraft);
  const setHighlightEntryId = useBloomStore((s) => s.setHighlightEntryId);
  const meta = useBloomStore((s) => s.gardenMeta);
  const [planting, setPlanting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

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
    if (celebrating) return;
    if (!pending || !previewEntry) {
      router.replace('/write');
    }
  }, [pending, previewEntry, router, celebrating]);

  if ((!pending || !previewEntry) && !celebrating) {
    return null;
  }

  // `previewEntry` is null once `pending` is cleared during the celebration phase (just
  // before navigation unmounts this page); guard so we render the overlay alone.
  const moodLabel = previewEntry ? getMood(previewEntry.mood)?.label ?? previewEntry.mood : null;
  const genome = previewEntry ? buildFlowerGenome({ ...previewEntry, mood: previewEntry.mood! }) : null;

  const confirmPlant = async () => {
    if (planting || !pending) return;
    setPlanting(true);
    try {
      const bounds = {
        width: typeof window !== 'undefined' ? window.innerWidth : 390,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
      };
      const entry = await plantEntry(pending, bounds, buildPlantSceneSnapshot(scene));
      await clearWriteDraft();

      const { listEntries } = await import('@/lib/db/repositories/entries');
      const entries = await listEntries();
      const gardenMeta = await getOrCreateGardenMeta();

      setEntries(entries);
      setGardenMeta(gardenMeta);
      resetDraft();

      toast.success('Planted in your garden');
      setHighlightEntryId(entry.id);
      setCelebrating(true);

      const isFirstPlant = !meta?.hasPlantedFirst;
      setTimeout(() => {
        setPendingPlant(null);
        router.replace(isFirstPlant ? `/garden?bloom=${entry.id}` : '/garden');
      }, 1500);
    } catch {
      toast.error('Could not plant your entry');
      setPlanting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {celebrating && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cream/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute h-64 w-64 rounded-full bg-sage/30 blur-3xl"
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
              className="z-10 flex flex-col items-center"
            >
              <div className="mb-6 h-16 w-16 rounded-full bg-gradient-to-tr from-sage to-sage-dark shadow-[0_0_30px_rgba(143,168,138,0.6)] animate-pulse" />
              <p className="font-display text-2xl font-semibold text-ink">
                Planting…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {previewEntry && (
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-7 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Ready to plant this?</h1>

      <div className="flex items-center justify-center py-4">
        <FlowerSvg entry={previewEntry} size={220} animateBloom genomeOverride={genome ?? undefined} />
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
      )}
    </>
  );
}
