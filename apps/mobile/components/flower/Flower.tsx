import React, { useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';

import { CalmLavender } from '@/components/flower/blooms/Calm';
import { HopefulTulip } from '@/components/flower/blooms/Hopeful';
import { JoyDaisy } from '@/components/flower/blooms/Joy';
import { LoveRose } from '@/components/flower/blooms/Love';
import { Pumpkin } from '@/components/flower/blooms/Pumpkin';
import { RestlessDahlia } from '@/components/flower/blooms/Restless';
import { WistfulBluebells } from '@/components/flower/blooms/Wistful';
import type { BloomProps } from '@/components/flower/blooms/bloomTypes';
import { renderFoliage } from '@/components/flower/foliage/renderFoliage';
import {
  foliageDensityForWordCount,
  pickFoliageVariant,
  type FoliageVariant,
} from '@/lib/flowers/foliage';
import { BLOOM_PALETTES, type BloomMood } from '@/lib/flowers/moodPalettes';
import { xorshiftRand } from '@/lib/flowers/prng';

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
  /** Degrees rotated about the stem base for sway / decorative tilt. */
  sway?: number;
  /** Words in the entry; biases foliage variant and density. */
  wordCount?: number;
  /** Override the random foliage pick (e.g. for fixed gallery rows). */
  foliageVariant?: FoliageVariant;
  opacity?: number;
  /** Bloom-only vertical droop in viewBox units (0–10). Stem follows. */
  wiltDroop?: number;
  /** When set, replaces the bloom with the pumpkin easter egg at the given stage. */
  pumpkinStage?: 0 | 1 | 2;
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
  pumpkinStage,
}: FlowerProps) {
  const palette = BLOOM_PALETTES[mood];
  const isPumpkin = pumpkinStage !== undefined;
  const isRipePumpkin = pumpkinStage === 2;
  const ns = isPumpkin ? `pumpkin-${seed >>> 0}` : `${mood}-${seed >>> 0}`;

  const variant = useMemo<FoliageVariant>(
    () => foliageVariant ?? pickFoliageVariant(seed, wordCount),
    [foliageVariant, seed, wordCount]
  );
  const density = useMemo(() => foliageDensityForWordCount(wordCount), [wordCount]);
  const stemBend = useMemo(() => (xorshiftRand(seed ^ 0x57e3) * 2 - 1) * 7, [seed]);

  const effectiveWilt = isRipePumpkin ? 0 : wiltDroop;
  const bloomCy = BLOOM_CY + effectiveWilt;
  const stemTopY = STEM_TOP_Y + effectiveWilt;

  const stemPath = useMemo(() => {
    const ctrlX = STEM_BASE_X + stemBend;
    const ctrlY = (stemTopY + STEM_BASE_Y) / 2;
    return `M ${BLOOM_CX} ${stemTopY.toFixed(2)} Q ${ctrlX.toFixed(2)} ${ctrlY.toFixed(2)} ${STEM_BASE_X} ${STEM_BASE_Y}`;
  }, [stemBend, stemTopY]);

  const BloomComponent = BLOOM_COMPONENTS[mood];
  const effectiveSway = isRipePumpkin ? 0 : sway;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
    >
      <G
        opacity={opacity}
        transform={effectiveSway !== 0 ? `rotate(${effectiveSway.toFixed(2)} ${STEM_BASE_X} ${STEM_BASE_Y})` : undefined}
      >
        {!isRipePumpkin ? renderFoliage({ variant, density, palette, seed }) : null}

        {!isRipePumpkin ? (
          <>
            <Path
              d={stemPath}
              stroke="rgba(40, 40, 30, 0.22)"
              strokeWidth={3.4}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={stemPath}
              stroke={palette.stem}
              strokeWidth={2.6}
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d={stemPath}
              stroke="#FFFFFF"
              strokeOpacity={0.35}
              strokeWidth={0.7}
              fill="none"
              strokeLinecap="round"
              transform="translate(-0.4 0)"
            />
          </>
        ) : null}

        {isPumpkin ? (
          <Pumpkin ns={ns} seed={seed} cx={BLOOM_CX} cy={bloomCy} stage={pumpkinStage!} />
        ) : (
          <BloomComponent
            ns={ns}
            palette={palette}
            seed={seed}
            cx={BLOOM_CX}
            cy={bloomCy}
          />
        )}
      </G>
    </Svg>
  );
}
