import React from 'react';

import { nsId } from '@/components/flower/blooms/bloomTypes';
import { petalPath } from '@/components/flower/petalPathHelpers';
import { PUMPKIN_PALETTE } from '@bloom/core/flowers/moodPalettes';

export interface PumpkinProps {
  ns: string;
  seed: number;
  cx: number;
  cy: number;
  stage: 0 | 1 | 2;
}

const PETAL_COUNT = 5;
/** Ripe pumpkin body radius; bottom sits at viewBox stem base (y=138). */
const RIPE_FRUIT_RY = 17.5;

export function Pumpkin({ ns, seed: _seed, cx, cy, stage }: PumpkinProps) {
  const petalGrad = nsId(ns, 'pumpkinPetal');
  const throatGrad = nsId(ns, 'pumpkinThroat');
  const fruitGrad = nsId(ns, 'pumpkinFruit');
  const ribShade = nsId(ns, 'pumpkinRib');

  return (
    <g>
      <defs>
        <linearGradient id={petalGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.petalHighlight} />
          <stop offset="55%" stopColor={PUMPKIN_PALETTE.petalMid} />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.petalDark} />
        </linearGradient>
        <radialGradient id={throatGrad} cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitDark} />
          <stop offset="60%" stopColor={PUMPKIN_PALETTE.petalDark} />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDeepest} />
        </radialGradient>
        <radialGradient id={fruitGrad} cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitHighlight} />
          <stop offset="55%" stopColor={PUMPKIN_PALETTE.fruitMid} />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDark} />
        </radialGradient>
        <linearGradient id={ribShade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitDeepest} stopOpacity="0.55" />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDeepest} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {stage === 0 ? <PumpkinFlower cx={cx} cy={cy} petalGrad={petalGrad} throatGrad={throatGrad} /> : null}
      {stage === 1 ? (
        <PumpkinFruiting
          cx={cx}
          cy={cy}
          petalGrad={petalGrad}
          throatGrad={throatGrad}
          fruitGrad={fruitGrad}
          ribShade={ribShade}
        />
      ) : null}
      {stage === 2 ? (
        <PumpkinRipe cx={cx} fruitGrad={fruitGrad} ribShade={ribShade} stemBaseY={138} />
      ) : null}
    </g>
  );
}

function PumpkinFlower({
  cx,
  cy,
  petalGrad,
  throatGrad,
}: {
  cx: number;
  cy: number;
  petalGrad: string;
  throatGrad: string;
}) {
  const backLen = 24;
  const backW = 12;
  const frontLen = 21;
  const frontW = 10.5;

  return (
    <g>
      <ellipse cx={cx + 0.4} cy={cy + 2} rx={26} ry={22} fill="rgba(40, 32, 22, 0.18)" />

      <g>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i + 36;
          return (
            <path
              key={`back-${i}`}
              d={petalPath(cx, cy, angle, backLen, backW, 0)}
              fill={`url(#${petalGrad})`}
              fillOpacity={0.92}
              stroke={PUMPKIN_PALETTE.petalDark}
              strokeWidth={0.5}
              strokeOpacity={0.55}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      <g>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i;
          const a = (angle * Math.PI) / 180;
          const veinTipX = cx + Math.sin(a) * frontLen * 0.82;
          const veinTipY = cy - Math.cos(a) * frontLen * 0.82;
          const veinBaseX = cx + Math.sin(a) * 3;
          const veinBaseY = cy - Math.cos(a) * 3;
          return (
            <g key={`front-${i}`}>
              <path
                d={petalPath(cx, cy, angle, frontLen, frontW, 0)}
                fill={`url(#${petalGrad})`}
                stroke={PUMPKIN_PALETTE.petalDark}
                strokeWidth={0.55}
                strokeOpacity={0.6}
                strokeLinejoin="round"
              />
              <line
                x1={veinBaseX}
                y1={veinBaseY}
                x2={veinTipX}
                y2={veinTipY}
                stroke={PUMPKIN_PALETTE.petalDark}
                strokeWidth={0.45}
                strokeOpacity={0.4}
              />
            </g>
          );
        })}
      </g>

      <circle cx={cx} cy={cy} r={6.2} fill={`url(#${throatGrad})`} />
      <circle cx={cx} cy={cy} r={2.4} fill={PUMPKIN_PALETTE.fruitDeepest} fillOpacity={0.7} />

      <g>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i + 36;
          const a = (angle * Math.PI) / 180;
          const tipX = cx + Math.sin(a) * 14;
          const tipY = cy - Math.cos(a) * 14;
          const baseX = cx + Math.sin(a) * 9;
          const baseY = cy - Math.cos(a) * 9;
          return (
            <path
              key={`sepal-${i}`}
              d={`M ${baseX.toFixed(2)} ${baseY.toFixed(2)} Q ${((baseX + tipX) / 2).toFixed(2)} ${((baseY + tipY) / 2 + 0.6).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`}
              stroke={PUMPKIN_PALETTE.leaf}
              strokeWidth={1.4}
              strokeOpacity={0.7}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </g>
  );
}

