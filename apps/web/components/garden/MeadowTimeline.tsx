'use client';

import React from 'react';

import type { MeadowMonth } from '@/lib/garden/meadow-layout';
import { cn } from '@/lib/utils';

type Props = {
  months: MeadowMonth[];
  activeIndex: number;
  onJump: (index: number) => void;
};

/** Dotted month timeline along the bottom — active month carries a golden dot. */
export function MeadowTimeline({ months, activeIndex, onJump }: Props) {
  if (months.length < 2) return null;

  return (
    <nav
      data-scene-ui
      aria-label="Jump to month"
      className="absolute bottom-[calc(1.25rem+var(--safe-bottom))] left-1/2 z-30 flex max-w-[92vw] -translate-x-1/2 items-end gap-0.5 overflow-x-auto rounded-full bg-black/25 px-3 py-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {months.map((m, i) => {
        const active = i === activeIndex;
        const showYear = i === 0 || m.key.endsWith('-01');
        return (
          <button
            key={m.key}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onJump(i)}
            className="flex shrink-0 flex-col items-center gap-1 px-1.5 py-0.5"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                active ? 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]' : 'bg-white/35'
              )}
            />
            <span
              className={cn(
                'whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.06em] transition-colors',
                active ? 'text-amber-200' : 'text-white/55'
              )}
            >
              {showYear ? m.labelCompact : m.labelMonth}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
