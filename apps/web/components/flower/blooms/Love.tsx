import React from 'react';

import { cupCurl, heartPetal, petalPath } from '@/components/flower/petalPathHelpers';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

export function LoveRose({ ns, palette, cx, cy }: BloomProps) {
  const outerGrad = nsId(ns, 'outerGrad');
  const midGrad = nsId(ns, 'midGrad');
  const innerGrad = nsId(ns, 'innerGrad');
  const glow = nsId(ns, 'glow');

  const outerLen = 18;
  const outerW = 9;
  const midLen = 13;
  const midW = 7;
  const innerLen = 8;
  const innerW = 5;

  return (
    <g>
      <defs>
        <radialGradient id={outerGrad} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <stop offset="55%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={midGrad} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="60%" stopColor={palette.petalDark} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={innerGrad} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={palette.petalDark} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={22} fill={`url(#${glow})`} />
      <ellipse cx={cx + 0.6} cy={cy + 1.8} rx={18} ry={16} fill="rgba(80, 40, 50, 0.2)" />

      <g>
        {Array.from({ length: 7 }, (_, i) => {
          const angle = (360 / 7) * i + 12;
          return (
            <g key={`outer-${i}`}>
              <path
                d={heartPetal(cx, cy, angle, outerLen, outerW)}
                fill={`url(#${outerGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.45}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              <path
                d={cupCurl(cx, cy, angle, outerLen, outerW)}
                fill={palette.petalDeepest}
                fillOpacity={0.45}
              />
            </g>
          );
        })}
      </g>

      <g>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i + 30 + 12;
          return (
            <g key={`mid-${i}`}>
              <path
                d={heartPetal(cx, cy, angle, midLen, midW)}
                fill={`url(#${midGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.6}
                strokeLinejoin="round"
              />
              <path
                d={cupCurl(cx, cy, angle, midLen, midW)}
                fill={palette.petalDeepest}
                fillOpacity={0.5}
              />
            </g>
          );
        })}
      </g>

      <g>
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (360 / 5) * i + 24;
          return (
            <path
              key={`inner-${i}`}
              d={petalPath(cx, cy, angle, innerLen, innerW, 0.1)}
              fill={`url(#${innerGrad})`}
              stroke={palette.center}
              strokeWidth={0.35}
              strokeOpacity={0.6}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      <g>
        {Array.from({ length: 3 }, (_, i) => {
          const angle = i * 120 + 30;
          return (
            <path
              key={`bud-${i}`}
              d={petalPath(cx, cy, angle, 4.2, 2.6, 0.25)}
              fill={palette.petalDeepest}
              fillOpacity={0.95}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={1.2} fill={palette.center} />
    </g>
  );
}
