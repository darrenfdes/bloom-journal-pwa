'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, BookOpen, Star, Filter, RotateCcw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getMood } from '@/lib/constants/moods';
import { MoodIcon } from '@/lib/mood-icons';
import type { EntryRecord } from '@bloom/core';
import { toggleFavourite } from '@/lib/db/repositories/entries';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  entry: EntryRecord | null;
  monthKey?: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onFilterMood: (mood: string) => void;
  onFilterMonth: (year: number, month: number) => void;
};

export function FlowerActionDrawer({
  entry,
  monthKey,
  onClose,
  onNavigate,
  onFilterMood,
  onFilterMonth,
}: Props) {
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const [optimisticFav, setOptimisticFav] = useState<boolean>(false);

  useEffect(() => {
    if (entry) {
      setOptimisticFav(entry.isFavourited);
    }
  }, [entry]);

  const handleToggleFavourite = async () => {
    if (!entry) return;
    setOptimisticFav(!optimisticFav);
    await toggleFavourite(entry.id);
    await refreshEntries();
  };

  const handleFilterMonth = () => {
    if (!monthKey) return;
    const [year, month] = monthKey.split('-').map(Number);
    if (year && month) {
      onFilterMonth(year, month);
    }
  };

  const mood = entry ? getMood(entry.mood) : null;

  return (
    <AnimatePresence>
      {entry ? (
        <>
          {/* Backdrop */}
          <motion.button
            key="drawer-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/45"
            onClick={onClose}
            aria-label="Close action drawer"
          />

          {/* Drawer */}
          <motion.div
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-[32px] border-t border-white/40 bg-cream/95 p-6 pb-[calc(2rem+var(--safe-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-parchment" />

            <button
              type="button"
              className="absolute right-5 top-5 rounded-full bg-parchment/50 p-2 text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mt-4 flex flex-col items-center">
              {/* Flower Preview Frame */}
              <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full border border-parchment bg-gradient-to-b from-white/60 to-cream shadow-sm">
                <FlowerSvg entry={entry} size={100} animateSway={false} />
              </div>

              <h2 className="text-center font-display text-2xl font-bold text-ink line-clamp-1 w-full px-4">
                {entry.title || 'Untitled Memory'}
              </h2>
              
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <p className="text-sm font-medium text-ink-muted">
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <span className="text-parchment">•</span>
                {mood ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 px-2 py-0.5 text-[11px] font-medium tracking-wide"
                  >
                    <MoodIcon mood={mood.id} className="size-3" />
                    {mood.label}
                  </Badge>
                ) : null}
              </div>

              {entry.content && (
                <p className="mt-4 line-clamp-2 w-full text-center text-sm leading-relaxed text-ink-soft">
                  &quot;{entry.content}&quot;
                </p>
              )}

              <div className="mt-6 w-full space-y-3">
                <Button
                  className="w-full justify-center bg-sage text-cream hover:bg-sage-dark rounded-xl h-12 text-base font-semibold"
                  onClick={() => onNavigate(`/entry/${entry.id}`)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read full memory
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant={optimisticFav ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl h-11 ${optimisticFav ? 'bg-amber-100/50 text-amber-700 border-amber-200/50 hover:bg-amber-200/50' : 'text-ink-soft'}`}
                    onClick={() => void handleToggleFavourite()}
                  >
                    <Star className={`mr-2 h-4 w-4 ${optimisticFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {optimisticFav ? 'Favourited' : 'Favourite'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-11 text-ink-soft"
                    onClick={() => onNavigate(`/revisit/${entry.id}`)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Revisit
                  </Button>
                </div>

                <div className="flex gap-3">
                  {entry.mood && (
                    <Button
                      variant="secondary"
                      className="flex-1 rounded-xl h-11 text-xs text-ink-soft bg-parchment/30 hover:bg-parchment/60 border-none"
                      onClick={() => onFilterMood(entry.mood!)}
                    >
                      <Filter className="mr-2 h-3.5 w-3.5" />
                      Filter Mood
                    </Button>
                  )}
                  {monthKey && (
                    <Button
                      variant="secondary"
                      className="flex-1 rounded-xl h-11 text-xs text-ink-soft bg-parchment/30 hover:bg-parchment/60 border-none"
                      onClick={handleFilterMonth}
                    >
                      <Filter className="mr-2 h-3.5 w-3.5" />
                      Filter Month
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
