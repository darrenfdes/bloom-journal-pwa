import React from 'react';

import { nsId } from '@/components/flower/blooms/bloomTypes';
import { petalPath } from '@/components/flower/petalPathHelpers';
import { createRng } from '@bloom/core/flowers/prng';
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

export function Pumpkin({ ns, seed, cx, cy, stage }: PumpkinProps) {
  const petalGrad = nsId(ns, 'pumpkinPetal');
  const throatGrad = nsId(ns, 'pumpkinThroat');
  const fruitGrad = nsId(ns, 'pumpkinFruit');
  const lobeGrad = nsId(ns, 'pumpkinLobe');
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
        <radialGradient id={fruitGrad} cx="36%" cy="28%" r="80%">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitHighlight} />
          <stop offset="52%" stopColor={PUMPKIN_PALETTE.fruitMid} />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDark} />
        </radialGradient>
        <radialGradient id={lobeGrad} cx="42%" cy="26%" r="85%">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitHighlight} />
          <stop offset="45%" stopColor={PUMPKIN_PALETTE.fruitMid} />
          <stop offset="88%" stopColor={PUMPKIN_PALETTE.fruitDark} />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDeepest} />
        </radialGradient>
        <linearGradient id={ribShade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PUMPKIN_PALETTE.fruitDeepest} stopOpacity="0.6" />
          <stop offset="100%" stopColor={PUMPKIN_PALETTE.fruitDeepest} stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {stage === 0 ? (
        <PumpkinFlower cx={cx} cy={cy} seed={seed} petalGrad={petalGrad} throatGrad={throatGrad} />
      ) : null}
      {stage === 1 ? (
        <PumpkinFruiting
          cx={cx}
          cy={cy}
          seed={seed}
          petalGrad={petalGrad}
          throatGrad={throatGrad}
          fruitGrad={fruitGrad}
          ribShade={ribShade}
        />
      ) : null}
      {stage === 2 ? (
        <PumpkinRipe
          cx={cx}
          seed={seed}
          lobeGrad={lobeGrad}
          fruitGrad={fruitGrad}
          ribShade={ribShade}
          stemBaseY={138}
        />
      ) : null}
    </g>
  );
}

