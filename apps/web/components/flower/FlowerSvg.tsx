'use client';

import React, { useMemo } from 'react';

import { Flower } from '@/components/flower/Flower';
import { buildFlowerGenome } from '@bloom/core/flowers/genome';
import type { EntryRecord, FlowerGenome } from '@bloom/core';
import { cn } from '@/lib/utils';

type Props = {
  entry: EntryRecord;
  size?: number;
  animateBloom?: boolean;
  animateSway?: boolean;
  genomeOverride?: FlowerGenome;
  daysSinceLastEntry?: number | null;
  entryIndex?: number;
  totalEntries?: number;
};

export function FlowerSvg({
  entry,
  size = 96,
  animateBloom = false,
  animateSway = false,
  genomeOverride,
  daysSinceLastEntry,
  entryIndex,
  totalEntries,
}: Props) {
  const genome = useMemo(
    () =>
      genomeOverride ??
      buildFlowerGenome(
        { ...entry, mood: entry.mood ?? 'peaceful' },
        { daysSinceLastEntry: daysSinceLastEntry ?? undefined, entryIndex, totalEntries }
      ),
    [entry, genomeOverride, daysSinceLastEntry, entryIndex, totalEntries]
  );

  const wiltDroop = genome.wiltFactor * 8;
  const favScale = genome.isFavourited ? 1.06 : 1;
  const stemRotate = genome.stemLean * 0.1;

  return (
    <div
      className={cn(
        'relative flex items-end justify-center',
        animateSway && 'flower-sway',
        animateBloom && 'flower-bloom-in'
      )}
      style={
        {
          width: size,
          height: size,
          opacity: 1 - genome.fadeFactor,
          transform: animateSway || animateBloom ? undefined : `rotate(${stemRotate}deg) scale(${favScale})`,
          '--fav-scale': favScale,
          '--sway-base': `${stemRotate}deg`,
          '--sway-min': `${stemRotate - 1.2}deg`,
          '--sway-max': `${stemRotate + 1.2}deg`,
        } as React.CSSProperties
      }
    >
      {genome.isFavourited ? (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-amber-200/50 bg-amber-100/20"
          style={{
            width: size * 0.92,
            height: size * 0.92,
            top: size * 0.04,
            left: size * 0.04,
          }}
        />
      ) : null}
      <Flower
        mood={genome.bloomMood}
        seed={genome.seed}
        size={size}
        wordCount={genome.wordCount}
        wiltDroop={wiltDroop}
      />
    </div>
  );
}
