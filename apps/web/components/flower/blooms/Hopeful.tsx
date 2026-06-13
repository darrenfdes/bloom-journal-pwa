import React from 'react';

import { createRng } from '@bloom/core/flowers/prng';
import { type BloomProps, nsId } from '@/components/flower/blooms/bloomTypes';

/**
 * Hopeful — a tulip goblet reaching upward. Two pale back petals, two
 * wrapping side petals, and a glossy front cup with a morning-dew
 * highlight; the open crown shows stamens leaning toward the light.
 * The cup's flare is seeded.
 */
export function HopefulTulip({ ns, palette, seed, cx, cy }: BloomProps) {
  const outerGrad = nsId(ns, 'outerGrad');
  const innerDepth = nsId(ns, 'innerDepth');
  const backGrad = nsId(ns, 'backGrad');
  const blush = nsId(ns, 'blush');
  const gloss = nsId(ns, 'gloss');
  const rng = createRng(seed ^ 0x70b1);

  const H = 30;
  const W = 13.5;
  const flare = 1 + (rng() - 0.5) * 0.16;

  const baseY = cy + H * 0.55;
  const topY = cy - H * 0.45;

  // Back petals — visible at the crown, leaning slightly outward
  const backPetal = (side: number) => {
    const x0 = cx + side * W * 0.5;
    const y0 = baseY - 2;
    const tipX = cx + side * W * 0.42 * flare;
    const tipY = topY + 2.5;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)}
            C ${(x0 + side * W * 0.52).toFixed(2)} ${(baseY - H * 0.62).toFixed(2)} ${(tipX + side * W * 0.3).toFixed(2)} ${(topY + H * 0.12).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}
            C ${(tipX - side * 2.2).toFixed(2)} ${(topY + H * 0.06).toFixed(2)} ${(tipX - side * 2.8).toFixed(2)} ${(topY + H * 0.16).toFixed(2)} ${(tipX - side * W * 0.26).toFixed(2)} ${(topY + H * 0.3).toFixed(2)}
            C ${(x0 - side * W * 0.06).toFixed(2)} ${(baseY - H * 0.34).toFixed(2)} ${(x0 - side * W * 0.04).toFixed(2)} ${(y0 - H * 0.16).toFixed(2)} ${x0.toFixed(2)} ${y0.toFixed(2)} Z`;
  };

  // Side petals — wrap the cup, tips flaring out with a gentle point
  const sidePetal = (side: number) => {
    const innerX = cx + side * 1.2;
    const outerX = cx + side * W * 0.98 * flare;
    const tipX = cx + side * W * 0.62 * flare;
    const tipY = topY + H * 0.02;
    return `M ${innerX.toFixed(2)} ${baseY.toFixed(2)}
            C ${outerX.toFixed(2)} ${(baseY - H * 0.18).toFixed(2)} ${(outerX + side * 1.8).toFixed(2)} ${(baseY - H * 0.56).toFixed(2)} ${(tipX + side * 1.6).toFixed(2)} ${(tipY + H * 0.05).toFixed(2)}
            C ${(tipX + side * 2.4).toFixed(2)} ${(tipY - 1.6).toFixed(2)} ${(tipX - side * 1).toFixed(2)} ${(tipY - 1.2).toFixed(2)} ${tipX.toFixed(2)} ${(tipY + 0.6).toFixed(2)}
            C ${(cx + side * 1.5).toFixed(2)} ${(topY + H * 0.52).toFixed(2)} ${innerX.toFixed(2)} ${(baseY - H * 0.22).toFixed(2)} ${innerX.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  // Front cup — broad petal with a soft dip at the crown
  const frontPetal = () => {
    const tipY = topY + H * 0.1;
    return `M ${cx.toFixed(2)} ${baseY.toFixed(2)}
            C ${(cx + W * 0.88).toFixed(2)} ${(baseY - H * 0.14).toFixed(2)} ${(cx + W * 0.98 * flare).toFixed(2)} ${(baseY - H * 0.56).toFixed(2)} ${(cx + W * 0.46 * flare).toFixed(2)} ${tipY.toFixed(2)}
            C ${(cx + W * 0.3).toFixed(2)} ${(tipY - H * 0.1).toFixed(2)} ${(cx + W * 0.1).toFixed(2)} ${(tipY - H * 0.02).toFixed(2)} ${cx.toFixed(2)} ${(tipY + H * 0.045).toFixed(2)}
            C ${(cx - W * 0.1).toFixed(2)} ${(tipY - H * 0.02).toFixed(2)} ${(cx - W * 0.3).toFixed(2)} ${(tipY - H * 0.1).toFixed(2)} ${(cx - W * 0.46 * flare).toFixed(2)} ${tipY.toFixed(2)}
            C ${(cx - W * 0.98 * flare).toFixed(2)} ${(baseY - H * 0.56).toFixed(2)} ${(cx - W * 0.88).toFixed(2)} ${(baseY - H * 0.14).toFixed(2)} ${cx.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  return (
    <g>
      <defs>
        <linearGradient id={outerGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="34%" stopColor={palette.petalWash} />
          <stop offset="76%" stopColor={palette.petalMid} />
          <stop offset="100%" stopColor={palette.petalDark} />
        </linearGradient>
        <radialGradient id={innerDepth} cx="50%" cy="16%" r="80%">
          <stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.8" />
          <stop offset="50%" stopColor={palette.petalDark} stopOpacity="0.4" />
          <stop offset="100%" stopColor={palette.petalWash} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={backGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.petalHighlight} />
          <stop offset="100%" stopColor={palette.petalMid} />
        </linearGradient>
        <radialGradient id={blush} cx="50%" cy="82%" r="62%">
          <stop offset="0%" stopColor={palette.petalDeepest} stopOpacity="0.45" />
          <stop offset="100%" stopColor={palette.petalDeepest} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gloss} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx + 0.5} cy={baseY + 1.2} rx={W * 0.85} ry={3} fill="rgba(40, 50, 30, 0.2)" />

      <path d={backPetal(-1)} fill={`url(#${backGrad})`} fillOpacity={0.9} />
      <path d={backPetal(1)} fill={`url(#${backGrad})`} fillOpacity={0.9} />

      {/* Crown opening — shaded depth between back and side petals */}
      <path
        d={`M ${(cx - W * 0.45).toFixed(2)} ${(topY + H * 0.12).toFixed(2)}
            Q ${cx.toFixed(2)} ${(topY + H * 0.3).toFixed(2)} ${(cx + W * 0.45).toFixed(2)} ${(topY + H * 0.12).toFixed(2)}
            Q ${cx.toFixed(2)} ${(topY - H * 0.02).toFixed(2)} ${(cx - W * 0.45).toFixed(2)} ${(topY + H * 0.12).toFixed(2)} Z`}
        fill={palette.petalDeepest}
        fillOpacity={0.55}
      />

      {/* Stamens leaning toward the light */}
      <g>
        {[-1, 0, 1].map((side, i) => {
          const sx = cx + side * 3.2;
          const lean = side * 0.8 + 0.6;
          const sBase = topY + H * 0.26;
          const sTip = topY + H * 0.02;
          return (
            <g key={`stamen-${i}`}>
              <path
                d={`M ${sx.toFixed(2)} ${sBase.toFixed(2)} Q ${(sx + lean).toFixed(2)} ${((sBase + sTip) / 2).toFixed(2)} ${(sx + lean).toFixed(2)} ${sTip.toFixed(2)}`}
                stroke={palette.petalDeepest}
                strokeWidth={0.45}
                strokeOpacity={0.85}
                fill="none"
              />
              <ellipse cx={sx + lean} cy={sTip} rx={0.8} ry={1.2} fill={palette.pollen} />
            </g>
          );
        })}
      </g>

      <path
        d={sidePetal(-1)}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.5}
        strokeLinejoin="round"
      />
      <path
        d={sidePetal(1)}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.45}
        strokeOpacity={0.5}
        strokeLinejoin="round"
      />

      <path
        d={frontPetal()}
        fill={`url(#${outerGrad})`}
        stroke={palette.petalDeepest}
        strokeWidth={0.5}
        strokeOpacity={0.55}
        strokeLinejoin="round"
      />
      <path d={frontPetal()} fill={`url(#${innerDepth})`} fillOpacity={0.4} />

      {/* Vertical gloss down the front cup */}
      <ellipse
        cx={cx - W * 0.28}
        cy={cy + H * 0.02}
        rx={W * 0.26}
        ry={H * 0.36}
        fill={`url(#${gloss})`}
      />

      {/* Petal seams */}
      <path
        d={`M ${(cx - 4.5).toFixed(2)} ${(baseY - 3).toFixed(2)} Q ${(cx - 2.5).toFixed(2)} ${(cy + 4).toFixed(2)} ${(cx - 1).toFixed(2)} ${(topY + H * 0.16).toFixed(2)}`}
        stroke={palette.petalDeepest}
        strokeWidth={0.4}
        strokeOpacity={0.32}
        fill="none"
      />
      <path
        d={`M ${(cx + 4.5).toFixed(2)} ${(baseY - 3).toFixed(2)} Q ${(cx + 2.5).toFixed(2)} ${(cy + 4).toFixed(2)} ${(cx + 1).toFixed(2)} ${(topY + H * 0.16).toFixed(2)}`}
        stroke={palette.petalDeepest}
        strokeWidth={0.4}
        strokeOpacity={0.32}
        fill="none"
      />

      <ellipse cx={cx} cy={baseY - 2} rx={W * 0.55} ry={3.5} fill={`url(#${blush})`} />

      {/* Morning dew */}
      <ellipse
        cx={cx + W * 0.34}
        cy={cy - H * 0.12}
        rx={1.5}
        ry={2.1}
        fill="#FFFFFF"
        fillOpacity={0.45}
        transform={`rotate(18 ${cx + W * 0.34} ${cy - H * 0.12})`}
      />
    </g>
  );
}
