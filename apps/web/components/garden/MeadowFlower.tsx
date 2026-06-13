'use client';

import React, { memo } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import {
  getFlowerNightFilter,
  getFlowerSeasonFilter,
  getWindSwayDegrees,
} from '@bloom/core';
import type { SceneState } from '@bloom/core/scene';
import type { PlacedMeadowFlower } from '@/lib/garden/meadow-layout';
import { cn } from '@/lib/utils';

type Props = {
  placed: PlacedMeadowFlower;
  scene: SceneState;
  index: number;
  totalEntries: number;
  daysSince: number | null;
  animateSway: boolean;
  highlighted: boolean;
};

/**
 * One flower in the world layer. The wrapper carries `data-flower-id` and is
 * pointer-interactive so the scene-level tap handler (in GardenScene) can resolve
 * a tap to its entry — there is deliberately no per-flower click handler, which
 * would otherwise fire on drag-release (the reference's `closest('.flower')`).
 */
function MeadowFlowerInner({
  placed,
  scene,
  index,
  totalEntries,
  daysSince,
  animateSway,
  highlighted,
}: Props) {
  const { entry, x, baseY, scale, zIndex, deep, flowerSize } = placed;
  const size = flowerSize * scale;
  const seasonFilter = getFlowerSeasonFilter(scene.season);
  const nightFilter = getFlowerNightFilter(scene.timePhase);
  const filter = [seasonFilter, nightFilter].filter(Boolean).join(' ') || undefined;
  const swayAmplitude = getWindSwayDegrees(scene.weather?.windSpeed ?? 0) * (deep ? 1.4 : 1);

  return (
    <div
      data-flower-id={entry.id}
      className={cn(
        'meadow-flower pointer-events-auto absolute cursor-pointer',
        highlighted && 'rounded-full ring-4 ring-sage/60'
      )}
      style={{
        left: x - size / 2,
        top: baseY - size,
        width: size,
        height: size,
        zIndex: highlighted ? 9999 : zIndex,
        transformOrigin: '50% 100%',
        filter,
      }}
    >
      <FlowerSvg
        entry={entry}
        size={size}
        animateSway={animateSway}
        animateBloom={highlighted}
        daysSinceLastEntry={daysSince}
        entryIndex={index}
        totalEntries={totalEntries}
        swayAmplitude={swayAmplitude}
      />
    </div>
  );
}

export const MeadowFlower = memo(MeadowFlowerInner);
