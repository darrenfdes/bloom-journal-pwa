/**
 * Procedural SVG bloom species, ported verbatim from the Bloom Meadow reference
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`, spec §11). Each species opens its
 * own seeded RNG stream (`mulberry32(s ^ MASK)`) so species don't share random sequences.
 */
import React from 'react';

import type { Mood } from '@bloom/core';

import { lerpColor, mulberry32 } from '@/lib/garden/bloom/rng';
import type { BloomKind } from '@/lib/garden/bloom/moods';

const Leaf = ({
  x,
  y,
  angle,
  size,
  fill,
}: {
  x: number;
  y: number;
  angle: number;
  size: number;
  fill: string;
}) => (
  <path
    d={`M0 0 Q ${size * 0.85} ${-size * 0.45} ${size * 1.6} 0 Q ${size * 0.85} ${size * 0.45} 0 0Z`}
    fill={fill}
    opacity="0.95"
    transform={`translate(${x} ${y}) rotate(${angle})`}
  />
);

const Stem = ({
  bend = 0,
  topY = 58,
  color = '#5d7d4e',
  width = 3.6,
}: {
  bend?: number;
  topY?: number;
  color?: string;
  width?: number;
}) => (
  <path
    d={`M60 170 C ${60 + bend} 132 ${60 - bend * 0.7} 96 60 ${topY}`}
    stroke={color}
    strokeWidth={width}
    fill="none"
    strokeLinecap="round"
  />
);

const PETAL = 'M0 -7 C 7 -13 7 -29 0 -35 C -7 -29 -7 -13 0 -7Z';
const PETAL_TIP = 'M0 -24 C 4 -27 4 -33 0 -35 C -4 -33 -4 -27 0 -24Z';

function Daisy({ s }: { s: number }) {
  const r = mulberry32(s ^ 0xd1);
  const n = 11 + Math.floor(r() * 4);
  const cy = 50;
  const tip = r() < 0.3 ? '#f6c9d4' : '#fbecc4';
  const jit = [...Array(n)].map(() => (r() - 0.5) * 6);
  return (
    <>
      <Stem bend={(r() - 0.5) * 14} topY={cy + 12} color="#5d7d4e" />
      <Leaf x={56} y={136} angle={203} size={14} fill="#5d7d4e" />
      <Leaf x={63} y={116} angle={-24} size={12} fill="#6a8e5a" />
      <g transform={`translate(60 ${cy})`}>
        {[...Array(n)].map((_, i) => (
          <path key={'u' + i} d={PETAL} fill="#ecd9ad" transform={`rotate(${(i + 0.5) * (360 / n)} 0 0) scale(.92)`} />
        ))}
        {[...Array(n)].map((_, i) => (
          <g key={i} transform={`rotate(${i * (360 / n) + jit[i]!} 0 0)`}>
            <path d={PETAL} fill="#fdf8ec" />
            <path d={PETAL_TIP} fill={tip} opacity=".85" />
          </g>
        ))}
        <circle r="9" fill="#eeb23f" />
        <circle cx="-2.4" cy="-2.4" r="5.2" fill="#f7d27e" />
        {[...Array(7)].map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return <circle key={'d' + i} cx={Math.cos(a) * 6.4} cy={Math.sin(a) * 6.4} r="1.1" fill="#c98e2c" />;
        })}
      </g>
    </>
  );
}

function Lavender({ s }: { s: number }) {
  const r = mulberry32(s ^ 0xa5);
  const n = 13 + Math.floor(r() * 5);
  const buds = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = 96 - t * 60;
    const side = i % 2 ? 1 : -1;
    const x = 60 + side * (6.5 - 4.5 * t) + (r() - 0.5) * 2;
    const c = lerpColor('#c3a8e3', '#7a58b0', Math.min(1, t * 0.9 + r() * 0.15));
    buds.push(
      <ellipse
        key={i}
        cx={x}
        cy={y}
        rx={Math.max(2.4, 4.6 - t * 1.8)}
        ry={Math.max(3.4, 6.2 - t * 2.2)}
        fill={c}
        transform={`rotate(${side * 34} ${x} ${y})`}
      />
    );
  }
  return (
    <>
      <Stem bend={2 + (r() - 0.5) * 4} topY={96} color="#5e7f50" width={3.2} />
      <Leaf x={57} y={134} angle={205} size={13} fill="#5e7f50" />
      <Leaf x={63} y={117} angle={-22} size={11} fill="#69905b" />
      {buds}
      <ellipse cx="60" cy="33" rx="3" ry="4.6" fill="#6b4aa0" />
    </>
  );
}

