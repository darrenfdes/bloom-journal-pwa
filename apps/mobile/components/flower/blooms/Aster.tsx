import React from 'react';
import { G, Defs, LinearGradient, Stop, RadialGradient, Ellipse, Path, Circle } from 'react-native-svg';

import { quillPetal } from '@/components/flower/petalPathHelpers';
import { createRng } from '@/lib/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

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
    <G>
      <Defs>
        <LinearGradient id={backGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalHighlight} />
          <Stop offset="55%" stopColor={palette.petalMid} />
          <Stop offset="100%" stopColor={palette.petalDark} />
        </LinearGradient>
        <LinearGradient id={midGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalMid} />
          <Stop offset="80%" stopColor={palette.petalDark} />
          <Stop offset="100%" stopColor={palette.petalDeepest} />
        </LinearGradient>
        <RadialGradient id={innerGrad} cx="50%" cy="42%" r="65%">
          <Stop offset="0%" stopColor={palette.petalDark} />
          <Stop offset="100%" stopColor={palette.petalDeepest} />
        </RadialGradient>
        <RadialGradient id={centerGrad} cx="42%" cy="36%" r="70%">
          <Stop offset="0%" stopColor={palette.pollen} />
          <Stop offset="65%" stopColor={palette.center} />
          <Stop offset="100%" stopColor={palette.petalDeepest} />
        </RadialGradient>
        <RadialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(50, 30, 50, 0.16)" />
          <Stop offset="70%" stopColor="rgba(50, 30, 50, 0.06)" />
          <Stop offset="100%" stopColor="rgba(50, 30, 50, 0)" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.6} cy={cy + 2.2} rx={24} ry={21} fill={`url(#${shadowGrad})`} />

      {rings.map((ring, ringIdx) => (
        <G key={`ring-${ringIdx}`}>
          {Array.from({ length: ring.count }, (_, i) => {
            const jitterA = (rng() * 2 - 1) * 5;
            const jitterL = 1 + (rng() * 2 - 1) * 0.12;
            const twist = (i % 2 === 0 ? 1 : -1) * (0.12 + rng() * 0.18);
            const angle = (360 / ring.count) * i + ring.offset + jitterA;
            return (
              <Path
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
        </G>
      ))}

      <Circle cx={cx} cy={cy} r={4.4} fill={`url(#${centerGrad})`} />
      <G>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (360 / 8) * i + 12;
          const a = (angle * Math.PI) / 180;
          return (
            <Circle
              key={`stamen-${i}`}
              cx={cx + Math.sin(a) * 3}
              cy={cy - Math.cos(a) * 3}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </G>
      <Circle cx={cx - 1} cy={cy - 1} r={0.9} fill="#FFFFFF" fillOpacity={0.55} />
    </G>
  );
}
