import React from 'react';

import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

interface Bell {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function WistfulBluebells({ ns, palette, cx, cy }: BloomProps) {
  const bellGrad = nsId(ns, 'bellGrad');
  const innerShadow = nsId(ns, 'bellShadow');

  const hub = { x: cx, y: cy - 18 };

  const bells: Bell[] = [
    { x: cx - 14, y: cy - 4, scale: 0.95, rotation: -22 },
    { x: cx + 12, y: cy - 8, scale: 0.85, rotation: 18 },
    { x: cx - 10, y: cy + 12, scale: 1, rotation: -10 },
    { x: cx + 14, y: cy + 6, scale: 0.9, rotation: 26 },
    { x: cx + 2, y: cy + 16, scale: 1.05, rotation: 6 },
  ];

  return (
    <g>
      <defs>
        <linearGradient id={bellGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="55%" stopColor={palette.petalWash} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </linearGradient>
        <radialGradient id={innerShadow} cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.75" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g>
        {bells.map((b, i) => (
          <path
            key={`twig-${i}`}
            d={`M ${hub.x.toFixed(2)} ${hub.y.toFixed(2)} Q ${((hub.x + b.x) / 2).toFixed(2)} ${(b.y - 4).toFixed(2)} ${b.x.toFixed(2)} ${(b.y - 4).toFixed(2)}`}
            stroke={palette.stem}
            strokeWidth={0.9}
            strokeOpacity={0.85}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>

      {bells.map((b, i) => (
        <Bell key={`bell-${i}`} bell={b} palette={palette} bellGrad={bellGrad} innerShadow={innerShadow} />
      ))}
    </g>
  );
}

function Bell({
  bell,
  palette,
  bellGrad,
  innerShadow,
}: {
  bell: Bell;
  palette: BloomProps['palette'];
  bellGrad: string;
  innerShadow: string;
}) {
  const w = 4.5 * bell.scale;
  const h = 9 * bell.scale;
  const lipDip = 1 * bell.scale;
  const scallops = 5;

  const left = -w;
  const right = w;
  const top = -h * 0.5;
  const bottom = h * 0.5;
  const shoulderY = top + h * 0.2;
  const flareY = top + h * 0.6;

  let d = `M 0 ${top.toFixed(2)} `;
  d += `C ${(w * 0.55).toFixed(2)} ${shoulderY.toFixed(2)} ${(w * 0.9).toFixed(2)} ${flareY.toFixed(2)} ${right.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  for (let i = 0; i < scallops; i++) {
    const t0 = i / scallops;
    const t1 = (i + 1) / scallops;
    const xa = right + (left - right) * t0;
    const xb = right + (left - right) * t1;
    const midX = (xa + xb) / 2;
    d += `Q ${midX.toFixed(2)} ${(bottom + lipDip * 1.4).toFixed(2)} ${xb.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  }
  d += `C ${(-w * 0.9).toFixed(2)} ${flareY.toFixed(2)} ${(-w * 0.55).toFixed(2)} ${shoulderY.toFixed(2)} 0 ${top.toFixed(2)} Z`;

  return (
    <g
      transform={`translate(${bell.x.toFixed(2)} ${bell.y.toFixed(2)}) rotate(${bell.rotation})`}
    >
      <path d={d} transform={`translate(0.4 0.8)`} fill="rgba(40, 40, 60, 0.22)" />
      <path
        d={d}
        fill={`url(#${bellGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.7}
        strokeLinejoin="round"
      />

      <ellipse
        cx={0}
        cy={top + h * 0.18}
        rx={w * 0.6}
        ry={h * 0.16}
        fill={`url(#${innerShadow})`}
      />

      {Array.from({ length: scallops }, (_, i) => {
        const t = (i + 0.5) / scallops;
        const x = right + (left - right) * t;
        return (
          <path
            key={`vein-${i}`}
            d={`M ${x.toFixed(2)} ${(bottom - lipDip).toFixed(2)} Q ${(x * 0.4).toFixed(2)} ${(h * 0.15).toFixed(2)} 0 ${top.toFixed(2)}`}
            stroke={palette.petalDeepest}
            strokeWidth={0.32}
            strokeOpacity={0.45}
            fill="none"
          />
        );
      })}

      <ellipse
        cx={-w * 0.55}
        cy={h * 0.05}
        rx={w * 0.18}
        ry={h * 0.35}
        fill={palette.petalHighlight}
        fillOpacity={0.55}
      />

      {Array.from({ length: 5 }, (_, i) => {
        const sx = (-w * 0.45) + (i * w * 0.225);
        const sy = bottom - lipDip * 0.5;
        return (
          <g key={`stamen-${i}`}>
            <path
              d={`M ${sx.toFixed(2)} ${(top + h * 0.3).toFixed(2)} L ${sx.toFixed(2)} ${sy.toFixed(2)}`}
              stroke={palette.petalDeepest}
              strokeWidth={0.3}
              strokeOpacity={0.85}
            />
            <circle cx={sx} cy={sy} r={0.55} fill={palette.pollen} />
          </g>
        );
      })}

      <ellipse
        cx={0}
        cy={top - 0.6}
        rx={w * 0.28}
        ry={0.8}
        fill={palette.stem}
        fillOpacity={0.9}
      />
    </g>
  );
}
