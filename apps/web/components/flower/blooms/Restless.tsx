import React from 'react';

import { quillPetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Restless — a spiky pompon dahlia. Four rings of narrow twisted quills
 * with seeded angle/length jitter and alternating twist give the bloom a
 * crackling, can't-sit-still energy; tones step from bright outer rays to
 * an ember core ringed with pollen.
 */
export function RestlessDahlia({ ns, palette, seed, cx, cy }: BloomProps) {
  const backGrad = nsId(ns, 'backGrad');
  const midGrad = nsId(ns, 'midGrad');
  const innerGrad = nsId(ns, 'innerGrad');
  const tightGrad = nsId(ns, 'tightGrad');
  const rng = createRng(seed ^ 0xda41a);

  const rings: {
    count: number;
    len: number;
    w: number;
    offset: number;
    grad: string;
    stroke: string;
    veins?: boolean;
  }[] = [
    { count: 18, len: 24, w: 3.2, offset: 6, grad: backGrad, stroke: palette.petalDeepest },
    { count: 14, len: 19, w: 3, offset: 0, grad: midGrad, stroke: palette.petalDeepest, veins: true },
    { count: 10, len: 13.5, w: 2.6, offset: 18, grad: innerGrad, stroke: palette.petalDeepest },
    { count: 7, len: 8.2, w: 2.2, offset: 26, grad: tightGrad, stroke: palette.center },
  ];

  return (
    <g>
      <defs>
        <linearGradient id={backGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="55%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalDark} />
        </linearGradient>
        <linearGradient id={midGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalMid} />
          <stop offset="80%" stopColor={palette.petalDark} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </linearGradient>
        <radialGradient id={innerGrad} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={palette.petalDark} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={tightGrad} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={palette.petalDeepest} />
          <stop offset="100%" stopColor={palette.center} />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.6} cy={cy + 1.8} rx={24} ry={22} fill="rgba(60, 24, 12, 0.18)" />

      {/* Spark glints — restless energy flicking off the outer rays */}
      <g>
        {Array.from({ length: 4 }, (_, i) => {
          const angle = rng() * 360;
          const a = (angle * Math.PI) / 180;
          const r = 26 + rng() * 3.5;
          const gx = cx + Math.sin(a) * r;
          const gy = cy - Math.cos(a) * r;
          const s = 1.1 + rng() * 0.8;
          return (
            <path
              key={`spark-${i}`}
              d={`M ${gx} ${gy - s} L ${gx + s * 0.55} ${gy} L ${gx} ${gy + s} L ${gx - s * 0.55} ${gy} Z`}
              fill={palette.pollen}
              fillOpacity={0.55}
            />
          );
        })}
      </g>

      {rings.map((ring, ringIdx) => (
        <g key={`ring-${ringIdx}`}>
          {Array.from({ length: ring.count }, (_, i) => {
            const jitterA = (rng() * 2 - 1) * 4.5;
            const jitterL = 1 + (rng() * 2 - 1) * 0.12;
            const twist = (i % 2 === 0 ? 1 : -1) * (0.25 + rng() * 0.3);
            const angle = (360 / ring.count) * i + ring.offset + jitterA;
            const len = ring.len * jitterL;
            const a = (angle * Math.PI) / 180;
            return (
              <g key={`p-${ringIdx}-${i}`}>
                <path
                  d={quillPetal(cx, cy, angle, len, ring.w, twist)}
                  fill={`url(#${ring.grad})`}
                  stroke={ring.stroke}
                  strokeWidth={0.3}
                  strokeOpacity={0.5}
                  strokeLinejoin="round"
                />
                {ring.veins ? (
                  <line
                    x1={cx + Math.sin(a) * 2}
                    y1={cy - Math.cos(a) * 2}
                    x2={cx + Math.sin(a) * len * 0.76}
                    y2={cy - Math.cos(a) * len * 0.76}
                    stroke={palette.petalHighlight}
                    strokeWidth={0.4}
                    strokeOpacity={0.55}
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      ))}

      {/* Ember core */}
      <circle cx={cx} cy={cy} r={3.6} fill={palette.center} />
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const angle = (360 / 9) * i + 10;
          const a = (angle * Math.PI) / 180;
          return (
            <circle
              key={`stamen-${i}`}
              cx={cx + Math.sin(a) * 3.3}
              cy={cy - Math.cos(a) * 3.3}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </g>
      <circle cx={cx - 0.8} cy={cy - 0.8} r={0.8} fill={palette.petalHighlight} fillOpacity={0.7} />
    </g>
  );
}
