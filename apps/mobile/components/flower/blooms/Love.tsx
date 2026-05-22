import React from 'react';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

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
    <G>
      <Defs>
        <RadialGradient id={outerGrad} cx="50%" cy="35%" r="70%">
          <Stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <Stop offset="55%" stopColor={palette.petalMid} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={midGrad} cx="50%" cy="40%" r="65%">
          <Stop offset="0%" stopColor={palette.petalMid} stopOpacity="1" />
          <Stop offset="60%" stopColor={palette.petalDark} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={innerGrad} cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor={palette.petalDark} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx={cx} cy={cy} r={22} fill={`url(#${glow})`} />
      <Ellipse cx={cx + 0.6} cy={cy + 1.8} rx={18} ry={16} fill="rgba(80, 40, 50, 0.2)" />

      <G>
        {Array.from({ length: 7 }, (_, i) => {
          const angle = (360 / 7) * i + 12;
          return (
            <G key={`outer-${i}`}>
              <Path
                d={heartPetal(cx, cy, angle, outerLen, outerW)}
                fill={`url(#${outerGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.45}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              <Path
                d={cupCurl(cx, cy, angle, outerLen, outerW)}
                fill={palette.petalDeepest}
                fillOpacity={0.45}
              />
            </G>
          );
        })}
      </G>

      <G>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i + 30 + 12;
          return (
            <G key={`mid-${i}`}>
              <Path
                d={heartPetal(cx, cy, angle, midLen, midW)}
                fill={`url(#${midGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.6}
                strokeLinejoin="round"
              />
              <Path
                d={cupCurl(cx, cy, angle, midLen, midW)}
                fill={palette.petalDeepest}
                fillOpacity={0.5}
              />
            </G>
          );
        })}
      </G>

      <G>
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (360 / 5) * i + 24;
          return (
            <Path
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
      </G>

      <G>
        {Array.from({ length: 3 }, (_, i) => {
          const angle = i * 120 + 30;
          return (
            <Path
              key={`bud-${i}`}
              d={petalPath(cx, cy, angle, 4.2, 2.6, 0.25)}
              fill={palette.petalDeepest}
              fillOpacity={0.95}
            />
          );
        })}
      </G>
      <Circle cx={cx} cy={cy} r={1.2} fill={palette.center} />
    </G>
  );
}
