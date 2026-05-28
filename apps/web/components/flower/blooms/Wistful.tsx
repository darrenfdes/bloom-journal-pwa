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
  const lipGrad = nsId(ns, 'bellLip');

  const hub = { x: cx, y: cy - 20 };

  const bells: Bell[] = [
    { x: cx - 15, y: cy - 8, scale: 0.9, rotation: -24 },
    { x: cx + 13, y: cy - 11, scale: 0.82, rotation: 20 },
    { x: cx - 13, y: cy + 7, scale: 1, rotation: -13 },
    { x: cx + 15, y: cy + 4, scale: 0.92, rotation: 27 },
    { x: cx - 2, y: cy + 16, scale: 1.08, rotation: -3 },
    { x: cx + 7, y: cy + 13, scale: 0.78, rotation: 13 },
  ];

  return (
    <g>
      <defs>
        <linearGradient id={bellGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.9" />
          <stop offset="42%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="55%" stopColor={palette.petalWash} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </linearGradient>
        <radialGradient id={innerShadow} cx="50%" cy="20%" r="60%">
          <stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.75" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={lipGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette.pollen} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <g>
        {bells.map((b, i) => (
          <path
            key={`twig-${i}`}
            d={`M ${hub.x.toFixed(2)} ${hub.y.toFixed(2)} Q ${((hub.x + b.x) / 2).toFixed(2)} ${(b.y - 8).toFixed(2)} ${b.x.toFixed(2)} ${(b.y - 5).toFixed(2)}`}
            stroke={palette.stem}
            strokeWidth={0.95}
            strokeOpacity={0.8}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>

      {bells.map((b, i) => (
        <Bell
          key={`bell-${i}`}
          bell={b}
          palette={palette}
          bellGrad={bellGrad}
          innerShadow={innerShadow}
          lipGrad={lipGrad}
        />
      ))}
    </g>
  );
}

function Bell({
  bell,
  palette,
  bellGrad,
  innerShadow,
  lipGrad,
}: {
  bell: Bell;
  palette: BloomProps['palette'];
  bellGrad: string;
  innerShadow: string;
  lipGrad: string;
}) {
  const w = 5.2 * bell.scale;
  const h = 10.2 * bell.scale;
  const lipDip = 1.15 * bell.scale;
  const scallops = 6;

  const left = -w;
  const right = w;
  const top = -h * 0.5;
  const bottom = h * 0.5;
  const shoulderY = top + h * 0.2;
  const flareY = top + h * 0.62;

  let d = `M 0 ${top.toFixed(2)} `;
  d += `C ${(w * 0.42).toFixed(2)} ${shoulderY.toFixed(2)} ${(w * 0.98).toFixed(2)} ${flareY.toFixed(2)} ${right.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  for (let i = 0; i < scallops; i++) {
    const t0 = i / scallops;
    const t1 = (i + 1) / scallops;
    const xa = right + (left - right) * t0;
    const xb = right + (left - right) * t1;
    const midX = (xa + xb) / 2;
    d += `Q ${midX.toFixed(2)} ${(bottom + lipDip * 1.5).toFixed(2)} ${xb.toFixed(2)} ${(bottom - lipDip).toFixed(2)} `;
  }
  d += `C ${(-w * 0.98).toFixed(2)} ${flareY.toFixed(2)} ${(-w * 0.42).toFixed(2)} ${shoulderY.toFixed(2)} 0 ${top.toFixed(2)} Z`;

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

      <path
        d={`M ${left.toFixed(2)} ${(bottom - lipDip * 0.95).toFixed(2)} Q 0 ${(bottom + lipDip * 1.35).toFixed(2)} ${right.toFixed(2)} ${(bottom - lipDip * 0.95).toFixed(2)}`}
        stroke={`url(#${lipGrad})`}
        strokeWidth={1.15}
        strokeOpacity={0.75}
        strokeLinecap="round"
        fill="none"
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
            strokeWidth={0.3}
            strokeOpacity={0.38}
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
        fillOpacity={0.5}
      />

      {Array.from({ length: 5 }, (_, i) => {
        const sx = (-w * 0.43) + (i * w * 0.215);
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
        cy={top - 0.7}
        rx={w * 0.3}
        ry={0.85}
        fill={palette.stem}
        fillOpacity={0.9}
      />
    </g>
  );
}
