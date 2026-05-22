import React from 'react';

import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

export function CalmLavender({ ns, palette, cx, cy }: BloomProps) {
  const floretGrad = nsId(ns, 'floretGrad');
  const halo = nsId(ns, 'halo');

  const rows = 11;
  const floretsPerRow = 5;
  const topY = cy - 28;
  const bottomY = cy + 18;

  return (
    <g>
      <defs>
        <linearGradient id={floretGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="1" />
          <stop offset="40%" stopColor={palette.petalMid} stopOpacity="1" />
          <stop offset="100%" stopColor={palette.petalDark} stopOpacity="1" />
        </linearGradient>
        <radialGradient id={halo} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={palette.petalHighlight} stopOpacity="0.55" />
          <stop offset="60%" stopColor={palette.petalWash} stopOpacity="0.2" />
          <stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy - 6} rx={18} ry={32} fill={`url(#${halo})`} />

      <g>
        {Array.from({ length: rows }, (_, r) => {
          const t = r / (rows - 1);
          const y = topY + (bottomY - topY) * t;
          const scale = 0.45 + (1 - t) * 0.55;
          const offset = r % 2 === 0 ? -1.2 : 1.2;
          const rowFlorets: React.ReactElement[] = [];
          for (let f = 0; f < floretsPerRow; f++) {
            const ft = (f - (floretsPerRow - 1) / 2) / 2;
            const fx = cx + ft * 5 * scale + offset;
            const fy = y;
            rowFlorets.push(
              <g key={`f-${r}-${f}`}>
                <ellipse
                  cx={fx + 0.4}
                  cy={fy + 0.6}
                  rx={2.2 * scale}
                  ry={3.2 * scale}
                  fill={palette.petalDeepest}
                  fillOpacity={0.5}
                />
                <ellipse
                  cx={fx}
                  cy={fy}
                  rx={2.2 * scale}
                  ry={3.2 * scale}
                  fill={`url(#${floretGrad})`}
                  stroke={palette.petalDeepest}
                  strokeWidth={0.3}
                  strokeOpacity={0.55}
                />
                <ellipse
                  cx={fx - 0.6}
                  cy={fy - 0.9}
                  rx={0.7 * scale}
                  ry={1.1 * scale}
                  fill={palette.petalHighlight}
                  fillOpacity={0.7}
                />
              </g>
            );
          }
          rowFlorets.push(
            <g key={`stamen-${r}`}>
              <path
                d={`M ${cx.toFixed(2)} ${(y + 1).toFixed(2)} Q ${(cx + 0.4).toFixed(2)} ${y.toFixed(2)} ${(cx + 0.2).toFixed(2)} ${(y - 1.6 * scale).toFixed(2)}`}
                stroke={palette.petalDeepest}
                strokeWidth={0.35}
                strokeOpacity={0.7}
                fill="none"
              />
              <circle
                cx={cx + 0.2}
                cy={y - 1.6 * scale}
                r={0.5}
                fill={palette.pollen}
                fillOpacity={0.95}
              />
            </g>
          );
          return <g key={`row-${r}`}>{rowFlorets}</g>;
        })}
      </g>

      <path
        d={`M ${cx.toFixed(2)} ${topY.toFixed(2)} L ${cx.toFixed(2)} ${bottomY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.6}
        strokeOpacity={0.5}
      />
    </g>
  );
}
