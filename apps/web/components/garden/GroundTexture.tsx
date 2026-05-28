'use client';

import React, { useMemo } from 'react';

import { SeededRNG } from '@bloom/core/flowers/seeded-rng';
import type { GroundVariant } from '@bloom/core/types';

type Props = {
  width: number;
  height: number;
  groundY: number;
  variant: GroundVariant;
  seed?: number;
};

/**
 * Subtle ground texture overlay (blade strokes / wildflower specks) per meadow variant.
 */
export function GroundTexture({ width, height, groundY, variant, seed = 42 }: Props) {
  const elements = useMemo(() => {
    const rng = new SeededRNG(seed + variant * 17);
    const blades: { d: string; opacity: number; fill: string }[] = [];
    const specks: { cx: number; cy: number; r: number; fill: string }[] = [];

    const bladeCount =
      variant === 1 ? 28 : variant === 3 ? 22 : variant === 4 ? 18 : 16;

    for (let i = 0; i < bladeCount; i++) {
      const x = rng.range(0, width);
      const baseY = groundY + rng.range(0, Math.min(80, height - groundY));
      const h = rng.range(4, variant === 1 ? 14 : 10);
      const lean = rng.range(-4, 4);
      const fill =
        variant === 3
          ? 'rgba(45, 75, 38, 0.35)'
          : variant === 4
            ? 'rgba(120, 100, 45, 0.3)'
            : 'rgba(90, 130, 65, 0.28)';

      blades.push({
        d: `M ${x} ${baseY + h} Q ${x + lean} ${baseY + h * 0.4} ${x + lean * 0.5} ${baseY}`,
        opacity: rng.range(0.4, 0.75),
        fill,
      });
    }

    // Stipple dots for all variants — sparser for muted grounds
    const speckCount =
      variant === 2 ? 18 : variant === 4 ? 12 : variant === 1 ? 14 : 10;
    const colors =
      variant === 2
        ? ['#F5C68C', '#E48BA0', '#C8B0DE', '#F0E58A', '#FFFFFF', '#FFB6C1']
        : variant === 4
          ? ['#F5D78E', '#E8B86D', '#FFF8DC', '#FADADD']
          : variant === 3
            ? ['#8AA878', '#A5C490', '#C8DDB8']
            : ['#D4C9A8', '#E8DFC2', '#F0EAD6', '#C5D4A8', '#FFFFFF'];

    for (let i = 0; i < speckCount; i++) {
      specks.push({
        cx: rng.range(0, width),
        cy: groundY + rng.range(4, 60),
        r: rng.range(0.8, 2.0),
        fill: colors[Math.floor(rng.next() * colors.length)]!,
      });
    }

    return { blades, specks };
  }, [groundY, height, seed, variant, width]);

  const layerH = Math.min(120, height - groundY + 20);

  return (
    <div
      className="pointer-events-none absolute left-0"
      style={{ width, height: layerH, top: groundY - 8 }}
    >
      <svg width={width} height={layerH}>
        {elements.blades.map((b, i) => (
          <path
            key={`blade-${i}`}
            d={b.d}
            stroke={b.fill}
            strokeWidth={1.2}
            fill="none"
            opacity={b.opacity}
            strokeLinecap="round"
          />
        ))}
        {elements.specks.map((s, i) => (
          <circle key={`speck-${i}`} cx={s.cx} cy={s.cy - groundY + 8} r={s.r} fill={s.fill} opacity={0.75} />
        ))}
      </svg>
    </div>
  );
}

