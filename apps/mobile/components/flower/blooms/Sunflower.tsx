import React from 'react';
import { G, Defs, RadialGradient, Stop, Ellipse, Path, Line, Circle } from 'react-native-svg';

import { petalPath, rimHighlight } from '@/components/flower/petalPathHelpers';
import { createRng } from '@/lib/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

const GOLDEN_ANGLE = 137.50776;

export function SunflowerBloom({ ns, palette, seed, cx, cy }: BloomProps) {
  const petalGrad = nsId(ns, 'petalGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const shadowGrad = nsId(ns, 'shadowGrad');
  const rng = createRng(seed ^ 0x5b1f10);

  const backCount = 20;
  const frontCount = 16;
  const backLen = 25;
  const backW = 4.6;
  const frontLen = 27.5;
  const frontW = 6;
  const discR = 11;

  const backJitter = Array.from({ length: backCount }, () => ({
    dAngle: (rng() * 2 - 1) * 3.5,
    dLen: 1 + (rng() * 2 - 1) * 0.07,
  }));
  const frontJitter = Array.from({ length: frontCount }, () => ({
    dAngle: (rng() * 2 - 1) * 3,
    dLen: 1 + (rng() * 2 - 1) * 0.06,
  }));

  return (
    <G>
      <Defs>
        <RadialGradient id={petalGrad} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={frontLen + 4}>
          <Stop offset="0%" stopColor={palette.petalDark} />
          <Stop offset="32%" stopColor={palette.petalMid} />
          <Stop offset="74%" stopColor={palette.petalWash} />
          <Stop offset="100%" stopColor={palette.petalHighlight} />
        </RadialGradient>
        <RadialGradient id={centerGrad} cx="40%" cy="34%" r="74%">
          <Stop offset="0%" stopColor={palette.petalDeepest} />
          <Stop offset="55%" stopColor="#6E4A1C" />
          <Stop offset="100%" stopColor={palette.center} />
        </RadialGradient>
        <RadialGradient id={shadowGrad} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(60, 40, 12, 0.2)" />
          <Stop offset="70%" stopColor="rgba(60, 40, 12, 0.08)" />
          <Stop offset="100%" stopColor="rgba(60, 40, 12, 0)" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.8} cy={cy + 2.6} rx={30} ry={26} fill={`url(#${shadowGrad})`} />

      <G>
        {backJitter.map((j, i) => {
          const angle = (360 / backCount) * i + 11 + j.dAngle;
          return (
            <Path
              key={`back-${i}`}
              d={petalPath(cx, cy, angle, backLen * j.dLen, backW, 0.05)}
              fill={`url(#${petalGrad})`}
              fillOpacity={0.9}
              stroke={palette.petalDeepest}
              strokeWidth={0.35}
              strokeOpacity={0.4}
              strokeLinejoin="round"
            />
          );
        })}
      </G>

      <G>
        {frontJitter.map((j, i) => {
          const angle = (360 / frontCount) * i + j.dAngle;
          const len = frontLen * j.dLen;
          const a = (angle * Math.PI) / 180;
          return (
            <G key={`front-${i}`}>
              <Path
                d={petalPath(cx, cy, angle, len, frontW, 0.04)}
                fill={`url(#${petalGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.32}
                strokeLinejoin="round"
              />
              <Line
                x1={cx + Math.sin(a) * (discR - 2)}
                y1={cy - Math.cos(a) * (discR - 2)}
                x2={cx + Math.sin(a) * len * 0.78}
                y2={cy - Math.cos(a) * len * 0.78}
                stroke={palette.petalDark}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
              <Path d={rimHighlight(cx, cy, angle, len, frontW)} fill="#FFFFFF" fillOpacity={0.3} />
            </G>
          );
        })}
      </G>

      <Circle cx={cx} cy={cy} r={discR} fill={`url(#${centerGrad})`} />
      <Circle cx={cx} cy={cy} r={discR} fill="none" stroke={palette.center} strokeWidth={0.7} strokeOpacity={0.55} />
      <G>
        {Array.from({ length: 90 }, (_, i) => {
          const r = Math.sqrt(i + 0.6) * 1.18;
          if (r > discR - 0.8) return null;
          const theta = ((i * GOLDEN_ANGLE) * Math.PI) / 180;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          const tone = i % 4 === 0 ? palette.pollen : i % 2 === 0 ? palette.petalDeepest : palette.center;
          return <Circle key={`seed-${i}`} cx={px} cy={py} r={0.52 + (r / discR) * 0.3} fill={tone} fillOpacity={0.92} />;
        })}
      </G>
      <Ellipse cx={cx - 3.2} cy={cy - 3.8} rx={3.4} ry={2} fill="#FFFFFF" fillOpacity={0.3} />
    </G>
  );
}
