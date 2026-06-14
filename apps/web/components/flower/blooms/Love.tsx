import React from 'react';

import { cupCurl, rimHighlight, rosePetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Love — a garden rose seen from above. Three whorls of broad ruffled
 * petals deepen toward a wound spiral heart; outer petals carry rim light
 * and curled-back edges. Whorl rotation is seeded so each rose unfurls
 * differently.
 */
export function LoveRose({ ns, palette, seed, cx, cy }: BloomProps) {
  const outerGrad = nsId(ns, 'outerGrad');
  const midGrad = nsId(ns, 'midGrad');
  const innerGrad = nsId(ns, 'innerGrad');
  const glow = nsId(ns, 'glow');
  const rng = createRng(seed ^ 0x10f3);

  const baseSpin = rng() * 51.4;
  const outerLen = 19;
  const outerW = 11;
  const midLen = 14;
  const midW = 8.5;
  const innerLen = 9.5;
  const innerW = 6;

  return (
    <g>
      <defs>
        <radialGradient id={outerGrad} cx="50%" cy="38%" r="68%">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="48%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalDark} />
        </radialGradient>
        <radialGradient id={midGrad} cx="50%" cy="42%" r="64%">
          <stop offset="0%" stopColor={palette.petalWash} />
          <stop offset="55%" stopColor={palette.petalDark} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={innerGrad} cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor={palette.petalDark} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.55" />
          <stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={23} fill={`url(#${glow})`} />
      <ellipse cx={cx + 0.6} cy={cy + 2} rx={19} ry={16.5} fill="rgba(80, 40, 50, 0.18)" />

      {/* Outer whorl — broad ruffled petals, rim-lit, edges curling back */}
      <g>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i + baseSpin;
          const ruffle = 0.4 + rng() * 0.5;
          return (
            <g key={`outer-${i}`}>
              <path
                d={rosePetal(cx, cy, angle, outerLen, outerW, ruffle)}
                fill={`url(#${outerGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.45}
                strokeOpacity={0.5}
                strokeLinejoin="round"
              />
              <path
                d={cupCurl(cx, cy, angle, outerLen, outerW * 0.92)}
                fill={palette.petalDeepest}
                fillOpacity={0.38}
              />
              <path
                d={rimHighlight(cx, cy, angle, outerLen * 0.92, outerW * 0.85)}
                fill="#FFFFFF"
                fillOpacity={0.3}
              />
            </g>
          );
        })}
      </g>

      {/* Mid whorl — offset half a petal, deeper in tone */}
      <g>
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (360 / 5) * i + baseSpin + 36;
          return (
            <g key={`mid-${i}`}>
              <path
                d={rosePetal(cx, cy, angle, midLen, midW, 0.55)}
                fill={`url(#${midGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              <path
                d={cupCurl(cx, cy, angle, midLen, midW * 0.9)}
                fill={palette.petalDeepest}
                fillOpacity={0.42}
              />
            </g>
          );
        })}
      </g>

      {/* Inner cup */}
      <g>
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (360 / 4) * i + baseSpin + 54;
          return (
            <path
              key={`inner-${i}`}
              d={rosePetal(cx, cy, angle, innerLen, innerW, 0.35)}
              fill={`url(#${innerGrad})`}
              stroke={palette.petalDeepest}
              strokeWidth={0.35}
              strokeOpacity={0.6}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* Wound spiral heart */}
      <circle cx={cx} cy={cy} r={4.6} fill={palette.petalDeepest} />
      <g
        fill="none"
        strokeLinecap="round"
        transform={`rotate(${(baseSpin * 0.5).toFixed(1)} ${cx} ${cy})`}
      >
        <path
          d={`M ${cx + 3.6} ${cy} A 3.6 3.6 0 1 1 ${cx - 3.6} ${cy}`}
          stroke={palette.petalDark}
          strokeWidth={1.5}
        />
        <path
          d={`M ${cx - 2.3} ${cy + 0.4} A 2.3 2.3 0 1 1 ${cx + 2.3} ${cy - 0.4}`}
          stroke={palette.petalMid}
          strokeWidth={1.2}
        />
        <path
          d={`M ${cx + 1.2} ${cy} A 1.2 1.2 0 1 1 ${cx - 1.2} ${cy}`}
          stroke={palette.petalWash}
          strokeWidth={0.9}
        />
      </g>
      <circle cx={cx - 0.3} cy={cy - 0.3} r={0.7} fill={palette.petalHighlight} fillOpacity={0.85} />
    </g>
  );
}
