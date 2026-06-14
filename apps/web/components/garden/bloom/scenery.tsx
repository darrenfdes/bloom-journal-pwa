/**
 * Scenery primitives (hills, trees, grass tufts, header icons) ported from the Bloom Meadow
 * reference (spec §8, §10, §15). Creatures (fox, butterfly) are intentionally omitted.
 */
import React from 'react';

import { mulberry32 } from '@/lib/garden/bloom/rng';

export interface Hill {
  d: string;
  yAt: (x: number) => number;
}

export function makeHill(seed: number, W: number, H: number, base: number, amp: number): Hill {
  const rng = mulberry32(seed);
  const step = 190;
  const pts: [number, number][] = [];
  for (let x = 0; x <= W + step; x += step) pts.push([x, H - base - rng() * amp]);
  let d = `M0 ${H} L ${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!;
    const [x1, y1] = pts[i]!;
    d += ` Q ${x0 + (x1 - x0) * 0.5 - step * 0.28} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`;
  }
  d += ` L ${W + step} ${H} Z`;
  const yAt = (x: number) => {
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor(x / step)));
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const t = (x - a[0]) / step;
    return a[1] * (1 - t) + b[1] * t;
  };
  return { d, yAt };
}

export const Tree = ({ x, y, sc, fill }: { x: number; y: number; sc: number; fill: string }) => (
  <g transform={`translate(${x} ${y}) scale(${sc})`}>
    <rect x="-1.6" y="-7" width="3.2" height="11" rx="1.4" fill={fill} opacity=".9" style={{ transition: 'fill 1.4s' }} />
    <ellipse cx="0" cy="-16" rx="12.5" ry="14" fill={fill} style={{ transition: 'fill 1.4s' }} />
    <ellipse cx="-8" cy="-8" rx="7.5" ry="8.5" fill={fill} style={{ transition: 'fill 1.4s' }} />
    <ellipse cx="8" cy="-8" rx="7.5" ry="8.5" fill={fill} style={{ transition: 'fill 1.4s' }} />
  </g>
);

export const GrassTuft = ({
  left,
  bottom,
  sc,
  dur,
  delay,
  z,
}: {
  left: number;
  bottom: number;
  sc: number;
  dur: number;
  delay: number;
  z: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left,
      bottom,
      zIndex: z,
      transformOrigin: 'bottom center',
      transform: `scale(${sc})`,
      pointerEvents: 'none',
    }}
  >
    <svg
      width="26"
      height="34"
      viewBox="0 0 26 34"
      style={{
        display: 'block',
        overflow: 'visible',
        animation: `bj-grass ${dur}s ${delay}s ease-in-out infinite alternate`,
        transformOrigin: '13px 34px',
      }}
    >
      <path d="M13 34 C 12 22 9 14 5 8" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M13 34 C 13.5 20 14 12 14.5 5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M13 34 C 15 24 18 16 22 11" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

export const SunIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.4" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
  </svg>
);

export const RainIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6 13a5 5 0 1 1 1-9.9A6 6 0 0 1 18.5 6 4.5 4.5 0 0 1 18 13H6Z" />
    <path d="M8 16.5l-1 3M13 16.5l-1 3M18 16.5l-1 3" />
  </svg>
);
