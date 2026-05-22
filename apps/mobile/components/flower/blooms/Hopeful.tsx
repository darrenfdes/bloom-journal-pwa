import React from 'react';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Line,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

export function HopefulTulip({ ns, palette, cx, cy }: BloomProps) {
  const outerGrad = nsId(ns, 'outerGrad');
  const innerDepth = nsId(ns, 'innerDepth');
  const backGrad = nsId(ns, 'backGrad');
  const blush = nsId(ns, 'blush');

  const H = 28;
  const W = 13;

  const baseY = cy + H * 0.55;
  const topY = cy - H * 0.45;
  const leftX = cx - W;
  const rightX = cx + W;

  const backPetal = (side: number) => {
    const x0 = cx + side * W * 0.55;
    const y0 = baseY - 2;
    const tipX = cx + side * W * 0.35;
    const tipY = topY + 4;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} C ${(x0 + side * W * 0.5).toFixed(2)} ${(baseY - H * 0.6).toFixed(2)} ${(tipX + side * W * 0.3).toFixed(2)} ${(topY + H * 0.1).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)} C ${(tipX - side * W * 0.2).toFixed(2)} ${(topY + H * 0.3).toFixed(2)} ${(x0 - side * W * 0.05).toFixed(2)} ${(y0 - H * 0.2).toFixed(2)} ${x0.toFixed(2)} ${y0.toFixed(2)} Z`;
  };

  const sidePetal = (side: number) => {
    const innerX = cx + side * 1.5;
    const outerX = cx + side * W * 0.95;
    const tipX = cx + side * W * 0.55;
    return `M ${innerX.toFixed(2)} ${baseY.toFixed(2)}
            C ${(outerX).toFixed(2)} ${(baseY - H * 0.2).toFixed(2)} ${(outerX + side * 1.5).toFixed(2)} ${(baseY - H * 0.55).toFixed(2)} ${(tipX + side * 1.2).toFixed(2)} ${(topY + H * 0.05).toFixed(2)}
            C ${(tipX + side * 2).toFixed(2)} ${(topY - 1).toFixed(2)} ${(tipX - side * 2).toFixed(2)} ${(topY - 1).toFixed(2)} ${(tipX).toFixed(2)} ${(topY + H * 0.05).toFixed(2)}
            C ${(cx).toFixed(2)} ${(topY + H * 0.55).toFixed(2)} ${(innerX).toFixed(2)} ${(baseY - H * 0.2).toFixed(2)} ${innerX.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  const frontPetal = () => {
    return `M ${cx.toFixed(2)} ${baseY.toFixed(2)}
            C ${(cx + W * 0.85).toFixed(2)} ${(baseY - H * 0.15).toFixed(2)} ${(cx + W * 0.95).toFixed(2)} ${(baseY - H * 0.55).toFixed(2)} ${(cx + W * 0.45).toFixed(2)} ${(topY + H * 0.1).toFixed(2)}
            C ${(cx + W * 0.25).toFixed(2)} ${(topY).toFixed(2)} ${(cx - W * 0.25).toFixed(2)} ${(topY).toFixed(2)} ${(cx - W * 0.45).toFixed(2)} ${(topY + H * 0.1).toFixed(2)}
            C ${(cx - W * 0.95).toFixed(2)} ${(baseY - H * 0.55).toFixed(2)} ${(cx - W * 0.85).toFixed(2)} ${(baseY - H * 0.15).toFixed(2)} ${cx.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  return (
    <G>
      <Defs>
        <LinearGradient id={outerGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <Stop offset="40%" stopColor={palette.petalMid} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id={innerDepth} cx="50%" cy="20%" r="80%">
          <Stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.85" />
          <Stop offset="55%" stopColor={palette.petalDark} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={backGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalWash} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id={blush} cx="50%" cy="80%" r="60%">
          <Stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.5} cy={baseY + 1.2} rx={W * 0.85} ry={3} fill="rgba(40, 50, 30, 0.22)" />

      <Path d={backPetal(-1)} fill={`url(#${backGrad})`} fillOpacity={0.85} />
      <Path d={backPetal(1)} fill={`url(#${backGrad})`} fillOpacity={0.85} />

      <Path
        d={sidePetal(-1)}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.55}
        strokeLinejoin="round"
      />
      <Path
        d={sidePetal(1)}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.55}
        strokeLinejoin="round"
      />

      <Path
        d={`M ${(cx - W * 0.5).toFixed(2)} ${(topY + H * 0.18).toFixed(2)} Q ${(cx - W * 0.7).toFixed(2)} ${(topY + 1).toFixed(2)} ${(cx - W * 0.35).toFixed(2)} ${(topY).toFixed(2)}`}
        fill={palette.petalDeepest}
        fillOpacity={0.5}
      />
      <Path
        d={`M ${(cx + W * 0.5).toFixed(2)} ${(topY + H * 0.18).toFixed(2)} Q ${(cx + W * 0.7).toFixed(2)} ${(topY + 1).toFixed(2)} ${(cx + W * 0.35).toFixed(2)} ${(topY).toFixed(2)}`}
        fill={palette.petalDeepest}
        fillOpacity={0.5}
      />

      <Path
        d={frontPetal()}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.5}
        strokeOpacity={0.6}
        strokeLinejoin="round"
      />
      <Path d={frontPetal()} fill={`url(#${innerDepth})`} fillOpacity={0.85} />

      <Line
        x1={cx}
        y1={topY + H * 0.1}
        x2={cx}
        y2={baseY - 1}
        stroke={palette.petalDeepest}
        strokeWidth={0.6}
        strokeOpacity={0.45}
      />
      <Path
        d={`M ${(cx - 4).toFixed(2)} ${(baseY - 3).toFixed(2)} Q ${(cx - 2).toFixed(2)} ${(cy + 4).toFixed(2)} ${cx.toFixed(2)} ${(topY + 6).toFixed(2)}`}
        stroke={palette.petalDeepest}
        strokeWidth={0.4}
        strokeOpacity={0.35}
        fill="none"
      />
      <Path
        d={`M ${(cx + 4).toFixed(2)} ${(baseY - 3).toFixed(2)} Q ${(cx + 2).toFixed(2)} ${(cy + 4).toFixed(2)} ${cx.toFixed(2)} ${(topY + 6).toFixed(2)}`}
        stroke={palette.petalDeepest}
        strokeWidth={0.4}
        strokeOpacity={0.35}
        fill="none"
      />

      <Ellipse cx={cx} cy={baseY - 2} rx={W * 0.55} ry={3.5} fill={`url(#${blush})`} />

      <G>
        {[-1, 0, 1].map((side, i) => {
          const sx = cx + side * 3;
          const sBase = topY + H * 0.25;
          const sTip = topY + H * 0.05;
          return (
            <G key={`stamen-${i}`}>
              <Line
                x1={sx}
                y1={sBase}
                x2={sx}
                y2={sTip}
                stroke={palette.petalDeepest}
                strokeWidth={0.4}
                strokeOpacity={0.9}
              />
              <Ellipse cx={sx} cy={sTip} rx={0.75} ry={1.1} fill={palette.pollen} />
            </G>
          );
        })}
      </G>
    </G>
  );
}
