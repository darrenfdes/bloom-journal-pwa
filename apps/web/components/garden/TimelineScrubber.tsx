'use client';

import type { MonthCluster } from '@bloom/core/garden/layout';

type Props = {
  clusters: MonthCluster[];
  onJump: (scrollY: number) => void;
};

export function TimelineScrubber({ clusters, onJump }: Props) {
  if (clusters.length < 2) return null;

  return (
    <div className="z-10 mt-2 max-h-11 overflow-x-auto">
      <div className="flex gap-2 px-4">
        {clusters.map((c) => (
          <button
            key={c.monthKey}
            type="button"
            onClick={() => onJump(Math.max(0, c.groundY - 80))}
            className="shrink-0 rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-sm"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
