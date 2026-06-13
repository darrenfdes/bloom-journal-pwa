import React from 'react';

import { rosePetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Energized — a poppy. Five broad, papery, overlapping cupped petals in hot
 * red-orange, each with a dark blotch at its base, around a near-black seed
 * capsule ringed with stamens. Big, open and vivid — high-energy.
 */
export function PoppyBloom({ ns, palette, seed, cx, cy }: BloomProps) {
  const petalGrad = nsId(ns, 'petalGrad');
  const blotchGrad = nsId(ns, 'blotchGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const shadowGrad = nsId(ns, 'shadowGrad');
  const rng = createRng(seed ^ 0x90991e);

  const count = 5;
  const len = 25;
  const w = 17;

  const jitter = Array.from({ length: count }, () => ({
    dAngle: (rng() * 2 - 1) * 6,
    dLen: 1 + (rng() * 2 - 1) * 0.08,
  }));

  return (
    <g>
      <defs>
        <radialGradient id={petalGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={len + 4}>
          <stop offset="0%" stopColor={palette.petalDeepest} />
          <stop offset="26%" stopColor={palette.petalDark} />
          <stop offset="68%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalHighlight} />
        </radialGradient>
        <radialGradient id={blotchGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={11}>
          <stop offset="0%" stopColor={palette.center} />
          <stop offset="70%" stopColor={palette.petalDeepest} />
          <stop offset="100%" stopColor="rgba(60, 18, 8, 0)" />
        </radialGradient>
        <radialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor={palette.petalDeepest} />
          <stop offset="100%" stopColor={palette.center} />
        </radialGradient>
        <radialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(60, 18, 8, 0.2)" />
          <stop offset="70%" stopColor="rgba(60, 18, 8, 0.08)" />
          <stop offset="100%" stopColor="rgba(60, 18, 8, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.8} cy={cy + 2.6} rx={26} ry={22} fill={`url(#${shadowGrad})`} />

      {/* Broad overlapping petals */}
      <g>
        {jitter.map((j, i) => {
          const angle = (360 / count) * i + j.dAngle;
          return (
            <path
              key={`petal-${i}`}
              d={rosePetal(cx, cy, angle, len * j.dLen, w, 0.85)}
              fill={`url(#${petalGrad})`}
              stroke={palette.petalDeepest}
              strokeWidth={0.4}
              strokeOpacity={0.4}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* Dark blotch pooling at the petal bases */}
      <circle cx={cx} cy={cy} r={11} fill={`url(#${blotchGrad})`} />

      {/* Seed capsule + radiating stamens */}
      <g>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (360 / 16) * i + (rng() * 2 - 1) * 4;
          const a = (angle * Math.PI) / 180;
          const reach = 6.6 + rng() * 1.8;
          const tipX = cx + Math.sin(a) * reach;
          const tipY = cy - Math.cos(a) * reach;
          return (
            <g key={`stamen-${i}`}>
              <line
                x1={cx + Math.sin(a) * 3.4}
                y1={cy - Math.cos(a) * 3.4}
                x2={tipX}
                y2={tipY}
                stroke={palette.center}
                strokeWidth={0.5}
                strokeOpacity={0.8}
                strokeLinecap="round"
              />
              <circle cx={tipX} cy={tipY} r={0.85} fill={palette.petalDeepest} />
            </g>
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={4} fill={`url(#${centerGrad})`} />
      <circle cx={cx} cy={cy} r={4} fill="none" stroke={palette.petalDark} strokeWidth={0.5} strokeOpacity={0.6} />
      {/* Stigma rays on the capsule cap */}
      <g>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (360 / 8) * i;
          const a = (angle * Math.PI) / 180;
          return (
            <line
              key={`stigma-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + Math.sin(a) * 3.4}
              y2={cy - Math.cos(a) * 3.4}
              stroke={palette.petalMid}
              strokeWidth={0.5}
              strokeOpacity={0.55}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </g>
  );
}
