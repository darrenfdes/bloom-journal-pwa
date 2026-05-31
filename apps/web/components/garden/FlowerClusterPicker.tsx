'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import React from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Badge } from '@/components/ui/badge';
import { getMood } from '@/lib/constants/moods';
import { MoodIcon } from '@/lib/mood-icons';
import type { PlacedFlower } from '@bloom/core/garden/layout';
import type { EntryRecord } from '@bloom/core';

type Props = {
  candidates: PlacedFlower[];
  onSelect: (entry: EntryRecord, monthKey: string) => void;
  onClose: () => void;
};

export function FlowerClusterPicker({ candidates, onSelect, onClose }: Props) {
  const open = candidates.length > 1;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="cluster-picker-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/45"
            onClick={onClose}
            aria-label="Close memory picker"
          />

          <motion.div
            key="cluster-picker-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a memory"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-[32px] border-t border-white/40 bg-cream/95 p-6 pb-[calc(2rem+var(--safe-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl"
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

            <div className="mt-4">
              <h2 className="text-center font-display text-2xl font-bold text-ink">
                Which memory?
              </h2>
              <p className="mt-1 text-center text-sm text-ink-muted">
                Several blooms overlap here — pick the one you meant.
              </p>

              <ul className="mt-5 max-h-[min(50vh,320px)] space-y-2 overflow-y-auto">
                {candidates.map(({ entry, monthKey }) => {
                  const mood = getMood(entry.mood);
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-2xl border border-parchment/80 bg-white/60 px-3 py-3 text-left transition-colors hover:bg-white/90"
                        onClick={() => onSelect(entry, monthKey)}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-parchment bg-gradient-to-b from-white/70 to-cream">
                          <FlowerSvg entry={entry} size={44} animateSway={false} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg font-semibold text-ink">
                            {entry.title || 'Untitled Memory'}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-ink-muted">
                              {new Date(entry.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {mood ? (
                              <Badge
                                variant="outline"
                                className="gap-1 px-2 py-0 text-[10px] font-medium"
                              >
                                <MoodIcon mood={mood.id} className="size-3" />
                                {mood.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
