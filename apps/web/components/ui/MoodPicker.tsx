'use client';

import { MOOD_CATEGORIES, getMood } from '@/lib/constants/moods';
import { MoodIcon } from '@/lib/mood-icons';
import type { Mood } from '@bloom/core';

type Props = {
  value: Mood[];
  onChange: (moods: Mood[]) => void;
};

/**
 * Multi-select mood picker, laid out as scannable category sections (Positive,
 * Calm, Low, Difficult) sourced from `MOOD_CATEGORIES`. `value` is selection
 * order: `value[0]` is the "primary" mood that shapes the entry's flower —
 * any further picks are supplementary feelings with no effect on the garden
 * visuals. Clicking an unselected chip adds it; clicking a selected chip
 * removes just that one, wherever it sits in the selection.
 */
export function MoodPicker({ value, onChange }: Props) {
  const primary = value[0] ?? null;
  const primaryMeta = primary ? getMood(primary) : undefined;

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
              const selected = value.includes(id);
              const isPrimary = primary === id;
              const label = isPrimary
                ? `${meta.label} — ${meta.description} (shapes your flower)`
                : `${meta.label} — ${meta.description}`;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={label}
                  onClick={() =>
                    onChange(selected ? value.filter((m) => m !== id) : [...value, id])
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all active:scale-95 hover:scale-[1.02] ${
                    selected
                      ? 'border-sage bg-sage text-cream shadow-[0_2px_12px_rgba(143,168,138,0.45)]'
                      : 'border-parchment bg-cream text-ink hover:bg-parchment/60'
                  }`}
                  title={meta.description}
                >
                  <MoodIcon mood={id} className="size-3.5" />
                  {meta.label}
                  {isPrimary && <span aria-hidden>★</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {primaryMeta && (
        <p className="text-xs text-ink-muted">
          {primaryMeta.label} shapes your flower — the rest are just for you.
        </p>
      )}
    </div>
  );
}
