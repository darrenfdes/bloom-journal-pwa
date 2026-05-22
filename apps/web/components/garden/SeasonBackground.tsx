'use client';

import React from 'react';

import { AmbientSky } from '@/components/garden/AmbientSky';
import { computeGroundVariant, getGroundStyle } from '@bloom/core/garden/ground';
import { getSeasonPalette } from '@bloom/core/theme/seasons';
import type { GroundVariant } from '@bloom/core';

type Props = {
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  width: number;
  height: number;
  children: React.ReactNode;
};

export function SeasonBackground({
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  width,
  height,
  children,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const groundStyle = getGroundStyle(variant);
  const { sky, season } = getSeasonPalette(month);

  const skyH = height * 0.5;
  const groundSvgH = height * 0.7;

  const horizonGlow =
    variant === 4
      ? '#F8E4B0'
      : season === 'spring'
        ? '#FDE9C9'
        : season === 'summer'
          ? '#FFE3B0'
          : season === 'autumn'
            ? '#F4C794'
            : '#E2DCE6';

  const backHill = `M 0 ${groundSvgH * 0.42}
    C ${width * 0.15} ${groundSvgH * 0.34} ${width * 0.32} ${groundSvgH * 0.46} ${width * 0.5} ${groundSvgH * 0.4}
    C ${width * 0.7} ${groundSvgH * 0.32} ${width * 0.85} ${groundSvgH * 0.5} ${width} ${groundSvgH * 0.42}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const midHill = `M 0 ${groundSvgH * 0.55}
    C ${width * 0.2} ${groundSvgH * 0.45} ${width * 0.4} ${groundSvgH * 0.6} ${width * 0.55} ${groundSvgH * 0.5}
    C ${width * 0.75} ${groundSvgH * 0.4} ${width * 0.88} ${groundSvgH * 0.55} ${width} ${groundSvgH * 0.48}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const frontHill = `M 0 ${groundSvgH * 0.7}
    C ${width * 0.18} ${groundSvgH * 0.6} ${width * 0.35} ${groundSvgH * 0.72} ${width * 0.5} ${groundSvgH * 0.66}
    C ${width * 0.72} ${groundSvgH * 0.58} ${width * 0.88} ${groundSvgH * 0.72} ${width} ${groundSvgH * 0.66}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  return (
    <div className="relative min-h-full flex-1 overflow-hidden">
      <svg
        className="pointer-events-none absolute left-0 right-0 top-0"
        width={width}
        height={skyH}
        viewBox={`0 0 ${width} ${skyH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky} stopOpacity="1" />
            <stop offset="50%" stopColor={sky} stopOpacity="0.95" />
            <stop offset="85%" stopColor={horizonGlow} stopOpacity="0.85" />
            <stop offset="100%" stopColor={horizonGlow} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d={`M 0 0 L ${width} 0 L ${width} ${skyH} L 0 ${skyH} Z`} fill="url(#skyGrad)" />
      </svg>

      <AmbientSky month={month} width={width} />

      <svg
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: skyH * 0.7 }}
        width={width}
        height={groundSvgH}
        viewBox={`0 0 ${width} ${groundSvgH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="backHillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={groundStyle.backTop} stopOpacity="1" />
            <stop offset="100%" stopColor={groundStyle.backBottom} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="midHillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={groundStyle.midTop} stopOpacity="1" />
            <stop offset="100%" stopColor={groundStyle.midBottom} stopOpacity="1" />
          </linearGradient>
          <linearGradient id="frontHillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={groundStyle.frontTop} stopOpacity="1" />
            <stop offset="100%" stopColor={groundStyle.frontBottom} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={backHill} fill="url(#backHillGrad)" opacity={variant === 3 ? 0.82 : 0.7} />
        <path d={midHill} fill="url(#midHillGrad)" opacity={0.88} />
        <path d={frontHill} fill="url(#frontHillGrad)" />
      </svg>

      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: groundStyle.haze }}
      />

      {children}
    </div>
  );
}
