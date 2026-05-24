'use client';

import { MOODS } from '@/lib/constants/moods';
import type { Mood } from '@bloom/core';

type Props = {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
};

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div 
      className="relative w-full"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)'
      }}
    >
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(value === m.id ? null : m.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all active:scale-95 hover:scale-[1.02] ${
              value === m.id
                ? 'border-sage bg-sage text-cream shadow-[0_2px_12px_rgba(143,168,138,0.45)]'
                : 'border-parchment bg-cream text-ink hover:bg-parchment/60'
            }`}
            title={m.description}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
