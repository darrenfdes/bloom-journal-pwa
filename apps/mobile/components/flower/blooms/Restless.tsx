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

function quill(cx: number, cy: number, angle: number, L: number, W: number): string {
  const a = (angle * Math.PI) / 180;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const place = (lx: number, ly: number) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  });
  const base = place(0, 0);
  const tip = place(0, -L);
  const c1R = place(W * 0.65, -L * 0.2);
  const c2R = place(W * 0.25, -L * 0.85);
  const c1L = place(-W * 0.25, -L * 0.85);
  const c2L = place(-W * 0.65, -L * 0.2);
  return `M ${base.x.toFixed(2)} ${base.y.toFixed(2)} C ${c1R.x.toFixed(2)} ${c1R.y.toFixed(2)} ${c2R.x.toFixed(2)} ${c2R.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} C ${c1L.x.toFixed(2)} ${c1L.y.toFixed(2)} ${c2L.x.toFixed(2)} ${c2L.y.toFixed(2)} ${base.x.toFixed(2)} ${base.y.toFixed(2)} Z`;
}

export function RestlessDahlia({ ns, palette, cx, cy }: BloomProps) {
  const backGrad = nsId(ns, 'backGrad');
  const midGrad = nsId(ns, 'midGrad');
  const innerGrad = nsId(ns, 'innerGrad');
  const tightGrad = nsId(ns, 'tightGrad');

  const backLen = 24;
  const backW = 2.8;
  const midLen = 18;
  const midW = 2.6;
  const innerLen = 12;
  const innerW = 2.2;
  const tightLen = 7;
  const tightW = 1.7;

  return (
    <G>
      <Defs>
        <LinearGradient id={backGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <Stop offset="55%" stopColor={palette.petalMid} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={midGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.petalMid} stopOpacity="1" />
          <Stop offset="80%" stopColor={palette.petalDark} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id={innerGrad} cx="50%" cy="40%" r="65%">
          <Stop offset="0%" stopColor={palette.petalDark} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={tightGrad} cx="50%" cy="50%" r="65%">
          <Stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="1" />
          <Stop offset="100%" stopColor={palette.center} stopOpacity="1" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={cx + 0.6} cy={cy + 1.5} rx={24} ry={22} fill="rgba(60, 24, 12, 0.22)" />

      <G>
        {Array.from({ length: 20 }, (_, i) => {
          const angle = (360 / 20) * i + 6;
          return (
            <Path
              key={`back-${i}`}
              d={quill(cx, cy, angle, backLen, backW)}
              fill={`url(#${backGrad})`}
              stroke={palette.petalDeepest}
              strokeWidth={0.3}
              strokeOpacity={0.45}
              strokeLinejoin="round"
            />
          );
        })}
      </G>

      <G>
        {Array.from({ length: 14 }, (_, i) => {
          const angle = (360 / 14) * i;
          const a = (angle * Math.PI) / 180;
          const veinTipX = cx + Math.sin(a) * midLen * 0.78;
          const veinTipY = cy - Math.cos(a) * midLen * 0.78;
          const veinBaseX = cx + Math.sin(a) * 2;
          const veinBaseY = cy - Math.cos(a) * 2;
          return (
            <G key={`mid-${i}`}>
              <Path
                d={quill(cx, cy, angle, midLen, midW)}
                fill={`url(#${midGrad})`}
                stroke={palette.petalDeepest}
                strokeWidth={0.3}
                strokeOpacity={0.55}
                strokeLinejoin="round"
              />
              <Line
                x1={veinBaseX}
                y1={veinBaseY}
                x2={veinTipX}
                y2={veinTipY}
                stroke={palette.petalHighlight}
                strokeWidth={0.4}
                strokeOpacity={0.6}
              />
            </G>
          );
        })}
      </G>

      <G>
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (360 / 10) * i + 18;
          return (
            <Path
              key={`inner-${i}`}
              d={quill(cx, cy, angle, innerLen, innerW)}
              fill={`url(#${innerGrad})`}
              stroke={palette.petalDeepest}
              strokeWidth={0.3}
              strokeOpacity={0.65}
              strokeLinejoin="round"
            />
          );
        })}
      </G>

      <G>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (360 / 8) * i + 22;
          return (
            <Path
              key={`tight-${i}`}
              d={quill(cx, cy, angle, tightLen, tightW)}
              fill={`url(#${tightGrad})`}
              stroke={palette.center}
              strokeWidth={0.25}
              strokeOpacity={0.7}
            />
          );
        })}
      </G>

      <G>
        {Array.from({ length: 9 }, (_, i) => {
          const angle = (360 / 9) * i;
          const a = (angle * Math.PI) / 180;
          const rx = cx + Math.sin(a) * 3.4;
          const ry = cy - Math.cos(a) * 3.4;
          return (
            <Circle
              key={`stamen-${i}`}
              cx={rx}
              cy={ry}
              r={0.7}
              fill={palette.pollen}
              fillOpacity={0.95}
            />
          );
        })}
      </G>
      <Circle cx={cx} cy={cy} r={1.6} fill={palette.center} />
    </G>
  );
}
