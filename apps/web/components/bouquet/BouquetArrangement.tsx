'use client';

import { Flower } from '@/components/flower/Flower';
import { renderBouquetGreenery } from '@/components/bouquet/BouquetGreenery';
import { FLOWER_SIZE_RATIO, TIE_BOTTOM_RATIO, flowerAngles, greeneryOffsets } from '@/lib/bouquet/layout';
import type { BouquetFlower, BouquetGreenery as BouquetGreeneryKind } from '@bloom/core';

type Props = {
  flowers: BouquetFlower[];
  /** Non-flower accents framing the tie, or `null`/omitted for none. */
  greenery?: BouquetGreeneryKind[] | null;
  /** Square px size of the whole arrangement. */
  size?: number;
};

/**
 * Lays out 1–5 snapshot flowers as a gathered, tied bouquet: stems converge at a low tie point and
 * the heads fan out, wrapped in a paper cone and finished with a ribbon. Each flower renders fresh
 * from its genome via {@link Flower} — no entry data needed. Optional greenery accents frame the
 * tie behind the stems. Geometry is shared with the PNG builder (`lib/bouquet/layout`) so the live
 * preview and the exported image match.
 */
export function BouquetArrangement({ flowers, greenery, size = 320 }: Props) {
  const n = flowers.length;
  const flowerSize = size * FLOWER_SIZE_RATIO;
  const angles = flowerAngles(n);
  const accents = greenery?.length ? greenery.slice(0, 3) : [];
  const offsets = greeneryOffsets(accents.length);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`A bouquet of ${n} flower${n === 1 ? '' : 's'}${accents.length ? ' with greenery' : ''}`}
    >
      {/* Paper wrap cone behind the stems. */}
      <svg
        aria-hidden
        viewBox="0 0 100 70"
        width={size * 0.46}
        height={size * 0.322}
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: size * 0.05 }}
      >
        <defs>
          <linearGradient id="bq-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F1E5CD" />
            <stop offset="1" stopColor="#D9C6A1" />
          </linearGradient>
        </defs>
        <path d="M50 68 L6 8 Q50 16 94 8 Z" fill="url(#bq-paper)" />
        <path d="M50 66 L50 13" stroke="#CDBA94" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      </svg>

      {/* Greenery accents behind the stems, framing the tie. */}
      {accents.map((kind, i) => (
        <div
          key={`greenery-${i}`}
          aria-hidden
          className="absolute left-1/2"
          style={{
            bottom: size * TIE_BOTTOM_RATIO,
            width: flowerSize,
            height: flowerSize,
            transform: `translateX(calc(-50% + ${(offsets[i] ?? 0) * size}px))`,
          }}
        >
          <svg
            viewBox="0 0 100 140"
            width={flowerSize}
            height={flowerSize}
            preserveAspectRatio="xMidYMax meet"
            className="overflow-visible"
          >
            {renderBouquetGreenery({ kind, seed: 1000 + i * 31 + kind.length })}
          </svg>
        </div>
      ))}

      {flowers.map((flower, i) => {
        const angle = angles[i] ?? 0;
        const { genome } = flower;
        return (
          <div
            key={i}
            data-bouquet-flower
            className="absolute left-1/2"
            style={{
              bottom: size * TIE_BOTTOM_RATIO,
              transform: `translateX(-50%) rotate(${angle}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <Flower
              mood={genome.bloomMood}
              seed={genome.seed}
              size={flowerSize}
              wordCount={genome.wordCount}
              foliageVariant={genome.foliageVariant}
              pumpkinStage={genome.specialBloom === 'pumpkin' ? genome.pumpkinStage : undefined}
            />
          </div>
        );
      })}

      {/* Ribbon: a knot over the gather with two trailing tails. */}
      <svg
        aria-hidden
        viewBox="0 0 40 22"
        width={size * 0.34}
        height={size * 0.187}
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: size * 0.02 }}
      >
        <path d="M20 7 C 17 12, 9 13, 11 21 L 15 19 C 14 14, 18 11, 20 8 Z" fill="#D98C97" />
        <path d="M20 7 C 23 12, 31 13, 29 21 L 25 19 C 26 14, 22 11, 20 8 Z" fill="#D98C97" />
        <ellipse cx="20" cy="6" rx="6" ry="4" fill="#EBA6AE" />
        <ellipse cx="20" cy="5" rx="2.4" ry="1.5" fill="#F3C2C7" />
      </svg>
    </div>
  );
}