/** Curly squash tendril — a stroked spiral with a seeded wobble. */
function Tendril({
  x,
  y,
  scale,
  flip,
  seed,
}: {
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  seed: number;
}) {
  const rng = createRng(seed ^ 0x7e4d);
  const s = scale * (flip ? -1 : 1);
  const wob = (rng() - 0.5) * 2;
  const d = `M ${x} ${y}
      C ${x + 4 * s} ${y - 5 * scale} ${x + 9 * s} ${y - 5 * scale + wob} ${x + 10 * s} ${y - 1 * scale}
      C ${x + 10.8 * s} ${y + 2 * scale} ${x + 7.5 * s} ${y + 3 * scale} ${x + 6.6 * s} ${y + 0.8 * scale}
      C ${x + 6 * s} ${y - 0.8 * scale} ${x + 8 * s} ${y - 1.4 * scale} ${x + 8.6 * s} ${y - 0.2 * scale}`;
  return (
    <path
      d={d}
      stroke={PUMPKIN_PALETTE.tendril}
      strokeWidth={1}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function PumpkinFlower({
  cx,
  cy,
  seed,
  petalGrad,
  throatGrad,
}: {
  cx: number;
  cy: number;
  seed: number;
  petalGrad: string;
  throatGrad: string;
}) {
  const rng = createRng(seed ^ 0x5b10);
  const backLen = 24;
  const backW = 12;
  const frontLen = 21;
  const frontW = 10.5;

  return (
    <g>
      <ellipse cx={cx + 0.4} cy={cy + 2} rx={26} ry={22} fill="rgba(40, 32, 22, 0.16)" />

      <g>
        {Array.from({ length: PETAL_COUNT }, (_, i) => {
          const angle = (360 / PETAL_COUNT) * i + 36 + (rng() * 2 - 1) * 3;
          return (
            <path
              key={`back-${i}`}
              d={petalPath(cx, cy, angle, backLen, backW, 0.06)}
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
              {/* Fluted pleats — squash blossoms crease in threes */}
              {[-0.3, 0, 0.3].map((spread, vi) => {
                const va = a + spread * 0.36;
                return (
                  <line
                    key={`vein-${vi}`}
                    x1={cx + Math.sin(va) * 4}
                    y1={cy - Math.cos(va) * 4}
                    x2={cx + Math.sin(va) * frontLen * (vi === 1 ? 0.84 : 0.6)}
                    y2={cy - Math.cos(va) * frontLen * (vi === 1 ? 0.84 : 0.6)}
                    stroke={PUMPKIN_PALETTE.petalDark}
                    strokeWidth={vi === 1 ? 0.5 : 0.35}
                    strokeOpacity={0.4}
                  />
                );
              })}
            </g>
          );
        })}
      </g>

      <circle cx={cx} cy={cy} r={6.2} fill={`url(#${throatGrad})`} />
      <circle cx={cx} cy={cy} r={2.4} fill={PUMPKIN_PALETTE.fruitDeepest} fillOpacity={0.7} />
      <ellipse cx={cx - 1.6} cy={cy - 1.8} rx={1.6} ry={0.9} fill={PUMPKIN_PALETTE.petalHighlight} fillOpacity={0.6} />

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

      <Tendril x={cx + 16} y={cy + 18} scale={1} flip={false} seed={seed} />
    </g>
  );
}

function PumpkinFruiting({
  cx,
  cy,
  seed,
  petalGrad,
  throatGrad,
  fruitGrad,
  ribShade,
}: {
  cx: number;
  cy: number;
  seed: number;
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

      <ellipse
        cx={fruitCx}
        cy={fruitCy}
        rx={fruitRx}
        ry={fruitRy}
        fill={`url(#${fruitGrad})`}
        stroke={PUMPKIN_PALETTE.fruitDark}
        strokeWidth={0.4}
      />

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

      <ellipse cx={fruitCx - fruitRx * 0.45} cy={fruitCy - fruitRy * 0.5} rx={2.6} ry={1.2} fill={PUMPKIN_PALETTE.fruitHighlight} fillOpacity={0.6} />

      <rect
        x={fruitCx - 1.4}
        y={fruitCy - fruitRy - 2.6}
        width={2.8}
        height={3.2}
        rx={0.8}
        fill={PUMPKIN_PALETTE.stemBrown}
      />
      <Tendril x={fruitCx + fruitRx + 1} y={fruitCy + 2} scale={0.8} flip={false} seed={seed} />
    </g>
  );
}

function PumpkinRipe({
  cx,
  seed,
  lobeGrad,
  fruitGrad,
  ribShade,
  stemBaseY,
}: {
  cx: number;
  seed: number;
  lobeGrad: string;
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
      <ellipse cx={fruitCx + 0.8} cy={fruitBottom - 1} rx={fruitRx + 2} ry={RIPE_FRUIT_RY * 0.24} fill="rgba(40, 32, 22, 0.26)" />

      {/* Trailing vine into the ground with a curly tendril and leaf */}
      <path
        d={`M ${(fruitCx - fruitRx - 6).toFixed(2)} ${(fruitBottom - 0.5).toFixed(2)}
            C ${(fruitCx - fruitRx + 2).toFixed(2)} ${(fruitBottom - 4).toFixed(2)} ${(fruitCx - 8).toFixed(2)} ${(fruitBottom - 2).toFixed(2)} ${fruitCx.toFixed(2)} ${(fruitBottom - 1.5).toFixed(2)}`}
        stroke={PUMPKIN_PALETTE.leaf}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeOpacity={0.85}
      />
      <Tendril x={fruitCx - fruitRx - 4} y={fruitBottom - 4} scale={1.1} flip seed={seed} />
      <path
        d={`M ${(fruitCx - fruitRx - 7).toFixed(2)} ${(fruitBottom - 2).toFixed(2)}
            c -4 -2 -6.5 -6 -5.5 -10 c 3.5 0.5 6.5 4 7.5 8 Z`}
        fill={PUMPKIN_PALETTE.leaf}
        fillOpacity={0.9}
      />

      {/* Body — back disc, then individually shaded lobes out to in */}
      <ellipse cx={fruitCx} cy={fruitCy} rx={fruitRx} ry={RIPE_FRUIT_RY} fill={`url(#${fruitGrad})`} />
      <ellipse cx={fruitCx - fruitRx * 0.62} cy={fruitCy} rx={fruitRx * 0.42} ry={RIPE_FRUIT_RY * 0.97} fill={`url(#${lobeGrad})`} fillOpacity={0.95} />
      <ellipse cx={fruitCx + fruitRx * 0.62} cy={fruitCy} rx={fruitRx * 0.42} ry={RIPE_FRUIT_RY * 0.97} fill={`url(#${lobeGrad})`} fillOpacity={0.95} />
      <ellipse cx={fruitCx - fruitRx * 0.32} cy={fruitCy} rx={fruitRx * 0.5} ry={RIPE_FRUIT_RY} fill={`url(#${lobeGrad})`} fillOpacity={0.97} />
      <ellipse cx={fruitCx + fruitRx * 0.32} cy={fruitCy} rx={fruitRx * 0.5} ry={RIPE_FRUIT_RY} fill={`url(#${lobeGrad})`} fillOpacity={0.97} />
      <ellipse cx={fruitCx} cy={fruitCy} rx={fruitRx * 0.56} ry={RIPE_FRUIT_RY} fill={`url(#${lobeGrad})`} />

      {/* Creases between lobes */}
      {[-0.78, -0.42, 0, 0.42, 0.78].map((offsetFrac, i) => {
        const ribX = fruitCx + offsetFrac * fruitRx;
        return (
          <path
            key={`rib-${i}`}
            d={`M ${ribX.toFixed(2)} ${(fruitTop + 0.8).toFixed(2)} Q ${(ribX + offsetFrac * 2).toFixed(2)} ${fruitCy.toFixed(2)} ${ribX.toFixed(2)} ${(fruitBottom - 0.8).toFixed(2)}`}
            stroke={`url(#${ribShade})`}
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}

      {/* Warm top light + reflected ground light below */}
      <ellipse cx={fruitCx - fruitRx * 0.36} cy={fruitTop + RIPE_FRUIT_RY * 0.4} rx={5.5} ry={2} fill={PUMPKIN_PALETTE.fruitHighlight} fillOpacity={0.6} />
      <ellipse cx={fruitCx + fruitRx * 0.2} cy={fruitBottom - 2.6} rx={8} ry={1.6} fill="#FFCF8E" fillOpacity={0.18} />

      {/* Gnarled peduncle */}
      <path
        d={`M ${(fruitCx - 2.6).toFixed(2)} ${(fruitTop + 1.4).toFixed(2)}
            C ${(fruitCx - 3.4).toFixed(2)} ${(fruitTop - 4).toFixed(2)} ${(fruitCx - 1.5).toFixed(2)} ${(fruitTop - 8.5).toFixed(2)} ${(fruitCx + 2.4).toFixed(2)} ${(fruitTop - 8).toFixed(2)}
            C ${(fruitCx + 3.4).toFixed(2)} ${(fruitTop - 7.8).toFixed(2)} ${(fruitCx + 3).toFixed(2)} ${(fruitTop - 5.5).toFixed(2)} ${(fruitCx + 2.2).toFixed(2)} ${(fruitTop - 5.8).toFixed(2)}
            C ${(fruitCx + 1).toFixed(2)} ${(fruitTop - 6.2).toFixed(2)} ${(fruitCx + 0.4).toFixed(2)} ${(fruitTop - 3).toFixed(2)} ${(fruitCx + 1.8).toFixed(2)} ${(fruitTop + 1.2).toFixed(2)} Z`}
        fill={PUMPKIN_PALETTE.stemBrown}
        stroke={PUMPKIN_PALETTE.fruitDeepest}
        strokeWidth={0.45}
        strokeLinejoin="round"
      />
      <path
        d={`M ${(fruitCx - 1.4).toFixed(2)} ${(fruitTop - 0.5).toFixed(2)} C ${(fruitCx - 1.8).toFixed(2)} ${(fruitTop - 4).toFixed(2)} ${(fruitCx - 0.6).toFixed(2)} ${(fruitTop - 6.5).toFixed(2)} ${(fruitCx + 1).toFixed(2)} ${(fruitTop - 7).toFixed(2)}`}
        stroke="rgba(40, 26, 12, 0.45)"
        strokeWidth={0.6}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
