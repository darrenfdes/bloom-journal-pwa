'use client';

import { MOODS } from '@/lib/constants/moods';
import type { Mood } from '@bloom/core';

type Props = {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
};

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {MOODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(value === m.id ? null : m.id)}
          className={`shrink-0 rounded-full border px-3 py-2 text-sm transition-colors ${
            value === m.id
              ? 'border-sage bg-sage text-cream'
              : 'border-parchment bg-cream text-ink hover:bg-parchment'
          }`}
          title={m.description}
        >
          {m.emoji} {m.label}
        </button>
      ))}
    </div>
  );
}