function Rose({ s }: { s: number }) {
  const r = mulberry32(s ^ 0x90);
  const cy = 48;
  const ring = (cnt: number, sc: number, fill: string, off: number, key: string) =>
    [...Array(cnt)].map((_, i) => (
      <path
        key={key + i}
        d="M0 2 C 9 0 13 -11 6 -18 C 2 -21 -2 -21 -6 -18 C -13 -11 -9 0 0 2Z"
        fill={fill}
        stroke="rgba(120,20,50,.18)"
        strokeWidth=".6"
        transform={`rotate(${i * (360 / cnt) + off} 0 0) scale(${sc})`}
      />
    ));
  return (
    <>
      <Stem bend={(r() - 0.5) * 12} topY={cy + 16} color="#5c7d4d" />
      <Leaf x={55} y={130} angle={208} size={15} fill="#52764a" />
      <Leaf x={64} y={108} angle={-20} size={13} fill="#5d8252" />
      <g transform={`translate(60 ${cy})`}>
        <Leaf x={-4} y={17} angle={150} size={12} fill="#52764a" />
        <Leaf x={4} y={17} angle={30} size={12} fill="#52764a" />
        {ring(6, 1.18, '#e2798f', r() * 30, 'a')}
        {ring(5, 0.86, '#d4587a', 32 + r() * 20, 'b')}
        {ring(4, 0.56, '#bf3f63', 75, 'c')}
        <circle r="4.6" fill="#a92f52" />
        <path d="M-2.4 -0.6 a2.8 2.8 0 1 0 4.4 1.4" stroke="#8c2342" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

function Bluebell({ s }: { s: number }) {
  const r = mulberry32(s ^ 0xb7);
  const bell = 'M0 0 C -6.5 2 -8 10 -6.5 16 L -8 21 L -4 18 L 0 22 L 4 18 L 8 21 L 6.5 16 C 8 10 6.5 2 0 0Z';
  const pts: [number, number, number][] = [
    [66, 74, 0.95],
    [74, 63, 0.85],
    [82, 55, 0.74],
    [88, 50, 0.6],
  ];
  return (
    <>
      <path d="M60 170 C 57 126 50 88 66 62 C 72 53 80 49 89 47" stroke="#5e7f50" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <Leaf x={56} y={138} angle={206} size={15} fill="#557a4d" />
      <Leaf x={61} y={114} angle={-26} size={12} fill="#618655" />
      {pts.map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d={`M0 -6 C ${-1.5} -9 ${-2.5} -11 ${-3.5} -13`} stroke="#5e7f50" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <g transform={`scale(${sc}) rotate(${4 + r() * 10})`}>
            <path d={bell} fill="#7e90d6" stroke="#5d6cb8" strokeWidth=".9" transform="translate(0 -5)" />
          </g>
        </g>
      ))}
    </>
  );
}

function Dahlia({ s, mood }: { s: number; mood: Mood | null }) {
  const r = mulberry32(s ^ 0xda);
  const cy = 50;
  const hot = mood === 'anxious';
  const oc = hot ? '#c96d9b' : '#ef8b4d';
  const ic = hot ? '#ad4279' : '#dd5f37';
  const pet = 'M0 -6 C 5.5 -12 4 -26 0 -31 C -4 -26 -5.5 -12 0 -6Z';
  const nO = 15;
  const nI = 11;
  return (
    <>
      <Stem bend={(r() - 0.5) * 16} topY={cy + 12} color="#5c7d4d" />
      <Leaf x={55} y={132} angle={206} size={14} fill="#54784b" />
      <Leaf x={64} y={110} angle={-22} size={12} fill="#5f8453" />
      <g transform={`translate(60 ${cy})`}>
        {[...Array(nO)].map((_, i) => (
          <path
            key={'o' + i}
            d={pet}
            fill={oc}
            stroke="rgba(90,25,15,.22)"
            strokeWidth=".5"
            transform={`rotate(${i * (360 / nO) + (r() - 0.5) * 5} 0 0) scale(1.05)`}
          />
        ))}
        {[...Array(nI)].map((_, i) => (
          <path key={'i' + i} d={pet} fill={ic} transform={`rotate(${i * (360 / nI) + 16} 0 0) scale(.66)`} />
        ))}
        <circle r="5.4" fill="#7c2c1c" />
        {[...Array(5)].map((_, i) => {
          const a = (i / 5) * Math.PI * 2 + 0.5;
          return <circle key={'c' + i} cx={Math.cos(a) * 3} cy={Math.sin(a) * 3} r="1" fill="#f2c14e" />;
        })}
      </g>
    </>
  );
}

