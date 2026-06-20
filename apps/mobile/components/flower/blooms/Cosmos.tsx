import React from 'react';
import { G, Defs, RadialGradient, Stop, Ellipse, Path, Line, Circle } from 'react-native-svg';

import { roundedPetal, rimHighlight } from '@/components/flower/petalPathHelpers';
import { createRng } from '@/lib/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

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
    <G>
      <Defs>
        <RadialGradient id={petalGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={len + 4}>
          <Stop offset="0%" stopColor={palette.petalWash} />
          <Stop offset="46%" stopColor={palette.petalMid} />
          <Stop offset="100%" stopColor={palette.petalHighlight} />
        </RadialGradient>
        <RadialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <Stop offset="0%" stopColor={palette.pollen} />
          <Stop offset="60%" stopColor={palette.center} />
          <Stop offset="100%" stopColor={palette.petalDeepest} />
        </RadialGradient>
        <RadialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(40, 50, 80, 0.16)" />
          <Stop offset="70%" stopColor="rgba(40, 50, 80, 0.06)" />
          <Stop offset="100%" stopColor="rgba(40, 50, 80, 0)" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.6} cy={cy + 2.2} rx={24} ry={21} fill={`url(#${shadowGrad})`} />

      <G>
        {jitter.map((j, i) => {
          const angle = (360 / count) * i + j.dAngle;
          const petLen = len * j.dLen;
          const a = (angle * Math.PI) / 180;
          return (
            <G key={`petal-${i}`}>
              <Path
                d={roundedPetal(cx, cy, angle, petLen, w, 0.04)}
                fill={`url(#${petalGrad})`}
                stroke={palette.petalDark}
                strokeWidth={0.4}
                strokeOpacity={0.35}
                strokeLinejoin="round"
              />
              <Line
                x1={cx + Math.sin(a) * 5}
                y1={cy - Math.cos(a) * 5}
                x2={cx + Math.sin(a) * petLen * 0.72}
                y2={cy - Math.cos(a) * petLen * 0.72}
                stroke={palette.petalDark}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
              <Path d={rimHighlight(cx, cy, angle, petLen, w)} fill="#FFFFFF" fillOpacity={0.34} />
            </G>
          );
        })}
      </G>

      <Circle cx={cx} cy={cy} r={5.4} fill={`url(#${centerGrad})`} />
      <G>
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (360 / 10) * i + 6 + (rng() * 2 - 1) * 5;
          const a = (angle * Math.PI) / 180;
          const reach = 6.4 + rng() * 1.2;
          return (
            <Circle
              key={`stamen-${i}`}
              cx={cx + Math.sin(a) * reach}
              cy={cy - Math.cos(a) * reach}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </G>
      <Ellipse cx={cx - 1.6} cy={cy - 1.8} rx={1.8} ry={1.1} fill="#FFFFFF" fillOpacity={0.45} />
    </G>
  );
}
