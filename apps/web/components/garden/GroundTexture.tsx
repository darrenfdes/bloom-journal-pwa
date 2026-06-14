'use client';

import React, { useMemo } from 'react';

import { SeededRNG } from '@bloom/core/flowers/seeded-rng';
import type { GroundVariant } from '@bloom/core/types';

type Props = {
  width: number;
  /** Band height — texture scatters from `groundY` down through this band. */
  height: number;
  groundY: number;
  variant: GroundVariant;
  seed?: number;
};

/**
 * Subtle ground texture overlay (blade strokes / wildflower specks / clover
 * shadows) per meadow variant.
 */
export function GroundTexture({ width, height, groundY, variant, seed = 42 }: Props) {
  const bandH = Math.min(140, height);

  const elements = useMemo(() => {
    const rng = new SeededRNG(seed + variant * 17);
    const blades: { d: string; opacity: number; stroke: string }[] = [];
    const specks: { cx: number; cy: number; r: number; fill: string }[] = [];
    const patches: { cx: number; cy: number; rx: number; ry: number; fill: string }[] = [];

    const bladeCount =
      variant === 1 ? 30 : variant === 3 ? 24 : variant === 4 ? 20 : 18;

    for (let i = 0; i < bladeCount; i++) {
      const x = rng.range(0, width);
      const baseY = rng.range(10, bandH - 14);
      const h = rng.range(4, variant === 1 ? 14 : 10);
      const lean = rng.range(-4, 4);
      const stroke =
        variant === 3
          ? 'rgba(45, 75, 38, 0.4)'
          : variant === 4
            ? 'rgba(120, 100, 45, 0.34)'
            : 'rgba(86, 126, 62, 0.32)';

      blades.push({
        d: `M ${x.toFixed(1)} ${(baseY + h).toFixed(1)} Q ${(x + lean).toFixed(1)} ${(baseY + h * 0.4).toFixed(1)} ${(x + lean * 0.5).toFixed(1)} ${baseY.toFixed(1)}`,
        opacity: rng.range(0.4, 0.75),
        stroke,
      });
    }

    // Soft tonal patches — mottled light pooling on the meadow floor
    const patchCount = 5;
    for (let i = 0; i < patchCount; i++) {
      const light = rng.next() < 0.5;
      patches.push({
        cx: rng.range(0, width),
        cy: rng.range(14, bandH - 10),
        rx: rng.range(34, 90),
        ry: rng.range(7, 16),
        fill: light
          ? variant === 4
            ? 'rgba(240, 222, 160, 0.10)'
            : 'rgba(220, 240, 180, 0.10)'
          : 'rgba(30, 52, 28, 0.08)',
      });
    }

    // Stipple dots for all variants — sparser for muted grounds
    const speckCount =
      variant === 2 ? 20 : variant === 4 ? 14 : variant === 1 ? 16 : 12;
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
        cy: rng.range(8, Math.min(64, bandH - 8)),
        r: rng.range(0.8, 2.0),
        fill: colors[Math.floor(rng.next() * colors.length)]!,
      });
    }

    return { blades, specks, patches };
  }, [bandH, seed, variant, width]);

  return (
    <div
      className="pointer-events-none absolute left-0"
      style={{ width, height: bandH, top: groundY - 8 }}
    >
      <svg width={width} height={bandH}>
        {elements.patches.map((p, i) => (
          <ellipse
            key={`patch-${i}`}
            cx={p.cx}
            cy={p.cy}
            rx={p.rx}
            ry={p.ry}
            fill={p.fill}
          />
        ))}
        {elements.blades.map((b, i) => (
          <path
            key={`blade-${i}`}
            d={b.d}
            stroke={b.stroke}
            strokeWidth={1.2}
            fill="none"
            opacity={b.opacity}
            strokeLinecap="round"
          />
        ))}
        {elements.specks.map((s, i) => (
          <circle key={`speck-${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={0.75} />
        ))}
      </svg>
    </div>
  );
}
