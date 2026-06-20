import React from 'react';
import { G, Defs, RadialGradient, Stop, Ellipse, Path, Circle, Line } from 'react-native-svg';

import { rosePetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@/lib/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

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
    <G>
      <Defs>
        <RadialGradient id={petalGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={len + 4}>
          <Stop offset="0%" stopColor={palette.petalDeepest} />
          <Stop offset="26%" stopColor={palette.petalDark} />
          <Stop offset="68%" stopColor={palette.petalMid} />
          <Stop offset="100%" stopColor={palette.petalHighlight} />
        </RadialGradient>
        <RadialGradient id={blotchGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={11}>
          <Stop offset="0%" stopColor={palette.center} />
          <Stop offset="70%" stopColor={palette.petalDeepest} />
          <Stop offset="100%" stopColor="rgba(60, 18, 8, 0)" />
        </RadialGradient>
        <RadialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <Stop offset="0%" stopColor={palette.petalDeepest} />
          <Stop offset="100%" stopColor={palette.center} />
        </RadialGradient>
        <RadialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(60, 18, 8, 0.2)" />
          <Stop offset="70%" stopColor="rgba(60, 18, 8, 0.08)" />
          <Stop offset="100%" stopColor="rgba(60, 18, 8, 0)" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.8} cy={cy + 2.6} rx={26} ry={22} fill={`url(#${shadowGrad})`} />

      <G>
        {jitter.map((j, i) => {
          const angle = (360 / count) * i + j.dAngle;
          return (
            <Path
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
      </G>

      <Circle cx={cx} cy={cy} r={11} fill={`url(#${blotchGrad})`} />

      <G>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (360 / 16) * i + (rng() * 2 - 1) * 4;
          const a = (angle * Math.PI) / 180;
          const reach = 6.6 + rng() * 1.8;
          const tipX = cx + Math.sin(a) * reach;
          const tipY = cy - Math.cos(a) * reach;
          return (
            <G key={`stamen-${i}`}>
              <Line
                x1={cx + Math.sin(a) * 3.4}
                y1={cy - Math.cos(a) * 3.4}
                x2={tipX}
                y2={tipY}
                stroke={palette.center}
                strokeWidth={0.5}
                strokeOpacity={0.8}
                strokeLinecap="round"
              />
              <Circle cx={tipX} cy={tipY} r={0.85} fill={palette.petalDeepest} />
            </G>
          );
        })}
      </G>
      <Circle cx={cx} cy={cy} r={4} fill={`url(#${centerGrad})`} />
      <Circle cx={cx} cy={cy} r={4} fill="none" stroke={palette.petalDark} strokeWidth={0.5} strokeOpacity={0.6} />
      <G>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (360 / 8) * i;
          const a = (angle * Math.PI) / 180;
          return (
            <Line
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
      </G>
    </G>
  );
}
