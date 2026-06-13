import React from 'react';

import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Calm — a true lavender spike. Whorls of small florets taper along a
 * gently leaning S-curved axis toward unopened tip buds, with two slim
 * silver-green bracts at the base. The lean and floret spread are seeded.
 */
export function CalmLavender({ ns, palette, seed, cx, cy }: BloomProps) {
  const floretGrad = nsId(ns, 'floretGrad');
  const halo = nsId(ns, 'halo');
  const rng = createRng(seed ^ 0xca1f);

  const lean = (rng() * 2 - 1) * 5;
  const bottomY = cy + 20;
  const topY = cy - 29;
  const levels = 9;

  /** Axis x at parameter t (0 = bottom, 1 = tip) — soft S-curve. */
  const axisX = (t: number) =>
    cx + lean * t + Math.sin(t * Math.PI) * lean * 0.4;
  const axisY = (t: number) => bottomY + (topY - bottomY) * t;

  const floret = (
    fx: number,
    fy: number,
    angleDeg: number,
    s: number,
    key: string,
    deep: boolean
  ) => (
    <g key={key} transform={`translate(${fx.toFixed(2)} ${fy.toFixed(2)}) rotate(${angleDeg.toFixed(1)})`}>
      <ellipse
        cx={0.35}
        cy={0.5}
        rx={2.3 * s}
        ry={3.3 * s}
        fill={palette.petalDeepest}
        fillOpacity={0.45}
      />
      <ellipse
        cx={0}
        cy={0}
        rx={2.2 * s}
        ry={3.2 * s}
        fill={deep ? palette.petalDark : `url(#${floretGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.3}
        strokeOpacity={0.5}
      />
      <ellipse
        cx={-0.55 * s}
        cy={-0.9 * s}
        rx={0.75 * s}
        ry={1.15 * s}
        fill={palette.petalHighlight}
        fillOpacity={0.65}
      />
    </g>
  );

  const florets: React.ReactElement[] = [];
  for (let level = 0; level < levels; level += 1) {
    const t = level / (levels - 1);
    const s = 0.55 + (1 - t) * 0.5;
    const ax = axisX(t);
    const ay = axisY(t);
    const spread = (3.6 + rng() * 1.4) * s;
    const tilt = 28 + rng() * 10;

    // Side pair angled out and down like real lavender whorls
    florets.push(
      floret(ax - spread, ay + 0.4, -tilt, s, `f-${level}-l`, level % 2 === 0)
    );
    florets.push(
      floret(ax + spread, ay + 0.2, tilt, s, `f-${level}-r`, level % 2 === 1)
    );
    // Center floret faces forward, slightly above the pair
    florets.push(
      floret(ax + (rng() * 2 - 1) * 0.8, ay - 1.6 * s, (rng() * 2 - 1) * 8, s * 0.92, `f-${level}-c`, false)
    );
  }

  const stemD = `M ${cx.toFixed(2)} ${bottomY.toFixed(2)} Q ${axisX(0.5).toFixed(2)} ${axisY(0.5).toFixed(2)} ${axisX(1).toFixed(2)} ${topY.toFixed(2)}`;

  return (
    <g>
      <defs>
        <linearGradient id={floretGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="42%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalDark} />
        </linearGradient>
        <radialGradient id={halo} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.4" />
          <stop offset="60%" stopColor={palette.petalWash} stopOpacity="0.14" />
          <stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + lean * 0.5} cy={cy - 6} rx={17} ry={31} fill={`url(#${halo})`} />

      {/* Basal bracts — slim silver-green leaves arcing away from the spike */}
      <path
        d={`M ${cx.toFixed(2)} ${(bottomY - 1).toFixed(2)} C ${(cx - 7).toFixed(2)} ${(bottomY - 6).toFixed(2)} ${(cx - 10).toFixed(2)} ${(bottomY - 13).toFixed(2)} ${(cx - 9).toFixed(2)} ${(bottomY - 19).toFixed(2)} C ${(cx - 6.5).toFixed(2)} ${(bottomY - 13).toFixed(2)} ${(cx - 3.5).toFixed(2)} ${(bottomY - 7).toFixed(2)} ${cx.toFixed(2)} ${(bottomY - 1).toFixed(2)} Z`}
        fill={palette.leaf}
        fillOpacity={0.75}
      />
      <path
        d={`M ${cx.toFixed(2)} ${bottomY.toFixed(2)} C ${(cx + 7).toFixed(2)} ${(bottomY - 5).toFixed(2)} ${(cx + 10.5).toFixed(2)} ${(bottomY - 11).toFixed(2)} ${(cx + 10).toFixed(2)} ${(bottomY - 17).toFixed(2)} C ${(cx + 7).toFixed(2)} ${(bottomY - 11.5).toFixed(2)} ${(cx + 3.5).toFixed(2)} ${(bottomY - 6).toFixed(2)} ${cx.toFixed(2)} ${bottomY.toFixed(2)} Z`}
        fill={palette.leaf}
        fillOpacity={0.65}
      />

      <path
        d={stemD}
        stroke={palette.stem}
        strokeWidth={1.1}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />

      <g>{florets}</g>

      {/* Unopened tip buds */}
      <g>
        {[0, 1, 2].map((i) => {
          const bx = axisX(1) + (i - 1) * 1.7;
          const by = topY - 1.6 - (i === 1 ? 2.4 : 0);
          return (
            <ellipse
              key={`bud-${i}`}
              cx={bx}
              cy={by}
              rx={1.3}
              ry={2}
              fill={palette.petalDeepest}
              fillOpacity={0.9}
            />
          );
        })}
      </g>
    </g>
  );
}
