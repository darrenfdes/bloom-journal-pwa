'use client';

import React, { type RefObject, useMemo } from 'react';

import {
  FAR_HILL_HEIGHT,
  HILL_TILE_WIDTH,
  NEAR_HILL_HEIGHT,
} from '@/lib/scene/garden-proportions';
import { getHillColors } from '@/lib/scene/meadow-palette';
import { createRng } from '@bloom/core';
import type { SceneState } from '@bloom/core/scene';

/** A repeating rolling-hill tile as a data-URI SVG background. */
function hillTileUrl(color: string, seed: number, height: number, amplitude: number): string {
  const width = HILL_TILE_WIDTH;
  const rng = createRng(seed);
  const p1 = rng() * Math.PI * 2;
  const p2 = rng() * Math.PI * 2;
  const a1 = amplitude;
  const a2 = amplitude * 0.45;
  const yAt = (x: number) =>
    height * 0.45 -
    a1 * Math.sin((x / width) * Math.PI * 2 + p1) -
    a2 * Math.sin((x / width) * Math.PI * 4 + p2);

  let d = `M0,${height} L0,${yAt(0).toFixed(1)}`;
  for (let x = 30; x <= width; x += 30) d += ` L${x},${yAt(x).toFixed(1)}`;
  d += ` L${width},${height} Z`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${d}" fill="${color}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

type Props = {
  scene: SceneState;
  groundY: number;
  farHillsRef: RefObject<HTMLDivElement | null>;
  nearHillsRef: RefObject<HTMLDivElement | null>;
};

export function MeadowHills({ scene, groundY, farHillsRef, nearHillsRef }: Props) {
  const { far, near } = getHillColors(scene.season, scene.timePhase);

  const farImage = useMemo(() => hillTileUrl(far, 7, FAR_HILL_HEIGHT, 22), [far]);
  const nearImage = useMemo(() => hillTileUrl(near, 31, NEAR_HILL_HEIGHT, 18), [near]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      <div
        ref={farHillsRef}
        className="absolute left-0 right-0"
        style={{
          top: groundY - FAR_HILL_HEIGHT,
          height: FAR_HILL_HEIGHT,
          backgroundImage: farImage,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `${HILL_TILE_WIDTH}px ${FAR_HILL_HEIGHT}px`,
        }}
      />
      <div
        ref={nearHillsRef}
        className="absolute left-0 right-0"
        style={{
          top: groundY - NEAR_HILL_HEIGHT,
          height: NEAR_HILL_HEIGHT,
          backgroundImage: nearImage,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `${HILL_TILE_WIDTH}px ${NEAR_HILL_HEIGHT}px`,
        }}
      />
    </div>
  );
}
