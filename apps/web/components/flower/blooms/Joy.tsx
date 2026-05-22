import React from 'react';

import { heartPetal, petalPath } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

export function JoyDaisy({ ns, palette, seed, cx, cy }: BloomProps) {
  const petalGrad = nsId(ns, 'petalGrad');
  const centerGrad = nsId(ns, 'centerGrad');
  const dropShadow = nsId(ns, 'drop');
  const rng = createRng(seed ^ 0x10d215);

  const backCount = 16;
  const frontCount = 10;
  const backLen = 22;
  const backW = 3.6;
  const frontLen = 24;
  const frontW = 7.5;

  return (
    <g>
      <defs>
        <linearGradient id={petalGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <stop offset="35%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="70%" stopColor={palette.petalWash} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </linearGradient>
        <radialGradient id={centerGrad} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <stop offset="35%" stopColor={palette.pollen} stopOpacity="1" />
          <stop offset="70%" stopColor={palette.petalDeepest} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.center} stopOpacity="1" />
        </radialGradient>
        <filter id={dropShadow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
          <feOffset dx="0.5" dy="1.2" result="offsetBlur" />
          <feMerge>
            <feMergeNode in="offsetBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx={cx + 0.6} cy={cy + 2} rx={26} ry={24} fill="rgba(40, 32, 22, 0.18)" />

      <g>
        {Array.from({ length: backCount }, (_, i) => {
          const angle = (360 / backCount) * i + 11;
          return (
            <path
              key={`back-${i}`}
              d={petalPath(cx, cy, angle, backLen, backW, 0)}
              fill={`url(#${petalGrad})`}
              fillOpacity={0.92}
              stroke={palette.petalDeepest}
              strokeWidth={0.35}
              strokeOpacity={0.45}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      <g>
        {Array.from({ length: frontCount }, (_, i) => {
          const angle = (360 / frontCount) * i;
          return (
            <g key={`front-${i}`}>
              <path
                d={heartPetal(cx, cy, angle, frontLen, frontW)}
                fill={`url(#${petalGrad})`}
                fillOpacity={1}
                stroke={palette.petalDeepest}
                strokeWidth={0.5}
                strokeOpacity={0.5}
                strokeLinejoin="round"
              />
              {(() => {
                const a = (angle * Math.PI) / 180;
                const veinTipX = cx + Math.sin(a) * frontLen * 0.78;
                const veinTipY = cy - Math.cos(a) * frontLen * 0.78;
                const veinBaseX = cx + Math.sin(a) * 2;
                const veinBaseY = cy - Math.cos(a) * 2;
                return (
                  <line
                    x1={veinBaseX}
                    y1={veinBaseY}
                    x2={veinTipX}
                    y2={veinTipY}
                    stroke={palette.petalDeepest}
                    strokeWidth={0.4}
                    strokeOpacity={0.35}
                  />
                );
              })()}
              {(() => {
                const a = (angle * Math.PI) / 180;
                const cuX = cx + Math.sin(a) * frontLen * 0.5 + Math.cos(a) * 1.2;
                const cuY = cy - Math.cos(a) * frontLen * 0.5 + Math.sin(a) * 1.2;
                return (
                  <ellipse
                    cx={cuX}
                    cy={cuY}
                    rx={2.6}
                    ry={0.7}
                    fill={palette.petalHighlight}
                    fillOpacity={0.45}
                  />
                );
              })()}
            </g>
          );
        })}
      </g>

      <circle cx={cx} cy={cy} r={8.5} fill={`url(#${centerGrad})`} />
      <ellipse cx={cx - 1.4} cy={cy - 2} rx={2.8} ry={1.4} fill="#FFFFFF" fillOpacity={0.55} />

      <g>
        {Array.from({ length: 38 }, (_, i) => {
          const r = Math.sqrt(rng()) * 6.2;
          const theta = rng() * Math.PI * 2;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          return (
            <circle
              key={`pollen-${i}`}
              cx={px}
              cy={py}
              r={0.55 + rng() * 0.4}
              fill={i % 3 === 0 ? palette.petalDeepest : palette.pollen}
              fillOpacity={0.85}
            />
          );
        })}
      </g>

      <g>
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (360 / 6) * i + 30;
          const a = (angle * Math.PI) / 180;
          const baseX = cx + Math.sin(a) * 5;
          const baseY = cy - Math.cos(a) * 5;
          const tipX = cx + Math.sin(a) * 10.5;
          const tipY = cy - Math.cos(a) * 10.5;
          return (
            <g key={`stamen-${i}`}>
              <line
                x1={baseX}
                y1={baseY}
                x2={tipX}
                y2={tipY}
                stroke={palette.petalDeepest}
                strokeWidth={0.55}
                strokeOpacity={0.85}
                strokeLinecap="round"
              />
              <circle cx={tipX} cy={tipY} r={0.9} fill={palette.pollen} />
            </g>
          );
        })}
      </g>
    </g>
  );
}
