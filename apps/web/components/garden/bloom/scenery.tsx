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

export const Sheep = ({
  x,
  y,
  sc,
  dur,
  delay,
  flip,
  wool,
  shade,
  dark,
}: {
  x: number;
  y: number;
  sc: number;
  dur: number;
  delay: number;
  flip: boolean;
  wool: string;
  shade: string;
  dark: string;
}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})`}>
    {/* legs */}
    <rect x="-5" y="-4" width="1.5" height="4.6" rx="0.7" fill={dark} />
    <rect x="-2.4" y="-4" width="1.5" height="4.6" rx="0.7" fill={dark} />
    <rect x="3" y="-4" width="1.5" height="4.6" rx="0.7" fill={dark} />
    <rect x="5.4" y="-4" width="1.5" height="4.6" rx="0.7" fill={dark} />
    {/* belly shadow */}
    <ellipse cx="0" cy="-4.2" rx="8" ry="3" fill={shade} opacity="0.55" />
    {/* fleece body (bumpy wool silhouette) */}
    <ellipse cx="0" cy="-6" rx="9" ry="5.6" fill={wool} />
    <circle cx="-7" cy="-7.6" r="3.4" fill={wool} />
    <circle cx="-3.4" cy="-9.6" r="3.7" fill={wool} />
    <circle cx="0.4" cy="-10.2" r="3.7" fill={wool} />
    <circle cx="4" cy="-9.2" r="3.4" fill={wool} />
    <circle cx="6.8" cy="-7.4" r="3" fill={wool} />
    {/* tail */}
    <circle cx="-8.8" cy="-6.2" r="2" fill={wool} />
    {/* head — dips down to graze and lifts back up at intervals (body stays still) */}
    <g style={{ animation: `bj-nod ${dur}s ${delay}s ease-in-out infinite` }}>
      <ellipse cx="8.8" cy="-7.6" rx="2.9" ry="3.5" fill={dark} />
      <ellipse cx="10.4" cy="-6" rx="1.7" ry="1.5" fill={dark} />
      <ellipse cx="6.6" cy="-10" rx="1.9" ry="1" fill={dark} transform="rotate(-28 6.6 -10)" />
      <ellipse cx="10.8" cy="-9.6" rx="1.7" ry="0.9" fill={dark} transform="rotate(24 10.8 -9.6)" />
      <circle cx="9.4" cy="-8" r="0.8" fill={wool} />
    </g>
  </g>
);

/**
 * A lone black ram — the `sebastian-ram.png` cutout, facing the viewer. Rendered as an SVG <image>
 * so it scrolls with the hill parallax. The PNG (1024×1536) has asymmetric transparent padding, so
 * we position by the silhouette's measured content box: horizontal centre at 59.2% of the width,
 * feet at 71.6% down, and the silhouette spans 51.4% of the image height. Given the ground point
 * (x, y) and the desired on-screen ram height `h`, this seats the feet at y and centres it on x.
 * A faint moonlit drop-shadow keeps the black silhouette readable against the dark night hill.
 */
const RAM_SRC = '/sebastian-ram.png';
const RAM_AR = 1024 / 1536; // natural width / height
const RAM_CENTER_X = 0.592; // silhouette centre-x as a fraction of image width
const RAM_FEET_Y = 0.716; // silhouette bottom as a fraction of image height
const RAM_CONTENT_H = 0.514; // silhouette height as a fraction of image height

export const Ram = ({ x, y, h }: { x: number; y: number; h: number }) => {
  const imgH = h / RAM_CONTENT_H;
  const imgW = imgH * RAM_AR;
  return (
    <image
      href={RAM_SRC}
      x={x - RAM_CENTER_X * imgW}
      y={y - RAM_FEET_Y * imgH}
      width={imgW}
      height={imgH}
      preserveAspectRatio="xMidYMid meet"
      style={{ filter: 'drop-shadow(0 0 1px rgba(150,170,205,0.38))' }}
    />
  );
};

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
