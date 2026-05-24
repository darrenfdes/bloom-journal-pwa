'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { memo } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { isAnniversaryBlossom } from '@bloom/core/garden/anniversary';
import {
  getFlowerNightFilter,
  getFlowerSeasonFilter,
  getWindSwayDegrees,
  isRainCategory,
  shouldHideFlowersForWinter,
} from '@bloom/core';
import type { EntryRecord } from '@bloom/core';
import { useSceneContextOptional } from '@/lib/scene/SceneContext';
import { cn } from '@/lib/utils';

type Position = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
};

type Props = {
  entry: EntryRecord;
  position: Position;
  /** World X of the virtual column container (0 when placed on the world root). */
  worldOffsetX?: number;
  index: number;
  totalEntries: number;
  daysSince: number | null;
  isHighlighted: boolean;
  animateSway: boolean;
  monthKey: string;
  onOpenAction: (entry: EntryRecord, monthKey: string) => void;
};

function flowerSizeForEntry(entry: EntryRecord): number {
  if (entry.isFavourited) return 156;
  if (isAnniversaryBlossom(entry.createdAt)) return 148;
  return 140;
}

function GardenFlowerInner({
  entry,
  position,
  worldOffsetX = 0,
  index,
  totalEntries,
  daysSince,
  isHighlighted,
  animateSway,
  monthKey,
  onOpenAction,
}: Props) {
  const scene = useSceneContextOptional();
  const flowerSize = flowerSizeForEntry(entry);
  const windSpeed = scene?.weather?.windSpeed ?? 0;
  const swayAmplitude = getWindSwayDegrees(windSpeed);
  const season = scene?.season ?? 'spring';
  const timePhase = scene?.timePhase ?? 'day';
  const weatherCategory = scene?.weather?.category;
  const seasonFilter = getFlowerSeasonFilter(season);
  const nightFilter = getFlowerNightFilter(timePhase);
  const hideBloom = shouldHideFlowersForWinter(season);
  const rainDroop = weatherCategory && isRainCategory(weatherCategory);
  const filters = [seasonFilter, nightFilter, rainDroop ? 'brightness(0.85)' : null]
    .filter(Boolean)
    .join(' ');
  const favHalo = entry.isFavourited ? 14 : 0;
  const plotWidth = flowerSize + favHalo * 2;
  const plotHeight = flowerSize * 1.15 + favHalo;
  const baseScale = position.scale;
  const baseRotate = position.rotation;

  return (
    <motion.button
      type="button"
      data-garden-interactive
      className="garden-flower absolute flex flex-col items-center justify-end border-0 bg-transparent p-0"
      style={{
        left: position.x - worldOffsetX - plotWidth / 2,
        top: position.y - plotHeight,
        width: plotWidth,
        height: plotHeight,
        zIndex: isHighlighted ? 9999 : position.z,
      }}
      animate={{
        scale: isHighlighted ? baseScale * 1.08 : baseScale,
        rotate: baseRotate,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={() => onOpenAction(entry, monthKey)}
      title={entry.title ?? 'Memory'}
    >
      <motion.div
        className={cn('relative overflow-visible', isHighlighted && 'rounded-full ring-4 ring-sage/60')}
        style={{
          filter: filters || undefined,
          transform: rainDroop ? 'rotate(15deg)' : undefined,
          opacity: hideBloom ? 0 : undefined,
        }}
        animate={
          isHighlighted
            ? {
                boxShadow: '0 0 28px rgba(143,168,138,0.7)',
              }
            : { boxShadow: '0 0 0px rgba(143,168,138,0)' }
        }
        transition={{ duration: 0.35 }}
      >
        {entry.isFavourited ? (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-amber-200/50 bg-amber-100/15 shadow-[0_0_22px_rgba(245,215,110,0.45)]"
            style={{
              width: flowerSize * 0.9,
              height: flowerSize * 0.9,
              left: (plotWidth - flowerSize * 0.9) / 2,
              bottom: 0,
            }}
          />
        ) : null}
        <FlowerSvg
          entry={entry}
          size={flowerSize}
          animateSway={animateSway}
          animateBloom={isHighlighted}
          daysSinceLastEntry={daysSince}
          entryIndex={index}
          totalEntries={totalEntries}
          swayAmplitude={swayAmplitude}
          showFavouriteHalo={false}
        />
      </motion.div>
      {isAnniversaryBlossom(entry.createdAt) ? (
        <span className="mt-0.5 text-[9px] italic text-ink-muted">✦ anniversary</span>
      ) : null}
    </motion.button>
  );
}

export const GardenFlower = memo(GardenFlowerInner);
