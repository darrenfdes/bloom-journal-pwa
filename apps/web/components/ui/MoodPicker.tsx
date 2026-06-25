'use client';

import { MOOD_CATEGORIES, getMood } from '@/lib/constants/moods';
import { MoodIcon } from '@/lib/mood-icons';
import type { Mood } from '@bloom/core';

type Props = {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
};

/**
 * Single-select mood picker, laid out as scannable category sections (Positive,
 * Calm, Low, Difficult) sourced from `MOOD_CATEGORIES`. Picking grows one bloom,
 * so selection stays single — clicking the active chip clears it.
 */
export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {MOOD_CATEGORIES.map((category) => (
        <div key={category.id} role="group" aria-label={category.label} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {category.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {category.moods.map((id) => {
              const meta = getMood(id);
              if (!meta) return null;
              const selected = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${meta.label} — ${meta.description}`}
                  onClick={() => onChange(selected ? null : id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all active:scale-95 hover:scale-[1.02] ${
                    selected
                      ? 'border-sage bg-sage text-cream shadow-[0_2px_12px_rgba(143,168,138,0.45)]'
                      : 'border-parchment bg-cream text-ink hover:bg-parchment/60'
                  }`}
                  title={meta.description}
                >
                  <MoodIcon mood={id} className="size-3.5" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
