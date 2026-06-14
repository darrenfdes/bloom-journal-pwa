'use client';

import React, { useMemo } from 'react';

import { getGrassTuftParams } from '@bloom/core/garden/ground';
import { SeededRNG } from '@bloom/core/flowers/seeded-rng';
import type { GroundVariant } from '@bloom/core/types';

type Props = {
  width: number;
  /** Band height — flora scatters from `groundY - 24` down through this band. */
  height: number;
  groundY: number;
  month?: number;
  seed?: number;
  density?: number;
  groundVariant?: GroundVariant;
};

type Blade = { d: string; stroke: string; widthPx: number; opacity: number };
type Blossom = {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stemD: string;
  stemColor: string;
};
type SeedHead = { stemD: string; cx: number; cy: number; color: string };

/**
 * Foreground grass tufts, tiny stemmed wildflowers, and seed heads;
 * density varies by ground variant. Swaying micro-blades are rendered
 * by SwayingGrassCanvas.
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
    const blades: Blade[] = [];
    const blossoms: Blossom[] = [];
    const seedHeads: SeedHead[] = [];

    const greenBase =
      groundVariant === 3
        ? ['rgba(55, 90, 48, 0.75)', 'rgba(72, 108, 60, 0.62)', 'rgba(44, 76, 40, 0.8)']
        : groundVariant === 4
          ? ['rgba(140, 125, 70, 0.65)', 'rgba(168, 148, 88, 0.55)', 'rgba(118, 106, 60, 0.7)']
          : ['rgba(92, 128, 76, 0.7)', 'rgba(126, 162, 100, 0.58)', 'rgba(72, 108, 66, 0.75)'];
    const litBlade =
      groundVariant === 4 ? 'rgba(212, 192, 122, 0.5)' : 'rgba(168, 200, 130, 0.5)';

    for (let i = 0; i < effectiveDensity; i++) {
      const x = rng.range(0, width);
      const baseY = groundY + rng.range(-12, height - 40);
      const h = rng.range(params.heightMin, params.heightMax);
      const w = rng.range(params.widthMin, params.widthMax);

      const shade = rng.next();
      const fill = shade < 0.33 ? greenBase[0]! : shade < 0.66 ? greenBase[1]! : greenBase[2]!;

      // Each tuft fans 3 curved blades — center tall, sides leaning out
      const bladeCount = 3;
      for (let b = 0; b < bladeCount; b++) {
        const side = b === 0 ? 0 : b === 1 ? -1 : 1;
        const bx = x + side * w * 0.4;
        const bh = h * (side === 0 ? 1 : rng.range(0.55, 0.8));
        const lean = side * w * rng.range(0.5, 0.9) + rng.range(-1.5, 1.5);
        blades.push({
          d: `M ${bx.toFixed(1)} ${(baseY + 2).toFixed(1)} Q ${(bx + lean * 0.35).toFixed(1)} ${(baseY - bh * 0.55).toFixed(1)} ${(bx + lean).toFixed(1)} ${(baseY - bh).toFixed(1)}`,
          stroke: b === 1 && rng.next() < 0.3 ? litBlade : fill,
          widthPx: side === 0 ? 1.6 : 1.2,
          opacity: rng.range(0.65, 1),
        });
      }

      if (rng.next() < params.blossomChance) {
        const bx = x + rng.range(-7, 7);
        const by = baseY + rng.range(-3, 3);
        const stalkH = rng.range(6, 11);
        const colors =
          groundVariant === 4
            ? ['#F5D78E', '#FFF8DC', '#FADADD', '#E8C97A']
            : ['#F5C68C', '#E48BA0', '#C8B0DE', '#F0E58A', '#FFFFFF'];
        blossoms.push({
          cx: bx,
          cy: by - stalkH,
          r: rng.range(1.5, 2.5),
          fill: colors[Math.floor(rng.next() * colors.length)]!,
          stemD: `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(bx + rng.range(-2, 2)).toFixed(1)} ${(by - stalkH * 0.6).toFixed(1)} ${bx.toFixed(1)} ${(by - stalkH).toFixed(1)}`,
          stemColor: greenBase[2]!,
        });
      } else if (rng.next() < 0.18) {
        // Wild grass seed head — slender stalk with an oat-colored tip
        const sx = x + rng.range(-6, 6);
        const sy = baseY + rng.range(-2, 2);
        const sh = rng.range(10, 16);
        const lean = rng.range(-3, 3);
        seedHeads.push({
          stemD: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${(sx + lean * 0.4).toFixed(1)} ${(sy - sh * 0.6).toFixed(1)} ${(sx + lean).toFixed(1)} ${(sy - sh).toFixed(1)}`,
          cx: sx + lean,
          cy: sy - sh,
          color: groundVariant === 4 ? 'rgba(228, 206, 138, 0.85)' : 'rgba(214, 198, 142, 0.8)',
        });
      }
    }

    return { blades, blossoms, seedHeads };
  }, [effectiveDensity, groundVariant, groundY, height, params, seed, width]);

  return (
    <div
      className="pointer-events-none absolute left-0"
      style={{ width, height: height + 24, top: groundY - 48 }}
    >
      <svg width={width} height={height + 24}>
        <g transform={`translate(0 ${-(groundY - 48)})`}>
          {elements.blades.map((b, i) => (
            <path
              key={`g-${i}`}
              d={b.d}
              stroke={b.stroke}
              strokeWidth={b.widthPx}
              strokeLinecap="round"
              fill="none"
              opacity={b.opacity}
            />
          ))}
          {elements.seedHeads.map((s, i) => (
            <g key={`s-${i}`}>
              <path
                d={s.stemD}
                stroke={s.color}
                strokeWidth={0.9}
                strokeLinecap="round"
                fill="none"
                opacity={0.8}
              />
              <ellipse cx={s.cx} cy={s.cy - 1.4} rx={1.2} ry={2.4} fill={s.color} />
            </g>
          ))}
          {elements.blossoms.map((b, i) => (
            <g key={`b-${i}`}>
              <path d={b.stemD} stroke={b.stemColor} strokeWidth={0.8} fill="none" opacity={0.8} />
              {Array.from({ length: 5 }, (_, p) => {
                const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
                return (
                  <circle
                    key={p}
                    cx={b.cx + Math.cos(a) * b.r}
                    cy={b.cy + Math.sin(a) * b.r}
                    r={b.r * 0.62}
                    fill={b.fill}
                    opacity={0.9}
                  />
                );
              })}
              <circle cx={b.cx} cy={b.cy} r={b.r * 0.45} fill="#F2D470" opacity={0.95} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