function PumpkinFruiting({
  cx,
  cy,
  petalGrad,
  throatGrad,
  fruitGrad,
  ribShade,
}: {
  cx: number;
  cy: number;
  petalGrad: string;
  throatGrad: string;
  fruitGrad: string;
  ribShade: string;
}) {
  const flowerCx = cx;
  const flowerCy = cy - 6;
  const fruitCx = cx;
  const fruitCy = cy + 6;
  const fruitRx = 11;
  const fruitRy = 8.5;

  return (
    <g>
      <ellipse cx={fruitCx + 0.5} cy={fruitCy + 3} rx={fruitRx + 1.5} ry={fruitRy * 0.45} fill="rgba(40, 32, 22, 0.18)" />

      <g opacity={0.78}>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i;
          return (
            <path
              key={`fade-petal-${i}`}
              d={petalPath(flowerCx, flowerCy, angle, 13, 7, 0)}
              fill={`url(#${petalGrad})`}
              fillOpacity={0.82}
              stroke={PUMPKIN_PALETTE.petalDark}
              strokeWidth={0.4}
              strokeOpacity={0.45}
              strokeLinejoin="round"
            />
          );
        })}
        <circle cx={flowerCx} cy={flowerCy} r={3.2} fill={`url(#${throatGrad})`} />
      </g>

      <ellipse cx={fruitCx} cy={fruitCy} rx={fruitRx} ry={fruitRy} fill={`url(#${fruitGrad})`} stroke={PUMPKIN_PALETTE.fruitDark} strokeWidth={0.4} />

      {[-0.55, 0, 0.55].map((offsetFrac, i) => {
        const ribX = fruitCx + offsetFrac * fruitRx;
        const dx = (ribX - fruitCx) * 0.75;
        return (
          <path
            key={`rib-${i}`}
            d={`M ${ribX.toFixed(2)} ${(fruitCy - fruitRy + 0.3).toFixed(2)} Q ${(ribX + dx * 0.3).toFixed(2)} ${fruitCy.toFixed(2)} ${ribX.toFixed(2)} ${(fruitCy + fruitRy - 0.3).toFixed(2)}`}
            stroke={`url(#${ribShade})`}
            strokeWidth={0.7}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}

      <ellipse cx={fruitCx - fruitRx * 0.45} cy={fruitCy - fruitRy * 0.5} rx={2.4} ry={1.1} fill={PUMPKIN_PALETTE.fruitHighlight} fillOpacity={0.55} />

      <rect
        x={fruitCx - 1.4}
        y={fruitCy - fruitRy - 2.6}
        width={2.8}
        height={3.2}
        rx={0.8}
        fill={PUMPKIN_PALETTE.stemBrown}
      />
    </g>
  );
}

function PumpkinRipe({
  cx,
  fruitGrad,
  ribShade,
  stemBaseY,
}: {
  cx: number;
  fruitGrad: string;
  ribShade: string;
  stemBaseY: number;
}) {
  const fruitCx = cx;
  const fruitCy = stemBaseY - RIPE_FRUIT_RY;
  const fruitRx = 22;

  const fruitTop = fruitCy - RIPE_FRUIT_RY;
  const fruitBottom = stemBaseY;

  return (
    <g>
      <ellipse cx={fruitCx + 0.8} cy={fruitBottom - 1} rx={fruitRx + 1.2} ry={RIPE_FRUIT_RY * 0.22} fill="rgba(40, 32, 22, 0.22)" />

      {/* Vine from ground into the pumpkin base */}
      <path
        d={`M ${fruitCx.toFixed(2)} ${stemBaseY.toFixed(2)}
            C ${(fruitCx + 5).toFixed(2)} ${(fruitBottom - 8).toFixed(2)} ${(fruitCx + 4).toFixed(2)} ${(fruitCy + 6).toFixed(2)} ${(fruitCx + 1).toFixed(2)} ${(fruitBottom - 3).toFixed(2)}`}
        stroke={PUMPKIN_PALETTE.stemBrown}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${fruitCx.toFixed(2)} ${stemBaseY.toFixed(2)}
            C ${(fruitCx - 4).toFixed(2)} ${(fruitBottom - 10).toFixed(2)} ${(fruitCx - 2).toFixed(2)} ${(fruitCy + 4).toFixed(2)} ${fruitCx.toFixed(2)} ${(fruitBottom - 2).toFixed(2)}`}
        stroke={PUMPKIN_PALETTE.stemBrown}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.85}
      />

      <ellipse cx={fruitCx - fruitRx * 0.62} cy={fruitCy} rx={fruitRx * 0.5} ry={RIPE_FRUIT_RY} fill={`url(#${fruitGrad})`} fillOpacity={0.92} />
      <ellipse cx={fruitCx + fruitRx * 0.62} cy={fruitCy} rx={fruitRx * 0.5} ry={RIPE_FRUIT_RY} fill={`url(#${fruitGrad})`} fillOpacity={0.92} />
      <ellipse cx={fruitCx - fruitRx * 0.32} cy={fruitCy} rx={fruitRx * 0.55} ry={RIPE_FRUIT_RY * 0.99} fill={`url(#${fruitGrad})`} fillOpacity={0.96} />
      <ellipse cx={fruitCx + fruitRx * 0.32} cy={fruitCy} rx={fruitRx * 0.55} ry={RIPE_FRUIT_RY * 0.99} fill={`url(#${fruitGrad})`} fillOpacity={0.96} />
      <ellipse cx={fruitCx} cy={fruitCy} rx={fruitRx * 0.6} ry={RIPE_FRUIT_RY} fill={`url(#${fruitGrad})`} />

      {[-0.78, -0.42, 0, 0.42, 0.78].map((offsetFrac, i) => {
        const ribX = fruitCx + offsetFrac * fruitRx;
        return (
          <path
            key={`rib-${i}`}
            d={`M ${ribX.toFixed(2)} ${(fruitTop + 0.6).toFixed(2)} Q ${(ribX + offsetFrac * 1.6).toFixed(2)} ${fruitCy.toFixed(2)} ${ribX.toFixed(2)} ${(fruitBottom - 0.6).toFixed(2)}`}
            stroke={`url(#${ribShade})`}
            strokeWidth={0.9}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}

      <ellipse cx={fruitCx - fruitRx * 0.42} cy={fruitTop + RIPE_FRUIT_RY * 0.45} rx={4.2} ry={1.6} fill={PUMPKIN_PALETTE.fruitHighlight} fillOpacity={0.55} />

      {/* Brown peduncle stem on top */}
      <path
        d={`M ${(fruitCx - 2).toFixed(2)} ${(fruitTop + 1).toFixed(2)}
            C ${(fruitCx - 2.5).toFixed(2)} ${(fruitTop - 5).toFixed(2)} ${(fruitCx + 1.5).toFixed(2)} ${(fruitTop - 7).toFixed(2)} ${(fruitCx + 2).toFixed(2)} ${(fruitTop - 1).toFixed(2)}
            L ${(fruitCx + 1.2).toFixed(2)} ${(fruitTop + 1.5).toFixed(2)} Z`}
        fill={PUMPKIN_PALETTE.stemBrown}
        stroke={PUMPKIN_PALETTE.fruitDeepest}
        strokeWidth={0.45}
        strokeLinejoin="round"
      />
      <rect
        x={fruitCx - 1.1}
        y={fruitTop - 9}
        width={2.2}
        height={5}
        rx={0.7}
        fill={PUMPKIN_PALETTE.stemBrown}
      />
    </g>
  );
}
