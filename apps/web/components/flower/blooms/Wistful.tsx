import React from 'react';

import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

interface BellSpec {
  /** Station along the arch (0 = base, 1 = tip). */
  t: number;
  drop: number;
  scale: number;
  swing: number;
}

/**
 * Wistful — bluebells on a nodding arch. A single stalk rises and bows to
 * the right; open bells hang from curved pedicels at descending stations,
 * ending in a closed bud at the tip. Bell swing angles are seeded.
 */
export function WistfulBluebells({ ns, palette, seed, cx, cy }: BloomProps) {
  const bellGrad = nsId(ns, 'bellGrad');
  const innerShadow = nsId(ns, 'bellShadow');
  const rng = createRng(seed ^ 0xb1be);

  // Arch: base at the stem top, apex up-left, nodding tip down-right
  const base = { x: cx - 1, y: cy + 26 };
  const apex = { x: cx - 10, y: cy - 24 };
  const tip = { x: cx + 22, y: cy - 6 };

  const archPoint = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * base.x + 2 * mt * t * apex.x + t * t * tip.x,
      y: mt * mt * base.y + 2 * mt * t * apex.y + t * t * tip.y,
    };
  };

  const bells: BellSpec[] = [
    { t: 0.42, drop: 12, scale: 1.32, swing: -6 + rng() * 8 },
    { t: 0.58, drop: 10.5, scale: 1.22, swing: -2 + rng() * 10 },
    { t: 0.74, drop: 9, scale: 1.12, swing: 2 + rng() * 10 },
    { t: 0.88, drop: 7, scale: 1.0, swing: 6 + rng() * 10 },
  ];

  const archD = `M ${base.x.toFixed(2)} ${base.y.toFixed(2)} Q ${apex.x.toFixed(2)} ${apex.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`;

  return (
    <g>
      <defs>
        <linearGradient id={bellGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalDark} />
          <stop offset="40%" stopColor={palette.petalMid} />
          <stop offset="78%" stopColor={palette.petalWash} />
          <stop offset="100%" stopColor={palette.petalDark} />
        </linearGradient>
        <radialGradient id={innerShadow} cx="50%" cy="18%" r="62%">
          <stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.7" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nodding stalk with a soft shadow pass */}
      <path
        d={archD}
        stroke="rgba(30, 38, 56, 0.25)"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        transform="translate(0.5 0.9)"
      />
      <path
        d={archD}
        stroke={palette.stem}
        strokeWidth={1.9}
        strokeOpacity={0.95}
        fill="none"
        strokeLinecap="round"
      />

      {/* Slim basal leaf hugging the stalk */}
      <path
        d={`M ${(base.x - 1).toFixed(2)} ${(base.y - 2).toFixed(2)} C ${(base.x - 9).toFixed(2)} ${(base.y - 10).toFixed(2)} ${(base.x - 11).toFixed(2)} ${(base.y - 20).toFixed(2)} ${(base.x - 8).toFixed(2)} ${(base.y - 28).toFixed(2)} C ${(base.x - 7).toFixed(2)} ${(base.y - 18).toFixed(2)} ${(base.x - 4).toFixed(2)} ${(base.y - 9).toFixed(2)} ${(base.x - 1).toFixed(2)} ${(base.y - 2).toFixed(2)} Z`}
        fill={palette.leaf}
        fillOpacity={0.7}
      />

      {bells.map((spec, i) => {
        const p = archPoint(spec.t);
        const bellX = p.x + spec.swing * 0.22;
        const bellY = p.y + spec.drop;
        const pedicelD = `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} C ${(p.x + 1.5).toFixed(2)} ${(p.y + spec.drop * 0.35).toFixed(2)} ${(bellX + 0.5).toFixed(2)} ${(bellY - spec.drop * 0.45).toFixed(2)} ${bellX.toFixed(2)} ${(bellY - 4.2 * spec.scale).toFixed(2)}`;
        return (
          <g key={`bell-${i}`}>
            <path
              d={pedicelD}
              stroke={palette.stem}
              strokeWidth={0.85}
              strokeOpacity={0.85}
              strokeLinecap="round"
              fill="none"
            />
            {/* Bract leaf at the pedicel joint */}
            <ellipse
              cx={p.x + 1}
              cy={p.y + 1}
              rx={1.6}
              ry={0.7}
              fill={palette.leaf}
              fillOpacity={0.7}
              transform={`rotate(32 ${p.x + 1} ${p.y + 1})`}
            />
            <Bell
              x={bellX}
              y={bellY}
              scale={spec.scale}
              rotation={spec.swing}
              palette={palette}
              bellGrad={bellGrad}
              innerShadow={innerShadow}
            />
          </g>
        );
      })}

      {/* Closed terminal bud nodding at the tip */}
      <g transform={`translate(${tip.x.toFixed(2)} ${(tip.y + 4).toFixed(2)}) rotate(${(14 + rng() * 8).toFixed(1)})`}>
        <path
          d="M 0 -3.4 C 2.4 -2.6 2.8 1 1.6 3.4 C 0.8 4.8 -0.8 4.8 -1.6 3.4 C -2.8 1 -2.4 -2.6 0 -3.4 Z"
          fill={palette.petalDark}
          stroke={palette.petalDeepest}
          strokeWidth={0.4}
          strokeOpacity={0.6}
        />
        <path
          d="M -1.2 -1.8 C -1.5 0.4 -1.2 2 -0.6 3.2"
          stroke={palette.petalHighlight}
          strokeWidth={0.5}
          strokeOpacity={0.5}
          fill="none"
        />
        <ellipse cx={0} cy={-3.6} rx={1.1} ry={0.7} fill={palette.stem} />
      </g>
    </g>
  );
}

