import React from 'react';

import { quillPetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Anxious — an aster. Three dense rings of many fine, slightly twitchy ray
 * petals in cool muted magenta, stepping inward to a small bright-yellow eye.
 * The high petal count + restless jitter read as nervy without the dahlia's heat.
 */
export function AsterBloom({ ns, palette, seed, cx, cy }: BloomProps) {
  const backGrad = nsId(ns, 'backGrad');
  const midGrad = nsId(ns, 'midGrad');
  const innerGrad = nsId(ns, 'innerGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const shadowGrad = nsId(ns, 'shadowGrad');
  const rng = createRng(seed ^ 0xa57e20);

  const rings: { count: number; len: number; w: number; offset: number; grad: string }[] = [
    { count: 28, len: 24, w: 2.2, offset: 6, grad: backGrad },
    { count: 22, len: 18.5, w: 2.1, offset: 14, grad: midGrad },
    { count: 14, len: 12.5, w: 1.9, offset: 22, grad: innerGrad },
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
        <radialGradient id={innerGrad} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor={palette.petalDark} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor={palette.pollen} />
          <stop offset="65%" stopColor={palette.center} />
          <stop offset="100%" stopColor={palette.petalDeepest} />
        </radialGradient>
        <radialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(50, 30, 50, 0.16)" />
          <stop offset="70%" stopColor="rgba(50, 30, 50, 0.06)" />
          <stop offset="100%" stopColor="rgba(50, 30, 50, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.6} cy={cy + 2.2} rx={24} ry={21} fill={`url(#${shadowGrad})`} />

      {rings.map((ring, ringIdx) => (
        <g key={`ring-${ringIdx}`}>
          {Array.from({ length: ring.count }, (_, i) => {
            const jitterA = (rng() * 2 - 1) * 5;
            const jitterL = 1 + (rng() * 2 - 1) * 0.12;
            const twist = (i % 2 === 0 ? 1 : -1) * (0.12 + rng() * 0.18);
            const angle = (360 / ring.count) * i + ring.offset + jitterA;
            return (
              <path
                key={`p-${ringIdx}-${i}`}
                d={quillPetal(cx, cy, angle, ring.len * jitterL, ring.w, twist)}
                fill={`url(#${ring.grad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.28}
                strokeOpacity={0.45}
                strokeLinejoin="round"
              />
            );
          })}
        </g>
      ))}

      {/* Bright yellow eye */}
      <circle cx={cx} cy={cy} r={4.4} fill={`url(#${centerGrad})`} />
      <g>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (360 / 8) * i + 12;
          const a = (angle * Math.PI) / 180;
          return (
            <circle
              key={`stamen-${i}`}
              cx={cx + Math.sin(a) * 3}
              cy={cy - Math.cos(a) * 3}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </g>
      <circle cx={cx - 1} cy={cy - 1} r={0.9} fill="#FFFFFF" fillOpacity={0.55} />
    </g>
  );
}