function Tulip({ s }: { s: number }) {
  const r = mulberry32(s ^ 0x70);
  const cy = 46;
  const palettes: [string, string][] = [
    ['#ef9a4e', '#e07b3a'],
    ['#e87f9a', '#d65f80'],
    ['#f0c04e', '#dfa238'],
  ];
  const [main, dark] = palettes[Math.floor(r() * palettes.length)]!;
  return (
    <>
      <Stem bend={(r() - 0.5) * 8} topY={cy + 24} color="#5d8050" />
      <path d="M58 168 C 44 146 40 118 50 92 C 52 116 55 140 60 162Z" fill="#587a4b" />
      <path d="M62 168 C 76 148 79 122 70 98 C 69 122 65 144 60 162Z" fill="#618655" />
      <g transform={`translate(60 ${cy})`}>
        <path d="M-13 16 C -15 -6 -8 -20 0 -22 C 8 -20 15 -6 13 16 C 8 21 -8 21 -13 16Z" fill={main} />
        <path d="M-13 15 C -14 -2 -10 -14 -3 -19 C -5 -4 -5 8 -3 17Z" fill={dark} />
        <path d="M13 15 C 14 -2 10 -14 3 -19 C 5 -4 5 8 3 17Z" fill={dark} />
      </g>
    </>
  );
}

function Pumpkin() {
  return (
    <>
      <path d="M60 170 C 46 160 36 158 22 162" stroke="#5e7f50" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M44 158 c -2 -8 6 -10 8 -4 c 1.6 4 -3 7 -5 4" stroke="#6b8e5c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Leaf x={28} y={156} angle={195} size={15} fill="#557a4d" />
      <g transform="translate(72 150)">
        <circle r="27" fill="rgba(255,190,90,.16)" />
        <ellipse cx="-9" cy="0" rx="10" ry="13" fill="#d97a22" />
        <ellipse cx="9" cy="0" rx="10" ry="13" fill="#d97a22" />
        <ellipse cx="0" cy="0" rx="11.5" ry="14" fill="#ef9433" />
        <ellipse cx="-3.4" cy="-4.5" rx="4" ry="6" fill="rgba(255,228,165,.4)" />
        <path d="M-2 -13 C -2 -19 4 -21 5.5 -17.5 L 3 -12Z" fill="#74934e" />
        <path d="M11 -23 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6Z" fill="#ffe49a" />
        <path d="M-17 -17 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1Z" fill="#ffe9b0" opacity=".9" />
      </g>
    </>
  );
}

export function FlowerArt({
  entry,
}: {
  entry: { bloom: BloomKind; seed: number; lean: number; mood: Mood | null };
}) {
  const { bloom, seed, lean, mood } = entry;
  let inner: React.ReactNode;
  if (bloom === 'daisy') inner = <Daisy s={seed} />;
  else if (bloom === 'lavender') inner = <Lavender s={seed} />;
  else if (bloom === 'rose') inner = <Rose s={seed} />;
  else if (bloom === 'bluebell') inner = <Bluebell s={seed} />;
  else if (bloom === 'dahlia') inner = <Dahlia s={seed} mood={mood} />;
  else if (bloom === 'tulip') inner = <Tulip s={seed} />;
  else inner = <Pumpkin />;
  return (
    <svg viewBox="0 0 120 170" width="120" height="170" style={{ overflow: 'visible', display: 'block' }}>
      <g transform={`rotate(${lean} 60 170)`}>{inner}</g>
    </svg>
  );
}