function Bell({
  x,
  y,
  scale,
  rotation,
  palette,
  bellGrad,
  innerShadow,
}: {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  palette: BloomProps['palette'];
  bellGrad: string;
  innerShadow: string;
}) {
  const w = 5.3 * scale;
  const h = 10.6 * scale;
  const lipFlare = 1.6 * scale;
  const lipDip = 1.05 * scale;
  const scallops = 5;

  const top = -h * 0.5;
  const bottom = h * 0.5;
  const shoulderY = top + h * 0.22;
  const waistY = top + h * 0.52;
  const right = w + lipFlare * 0.4;
  const left = -right;

  // Waisted body flaring into an upturned scalloped lip
  let d = `M 0 ${top.toFixed(2)} `;
  d += `C ${(w * 0.6).toFixed(2)} ${shoulderY.toFixed(2)} ${(w * 0.74).toFixed(2)} ${waistY.toFixed(2)} ${right.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  for (let i = 0; i < scallops; i++) {
    const t0 = i / scallops;
    const t1 = (i + 1) / scallops;
    const xa = right + (left - right) * t0;
    const xb = right + (left - right) * t1;
    const midX = (xa + xb) / 2;
    d += `Q ${midX.toFixed(2)} ${(bottom + lipDip * 1.5).toFixed(2)} ${xb.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  }
  d += `C ${(-w * 0.74).toFixed(2)} ${waistY.toFixed(2)} ${(-w * 0.6).toFixed(2)} ${shoulderY.toFixed(2)} 0 ${top.toFixed(2)} Z`;

  return (
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation.toFixed(1)})`}>
      <path d={d} transform="translate(0.4 0.8)" fill="rgba(40, 40, 60, 0.2)" />
      <path
        d={d}
        fill={`url(#${bellGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.65}
        strokeLinejoin="round"
      />

      {/* Mouth shadow */}
      <ellipse
        cx={0}
        cy={bottom - lipDip - 0.6}
        rx={w * 0.72}
        ry={h * 0.13}
        fill={`url(#${innerShadow})`}
      />

      {/* Tonal ribs following the flare */}
      {Array.from({ length: scallops - 1 }, (_, i) => {
        const t = (i + 1) / scallops;
        const xEnd = right + (left - right) * t;
        return (
          <path
            key={`vein-${i}`}
            d={`M ${xEnd.toFixed(2)} ${(bottom - lipDip).toFixed(2)} Q ${(xEnd * 0.42).toFixed(2)} ${(h * 0.1).toFixed(2)} 0 ${(top + 0.6).toFixed(2)}`}
            stroke={palette.petalDeepest}
            strokeWidth={0.3}
            strokeOpacity={0.4}
            fill="none"
          />
        );
      })}

      {/* Side highlight */}
      <path
        d={`M ${(-w * 0.62).toFixed(2)} ${(shoulderY + 0.6).toFixed(2)} C ${(-w * 0.78).toFixed(2)} ${waistY.toFixed(2)} ${(-w * 0.8).toFixed(2)} ${(bottom - lipDip - 1.4).toFixed(2)} ${(-w * 0.66).toFixed(2)} ${(bottom - lipDip - 0.4).toFixed(2)}`}
        stroke={palette.petalHighlight}
        strokeWidth={1.1 * scale}
        strokeOpacity={0.55}
        strokeLinecap="round"
        fill="none"
      />

      {/* Stamens just visible inside the mouth */}
      {[-1, 1].map((side) => (
        <g key={`stamen-${side}`}>
          <line
            x1={side * w * 0.22}
            y1={waistY}
            x2={side * w * 0.26}
            y2={bottom - lipDip * 0.4}
            stroke={palette.petalDeepest}
            strokeWidth={0.3}
            strokeOpacity={0.75}
          />
          <circle
            cx={side * w * 0.26}
            cy={bottom - lipDip * 0.4}
            r={0.55 * scale}
            fill={palette.pollen}
          />
        </g>
      ))}

      {/* Calyx cap where the pedicel meets the bell */}
      <ellipse cx={0} cy={top - 0.5} rx={w * 0.3} ry={0.85} fill={palette.stem} fillOpacity={0.9} />
    </g>
  );
}
