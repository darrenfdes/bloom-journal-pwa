import React from 'react';

import { heartPetal, petalPath, rimHighlight } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

const GOLDEN_ANGLE = 137.50776;

/**
 * Joy — an open-faced daisy. Two rings of ray petals lit from the center
 * out (warm base, pale tips), a domed seed head laid out on a phyllotaxis
 * spiral, and a ring of pollen stamens. Petal lengths/angles carry seeded
 * jitter so no two daisies match.
 */
export function JoyDaisy({ ns, palette, seed, cx, cy }: BloomProps) {
  const petalGrad = nsId(ns, 'petalGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const shadowGrad = nsId(ns, 'shadowGrad');
  const rng = createRng(seed ^ 0x10d215);

  const backCount = 13;
  const frontCount = 11;
  const backLen = 21;
  const backW = 4.4;
  const frontLen = 23.5;
  const frontW = 6.4;

  const backJitter = Array.from({ length: backCount }, () => ({
    dAngle: (rng() * 2 - 1) * 4,
    dLen: 1 + (rng() * 2 - 1) * 0.08,
  }));
  const frontJitter = Array.from({ length: frontCount }, () => ({
    dAngle: (rng() * 2 - 1) * 3,
    dLen: 1 + (rng() * 2 - 1) * 0.07,
  }));

  return (
    <g>
      <defs>
        <radialGradient
          id={petalGrad}
          gradientUnits="userSpaceOnUse"
          cx={cx}
          cy={cy}
          r={frontLen + 4}
        >
          <stop offset="0%" stopColor={palette.petalDark} />
          <stop offset="30%" stopColor={palette.petalMid} />
          <stop offset="72%" stopColor={palette.petalWash} />
          <stop offset="100%" stopColor={palette.petalHighlight} />
        </radialGradient>
        <radialGradient id={centerGrad} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="38%" stopColor={palette.pollen} />
          <stop offset="78%" stopColor={palette.petalDeepest} />
          <stop offset="100%" stopColor={palette.center} />
        </radialGradient>
        <radialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(60, 44, 20, 0.18)" />
          <stop offset="70%" stopColor="rgba(60, 44, 20, 0.07)" />
          <stop offset="100%" stopColor="rgba(60, 44, 20, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.8} cy={cy + 2.4} rx={26} ry={23} fill={`url(#${shadowGrad})`} />

      {/* Back ring — slimmer rays peeking between the front petals */}
      <g>
        {backJitter.map((j, i) => {
          const angle = (360 / backCount) * i + 16 + j.dAngle;
          return (
            <path
              key={`back-${i}`}
              d={petalPath(cx, cy, angle, backLen * j.dLen, backW, 0.06)}
              fill={`url(#${petalGrad})`}
              fillOpacity={0.85}
              stroke={palette.petalDeepest}
              strokeWidth={0.35}
              strokeOpacity={0.4}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* Front ring — full ray petals with crease vein and rim light */}
      <g>
        {frontJitter.map((j, i) => {
          const angle = (360 / frontCount) * i + j.dAngle;
          const len = frontLen * j.dLen;
          const a = (angle * Math.PI) / 180;
          return (
            <g key={`front-${i}`}>
              <path
                d={heartPetal(cx, cy, angle, len, frontW)}
                fill={`url(#${petalGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.32}
                strokeLinejoin="round"
              />
              <line
                x1={cx + Math.sin(a) * 6}
                y1={cy - Math.cos(a) * 6}
                x2={cx + Math.sin(a) * len * 0.74}
                y2={cy - Math.cos(a) * len * 0.74}
                stroke={palette.petalDark}
                strokeWidth={0.45}
                strokeOpacity={0.4}
              />
              <path
                d={rimHighlight(cx, cy, angle, len, frontW)}
                fill="#FFFFFF"
                fillOpacity={0.32}
              />
            </g>
          );
        })}
      </g>

      {/* Domed seed head — phyllotaxis spiral */}
      <circle cx={cx} cy={cy} r={9} fill={`url(#${centerGrad})`} />
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill="none"
        stroke={palette.center}
        strokeWidth={0.6}
        strokeOpacity={0.5}
      />
      <g>
        {Array.from({ length: 44 }, (_, i) => {
          const r = Math.sqrt(i + 0.6) * 1.32;
          if (r > 8.1) return null;
          const theta = ((i * GOLDEN_ANGLE) * Math.PI) / 180;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          const tone =
            i % 5 === 0
              ? palette.petalDeepest
              : i % 2 === 0
                ? palette.center
                : palette.pollen;
          return (
            <circle
              key={`seed-${i}`}
              cx={px}
              cy={py}
              r={0.62 + (r / 8.1) * 0.35}
              fill={tone}
              fillOpacity={0.9}
            />
          );
        })}
      </g>
      <ellipse cx={cx - 2.6} cy={cy - 3.2} rx={3} ry={1.7} fill="#FFFFFF" fillOpacity={0.4} />

      {/* Pollen stamens haloing the dome */}
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (360 / 10) * i + 8 + (rng() * 2 - 1) * 6;
          const a = (angle * Math.PI) / 180;
          const reach = 10.6 + rng() * 1.6;
          const tipX = cx + Math.sin(a) * reach;
          const tipY = cy - Math.cos(a) * reach;
          return (
            <g key={`stamen-${i}`}>
              <line
                x1={cx + Math.sin(a) * 7.6}
                y1={cy - Math.cos(a) * 7.6}
                x2={tipX}
                y2={tipY}
                stroke={palette.petalDeepest}
                strokeWidth={0.5}
                strokeOpacity={0.7}
                strokeLinecap="round"
              />
              <circle cx={tipX} cy={tipY} r={0.85} fill={palette.pollen} />
            </g>
          );
        })}
      </g>
    </g>
  );
}
