'use client';

import { format, parseISO } from 'date-fns';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import type { EntryRecord } from '@bloom/core';
import { cn } from '@/lib/utils';

export interface SelectedFlower {
  id: string;
  includeText: boolean;
}

type Props = {
  entries: EntryRecord[];
  max?: number;
  onChange?: (selection: SelectedFlower[]) => void;
};

/**
 * Grid of the user's flowers. Tap a flower to gather it (capped at `max`); for each gathered flower,
 * toggle whether its words travel along. Self-manages selection and reports it via `onChange`.
 */
export function FlowerPicker({ entries, max = 5, onChange }: Props) {
  const [selected, setSelected] = useState<SelectedFlower[]>([]);

  const update = (next: SelectedFlower[]) => {
    setSelected(next);
    onChange?.(next);
  };

  const indexOf = (id: string) => selected.findIndex((s) => s.id === id);
  const atCap = selected.length >= max;

  const toggleSelect = (id: string) => {
    const i = indexOf(id);
    if (i >= 0) {
      update(selected.filter((s) => s.id !== id));
    } else if (!atCap) {
      update([...selected, { id, includeText: false }]);
    }
  };

  const toggleText = (id: string) => {
    update(selected.map((s) => (s.id === id ? { ...s, includeText: !s.includeText } : s)));
  };

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {entries.map((entry) => {
        const i = indexOf(entry.id);
        const isSelected = i >= 0;
        const includeText = selected[i]?.includeText ?? false;
        const planted = format(parseISO(entry.createdAt), 'MMM d');

        return (
          <li key={entry.id} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => toggleSelect(entry.id)}
              disabled={!isSelected && atCap}
              aria-pressed={isSelected}
              aria-label={`Select memory from ${planted}`}
              className={cn(
                'relative flex aspect-square w-full items-end justify-center rounded-xl border bg-cream p-1 transition-colors',
                isSelected ? 'border-sage ring-2 ring-sage' : 'border-parchment hover:bg-parchment',
                !isSelected && atCap && 'cursor-not-allowed opacity-40',
              )}
            >
              <FlowerSvg entry={entry} size={64} />
              {isSelected ? (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sage text-cream">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
            </button>

            <span className="text-[11px] text-ink-muted">{planted}</span>

            {isSelected ? (
              <button
                type="button"
                onClick={() => toggleText(entry.id)}
                aria-pressed={includeText}
                aria-label="Include the words"
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                  includeText
                    ? 'border-sage bg-sage text-cream'
                    : 'border-parchment text-ink-soft hover:bg-parchment',
                )}
              >
                {includeText ? 'Words included' : 'Include words'}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
