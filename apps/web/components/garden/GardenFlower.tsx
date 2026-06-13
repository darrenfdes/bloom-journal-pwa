'use client';

import { motion, useReducedMotion } from 'framer-motion';
import React, { memo } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import {
  FLOWER_HIT_ELLIPSE_CY_RATIO,
  FLOWER_HIT_ELLIPSE_RX_RATIO,
  FLOWER_HIT_ELLIPSE_RY_RATIO,
  flowerPlotSize,
} from '@bloom/core/garden/hit-test';
import { isAnniversaryBlossom } from '@bloom/core/garden/anniversary';
import { computePumpkinStage, resolvePumpkinTrigger } from '@bloom/core/flowers/genome';
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
  zBoost?: number;
  index: number;
  totalEntries: number;
  daysSince: number | null;
  isHighlighted: boolean;
  animateSway: boolean;
  onGardenTap: (clientX: number, clientY: number) => void;
};

function GardenFlowerInner({
  entry,
  position,
  worldOffsetX = 0,
  zBoost = 0,
  index,
  totalEntries,
  daysSince,
  isHighlighted,
  animateSway,
  onGardenTap,
}: Props) {
  const scene = useSceneContextOptional();
  const reducedMotion = useReducedMotion();
  const { flowerSize, width: visualWidth, height: visualHeight } = flowerPlotSize(entry);
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
  const baseScale = position.scale;
  const baseRotate = position.rotation;
  const isRipePumpkin =
    resolvePumpkinTrigger({
      mood: entry.mood ?? 'peaceful',
      content: entry.content,
      flowerSeed: entry.flowerSeed,
      id: entry.id,
    }) && computePumpkinStage(entry.createdAt) === 2;

  return (
    <motion.div
      className="garden-flower absolute"
      style={{
        left: position.x - worldOffsetX - visualWidth / 2,
        top: position.y - visualHeight,
        width: visualWidth,
        height: visualHeight,
        zIndex: isHighlighted ? 9999 : position.z + zBoost,
        transformOrigin: '50% 100%',
      }}
      initial={
        reducedMotion
          ? false
          : { opacity: 0, scale: baseScale * 0.55, rotate: baseRotate }
      }
      animate={{
        opacity: 1,
        scale: isHighlighted ? baseScale * 1.08 : baseScale,
        rotate: baseRotate,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 22,
        delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.4),
      }}
    >
      <button
        type="button"
        data-garden-interactive
        onClick={(e) => onGardenTap(e.clientX, e.clientY)}
        title={entry.title ?? 'Memory'}
        aria-label={entry.title ?? 'Memory'}
        className="absolute inset-0 z-20 border-0 bg-transparent p-0"
        style={{
          clipPath: `ellipse(${FLOWER_HIT_ELLIPSE_RX_RATIO * 100}% ${FLOWER_HIT_ELLIPSE_RY_RATIO * 100}% at 50% ${FLOWER_HIT_ELLIPSE_CY_RATIO * 100}%)`,
        }}
      />
      <motion.div
        className={cn(
          'pointer-events-none relative z-10 overflow-visible',
          isHighlighted && 'rounded-full ring-4 ring-sage/60'
        )}
        style={{
          filter: filters || undefined,
          transform: rainDroop && !isRipePumpkin ? 'rotate(15deg)' : undefined,
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
              left: (visualWidth - flowerSize * 0.9) / 2,
              bottom: 0,
            }}
          />
        ) : null}
        <FlowerSvg
          entry={entry}
          size={flowerSize}
          animateSway={animateSway && !isRipePumpkin}
          animateBloom={isHighlighted}
          daysSinceLastEntry={daysSince}
          entryIndex={index}
          totalEntries={totalEntries}
          swayAmplitude={swayAmplitude}
          showFavouriteHalo={false}
        />
      </motion.div>
      {isAnniversaryBlossom(entry.createdAt) ? (
        <span className="pointer-events-none mt-0.5 text-[9px] italic text-ink-muted">
          ✦ anniversary
        </span>
      ) : null}
    </motion.div>
  );
}

export const GardenFlower = memo(GardenFlowerInner);
