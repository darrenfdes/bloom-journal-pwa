'use client';

import React from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
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
    <Sheet open={open} onClose={onClose} ariaLabel="Choose a memory">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-ink">Which memory?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Several blooms overlap here — pick the one you meant.
        </p>
      </div>

      <ul className="mt-5 space-y-2">
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
    </Sheet>
  );
}
