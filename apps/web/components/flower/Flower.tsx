'use client';

import React, { useMemo } from 'react';

import { CalmLavender } from '@/components/flower/blooms/Calm';
import { HopefulTulip } from '@/components/flower/blooms/Hopeful';
import { JoyDaisy } from '@/components/flower/blooms/Joy';
import { LoveRose } from '@/components/flower/blooms/Love';
import { RestlessDahlia } from '@/components/flower/blooms/Restless';
import { WistfulBluebells } from '@/components/flower/blooms/Wistful';
import type { BloomProps } from '@/components/flower/blooms/bloomTypes';
import { renderFoliage } from '@/components/flower/foliage/renderFoliage';
import {
  foliageDensityForWordCount,
  pickFoliageVariant,
  type FoliageVariant,
} from '@bloom/core/flowers/foliage';
import { BLOOM_PALETTES, type BloomMood } from '@bloom/core/flowers/moodPalettes';
import { xorshiftRand } from '@bloom/core/flowers/prng';

const BLOOM_COMPONENTS: Record<BloomMood, (props: BloomProps) => React.ReactElement> = {
  joy: JoyDaisy,
  calm: CalmLavender,
  love: LoveRose,
  wistful: WistfulBluebells,
  restless: RestlessDahlia,
  hopeful: HopefulTulip,
};

export interface FlowerProps {
  mood: BloomMood;
  seed: number;
  size?: number;
  sway?: number;
  wordCount?: number;
  foliageVariant?: FoliageVariant;
  opacity?: number;
  wiltDroop?: number;
}

const VIEWBOX_W = 100;
const VIEWBOX_H = 140;
const STEM_BASE_X = 50;
const STEM_BASE_Y = 138;
const STEM_TOP_Y = 60;
const BLOOM_CX = 50;
const BLOOM_CY = 48;

export function Flower({
  mood,
  seed,
  size = 140,
  sway = 0,
  wordCount = 0,
  foliageVariant,
  opacity = 1,
  wiltDroop = 0,
}: FlowerProps) {
  const palette = BLOOM_PALETTES[mood];
  const ns = `${mood}-${seed >>> 0}`;

  const variant = useMemo<FoliageVariant>(
    () => foliageVariant ?? pickFoliageVariant(seed, wordCount),
    [foliageVariant, seed, wordCount]
  );
  const density = useMemo(() => foliageDensityForWordCount(wordCount), [wordCount]);
  const stemBend = useMemo(() => (xorshiftRand(seed ^ 0x57e3) * 2 - 1) * 7, [seed]);

  const bloomCy = BLOOM_CY + wiltDroop;
  const stemTopY = STEM_TOP_Y + wiltDroop;

  const stemPath = useMemo(() => {
    const ctrlX = STEM_BASE_X + stemBend;
    const ctrlY = (stemTopY + STEM_BASE_Y) / 2;
    return `M ${BLOOM_CX} ${stemTopY.toFixed(2)} Q ${ctrlX.toFixed(2)} ${ctrlY.toFixed(2)} ${STEM_BASE_X} ${STEM_BASE_Y}`;
  }, [stemBend, stemTopY]);

  const BloomComponent = BLOOM_COMPONENTS[mood];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
      className="overflow-visible"
    >
      <g
        opacity={opacity}
        transform={`rotate(${sway.toFixed(2)} ${STEM_BASE_X} ${STEM_BASE_Y})`}
      >
        {renderFoliage({ variant, density, palette, seed })}

        <path
          d={stemPath}
          stroke="rgba(40, 40, 30, 0.22)"
          strokeWidth={3.4}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={stemPath}
          stroke={palette.stem}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={stemPath}
          stroke="#FFFFFF"
          strokeOpacity={0.35}
          strokeWidth={0.7}
          fill="none"
          strokeLinecap="round"
          transform="translate(-0.4 0)"
        />

        <BloomComponent ns={ns} palette={palette} seed={seed} cx={BLOOM_CX} cy={bloomCy} />
      </g>
    </svg>
  );
}
