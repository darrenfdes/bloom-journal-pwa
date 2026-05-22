'use client';

import { motion } from 'framer-motion';
import React, { useMemo } from 'react';

import { Flower } from '@/components/flower/Flower';
import { buildFlowerGenome } from '@bloom/core/flowers/genome';
import type { EntryRecord, FlowerGenome } from '@bloom/core';

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

  return (
    <motion.div
      className="relative flex items-end justify-center"
      style={{ width: size, height: size, opacity: 1 - genome.fadeFactor }}
      initial={animateBloom ? { scale: 0.12 } : { scale: favScale }}
      animate={
        animateSway
          ? {
              scale: favScale,
              rotate: [genome.stemLean * 0.1, genome.stemLean * 0.1 + 1.2, genome.stemLean * 0.1 - 1.2],
            }
          : { scale: favScale, rotate: genome.stemLean * 0.1 }
      }
      transition={
        animateBloom
          ? { scale: { duration: 0.8, type: 'spring', bounce: 0.35 } }
          : animateSway
            ? { rotate: { duration: 2.8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }
            : undefined
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
    </motion.div>
  );
}
