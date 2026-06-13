import React from 'react';

import { roundedPetal, rimHighlight } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Dreamy — a cosmos. Eight broad, well-spaced rounded petals in soft blue-lilac
 * tones, each with a faint base vein, around a small golden center with a few
 * stamens. Open and airy, deliberately sparse to read as daydreamy.
 */
export function CosmosBloom({ ns, palette, seed, cx, cy }: BloomProps) {
  const petalGrad = nsId(ns, 'petalGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const shadowGrad = nsId(ns, 'shadowGrad');
  const rng = createRng(seed ^ 0xc05305);

  const count = 8;
  const len = 25;
  const w = 9;

  const jitter = Array.from({ length: count }, () => ({
    dAngle: (rng() * 2 - 1) * 3,
    dLen: 1 + (rng() * 2 - 1) * 0.08,
  }));

  return (
    <g>
      <defs>
        <radialGradient id={petalGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={len + 4}>
          <stop offset="0%" stopColor={palette.petalWash} />
          <stop offset="46%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalHighlight} />
        </radialGradient>
        <radialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor={palette.pollen} />
          <stop offset="60%" stopColor={palette.center} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(40, 50, 80, 0.16)" />
          <stop offset="70%" stopColor="rgba(40, 50, 80, 0.06)" />
          <stop offset="100%" stopColor="rgba(40, 50, 80, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.6} cy={cy + 2.2} rx={24} ry={21} fill={`url(#${shadowGrad})`} />

      <g>
        {jitter.map((j, i) => {
          const angle = (360 / count) * i + j.dAngle;
          const petLen = len * j.dLen;
          const a = (angle * Math.PI) / 180;
          return (
            <g key={`petal-${i}`}>
              <path
                d={roundedPetal(cx, cy, angle, petLen, w, 0.04)}
                fill={`url(#${petalGrad})`}
                stroke={palette.petalDark}
                strokeWidth={0.4}
                strokeOpacity={0.35}
                strokeLinejoin="round"
              />
              <line
                x1={cx + Math.sin(a) * 5}
                y1={cy - Math.cos(a) * 5}
                x2={cx + Math.sin(a) * petLen * 0.72}
                y2={cy - Math.cos(a) * petLen * 0.72}
                stroke={palette.petalDark}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
              <path d={rimHighlight(cx, cy, angle, petLen, w)} fill="#FFFFFF" fillOpacity={0.34} />
            </g>
          );
        })}
      </g>

      {/* Small golden eye with a halo of short stamens */}
      <circle cx={cx} cy={cy} r={5.4} fill={`url(#${centerGrad})`} />
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (360 / 10) * i + 6 + (rng() * 2 - 1) * 5;
          const a = (angle * Math.PI) / 180;
          const reach = 6.4 + rng() * 1.2;
          return (
            <circle
              key={`stamen-${i}`}
              cx={cx + Math.sin(a) * reach}
              cy={cy - Math.cos(a) * reach}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </g>
      <ellipse cx={cx - 1.6} cy={cy - 1.8} rx={1.8} ry={1.1} fill="#FFFFFF" fillOpacity={0.45} />
    </g>
  );
}
