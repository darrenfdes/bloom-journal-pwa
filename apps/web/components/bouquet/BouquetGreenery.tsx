import React from 'react';

import { renderFoliage } from '@/components/flower/foliage/renderFoliage';
import type { BloomPalette } from '@bloom/core/flowers/moodPalettes';
import { createRng, rngRange } from '@bloom/core/flowers/prng';
import type { FoliageVariant } from '@bloom/core/flowers/foliage';
import type { BouquetGreenery as BouquetGreeneryKind } from '@bloom/core';

/**
 * A neutral sage palette for the greenery accents — independent of any flower's mood so the frame
 * stays consistent and calm. Satisfies the {@link BloomPalette} shape the foliage renderer reads.
 */
const SAGE_PALETTE: BloomPalette = {
  petalHighlight: '#E8F0DF',
  petalMid: '#C9D8B6',
  petalWash: '#A8BF90',
  petalDark: '#7E9B66',
  petalDeepest: '#5C7A48',
  center: '#C9D8B6',
  pollen: '#E6D38A',
  stem: '#7E9B66',
  leaf: '#9CB37F',
};

const WHEAT_PALETTE: BloomPalette = {
  petalHighlight: '#F2D98A',
  petalMid: '#E6C25E',
  petalWash: '#D4A93C',
  petalDark: '#B5861F',
  petalDeepest: '#8C6614',
  center: '#E6C25E',
  pollen: '#F2D98A',
  stem: '#A98A3C',
  leaf: '#B89A4A',
};

type Props = {
  kind: BouquetGreeneryKind;
  /** Stable per-accent seed so the shapes don't reshuffle on every render. */
  seed: number;
  /** Ground anchor in the parent's viewBox coordinates; the accent grows up from here. */
  cx?: number;
  baseY?: number;
};

/**
 * Renders one bouquet-level greenery accent as an SVG fragment. Three kinds reuse the shared
 * foliage renderer (reeds, sprigs, fern) for art consistency; baby's breath and wheat are
 * bouquet-only accents drawn in the same primitive style. Used by both the live preview and the
 * PNG builder so the two never drift.
 */
export function renderBouquetGreenery(props: Props): React.ReactElement {
  const cx = props.cx ?? 50;
  const baseY = props.baseY ?? 138;

  switch (props.kind) {
    case 'reeds':
      return renderFoliage({ variant: 4 as FoliageVariant, density: 1, palette: SAGE_PALETTE, seed: props.seed, cx, baseY });
    case 'sprigs':
      return renderFoliage({ variant: 7 as FoliageVariant, density: 1, palette: SAGE_PALETTE, seed: props.seed, cx, baseY });
    case 'fern':
      return renderFoliage({ variant: 3 as FoliageVariant, density: 1, palette: SAGE_PALETTE, seed: props.seed, cx, baseY });
    case 'babys-breath':
      return <BabysBreath seed={props.seed} cx={cx} baseY={baseY} />;
    case 'wheat':
      return <Wheat seed={props.seed} cx={cx} baseY={baseY} />;
  }
}

/* -------------------------- Baby's breath -------------------------- */
function BabysBreath({ seed, cx, baseY }: { seed: number; cx: number; baseY: number }) {
  const rng = createRng(seed ^ 0xb4b9);
  const stems = 3;
  const elements: React.ReactElement[] = [];
  for (let s = 0; s < stems; s++) {
    const side = s === 0 ? 0 : s === 1 ? -1 : 1;
    const ox = side * (6 + rngRange(rng, -1, 1));
    const length = 14 + rngRange(rng, -1, 2);
    const tipX = cx + ox;
    const tipY = baseY - length;
    const midX = cx + ox * 0.5;
    const midY = baseY - length * 0.55;
    elements.push(
      <path
        key={`bb-stem-${s}`}
        d={`M ${cx.toFixed(2)} ${baseY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`}
        stroke={SAGE_PALETTE.stem}
        strokeWidth={0.7}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />
    );
    // A loose cluster of tiny white blossoms near the tip.
    const blossoms = 5;
    for (let b = 0; b < blossoms; b++) {
      const bx = tipX + rngRange(rng, -3, 3);
      const by = tipY + rngRange(rng, -2, 3);
      const r = 0.9 + rngRange(rng, 0, 0.6);
      elements.push(
        <circle
          key={`bb-bloom-${s}-${b}`}
          cx={bx}
          cy={by}
          r={r}
          fill="#F4F1E8"
          fillOpacity={0.9}
          stroke="#E6DFD0"
          strokeWidth={0.2}
        />
      );
    }
  }
  return <g>{elements}</g>;
}

/* ------------------------------ Wheat ------------------------------ */
function Wheat({ seed, cx, baseY }: { seed: number; cx: number; baseY: number }) {
  const rng = createRng(seed ^ 0x4e2);
  const stalks = 2;
  const elements: React.ReactElement[] = [];
  for (let s = 0; s < stalks; s++) {
    const side = s === 0 ? -1 : 1;
    const ox = side * (4 + rngRange(rng, -1, 1));
    const length = 18 + rngRange(rng, -1, 2);
    const tipX = cx + ox;
    const tipY = baseY - length;
    const midX = cx + ox * 0.5;
    const midY = baseY - length * 0.55;
    elements.push(
      <path
        key={`wh-stem-${s}`}
        d={`M ${cx.toFixed(2)} ${baseY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`}
        stroke={WHEAT_PALETTE.stem}
        strokeWidth={0.8}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
    // A grain head: a row of angled awns up the upper third of the stalk.
    const grains = 6;
    const headStart = 0.55;
    for (let g = 0; g < grains; g++) {
      const t = headStart + (g / (grains - 1)) * (1 - headStart - 0.05);
      const gx = cx + ox * t;
      const gy = baseY - length * t;
      const len = 2.6 * (1 - g * 0.05);
      for (const dir of [-1, 1]) {
        const ax = gx + dir * len * 0.6;
        const ay = gy - len;
        elements.push(
          <path
            key={`wh-grain-${s}-${g}-${dir}`}
            d={`M ${gx.toFixed(2)} ${gy.toFixed(2)} Q ${((gx + ax) / 2).toFixed(2)} ${(gy - 0.6).toFixed(2)} ${ax.toFixed(2)} ${ay.toFixed(2)}`}
            stroke={WHEAT_PALETTE.petalDark}
            strokeWidth={0.5}
            strokeOpacity={0.8}
            strokeLinecap="round"
            fill="none"
          />
        );
      }
    }
  }
  return <g>{elements}</g>;
}
