'use client';

import React, { useMemo } from 'react';

import { getGrassTuftParams } from '@bloom/core/garden/ground';
import { SeededRNG } from '@bloom/core/flowers/seeded-rng';
import type { GroundVariant } from '@bloom/core/types';

type Props = {
  width: number;
  height: number;
  groundY: number;
  month?: number;
  seed?: number;
  density?: number;
  groundVariant?: GroundVariant;
};

/**
 * Foreground grass tufts and tiny blossoms; density varies by ground variant.
 * Swaying micro-blades are rendered by SwayingGrassCanvas.
 */
export function GrassLayer({
  width,
  height,
  groundY,
  month = new Date().getMonth() + 1,
  seed = 1337,
  density = 24,
  groundVariant = ((month * 7 + seed) % 5) as GroundVariant,
}: Props) {
  const params = getGrassTuftParams(groundVariant);
  const effectiveDensity = Math.round(density * params.densityMul);

  const elements = useMemo(() => {
    const rng = new SeededRNG(seed);
    const tufts: { d: string; opacity: number; fill: string }[] = [];
    const blossoms: { cx: number; cy: number; r: number; fill: string }[] = [];

    const greenBase =
      groundVariant === 3
        ? ['rgba(55, 90, 48, 0.7)', 'rgba(70, 105, 58, 0.6)', 'rgba(45, 78, 40, 0.75)']
        : groundVariant === 4
          ? ['rgba(140, 125, 70, 0.6)', 'rgba(165, 145, 85, 0.55)', 'rgba(120, 108, 62, 0.65)']
          : ['rgba(95, 130, 80, 0.65)', 'rgba(125, 160, 100, 0.55)', 'rgba(75, 110, 70, 0.7)'];

    for (let i = 0; i < effectiveDensity; i++) {
      const x = rng.range(0, width);
      const baseY = groundY + rng.range(-12, height - groundY - 12);
      const h = rng.range(params.heightMin, params.heightMax);
      const w = rng.range(params.widthMin, params.widthMax);

      const shade = rng.next();
      const fill = shade < 0.33 ? greenBase[0]! : shade < 0.66 ? greenBase[1]! : greenBase[2]!;

      tufts.push({
        d: `M ${x} ${baseY + h} Q ${x - w * 0.6} ${baseY + h * 0.4} ${x} ${baseY}
            Q ${x + w * 0.6} ${baseY + h * 0.4} ${x} ${baseY + h} Z`,
        opacity: rng.range(0.6, 1),
        fill,
      });

      if (rng.next() < params.blossomChance) {
        const bx = x + rng.range(-6, 6);
        const by = baseY + rng.range(-4, 4);
        const colors =
          groundVariant === 4
            ? ['#F5D78E', '#FFF8DC', '#FADADD', '#E8C97A']
            : ['#F5C68C', '#E48BA0', '#C8B0DE', '#F0E58A', '#FFFFFF'];
        blossoms.push({
          cx: bx,
          cy: by,
          r: rng.range(1.6, 2.8),
          fill: colors[Math.floor(rng.next() * colors.length)]!,
        });
      }
    }

    return { tufts, blossoms };
  }, [effectiveDensity, groundVariant, groundY, height, params, seed, width]);

  return (
    <div
      className="pointer-events-none absolute left-0"
      style={{ width, height: height - groundY + 24, top: groundY - 24 }}
    >
      <svg width={width} height={height - groundY + 24}>
        {elements.tufts.map((t, i) => (
          <path key={`g-${i}`} d={t.d} fill={t.fill} opacity={t.opacity} />
        ))}
        {elements.blossoms.map((b, i) => (
          <path
            key={`b-${i}`}
            d={`M ${b.cx} ${b.cy - b.r} L ${b.cx + b.r} ${b.cy} L ${b.cx} ${b.cy + b.r} L ${b.cx - b.r} ${b.cy} Z`}
            fill={b.fill}
            opacity={0.85}
          />
        ))}
      </svg>
    </div>
  );
}
