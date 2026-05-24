'use client';

import React from 'react';

import { AmbientSky } from '@/components/garden/AmbientSky';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import { getHorizonGlow } from '@bloom/core/garden/season-hills';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSeasonPalette } from '@bloom/core/theme/seasons';
import type { GroundVariant } from '@bloom/core';

type Props = {
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  width: number;
  viewportHeight: number;
  /** Measured sky band height — extends through UI chrome to meet the meadow horizon. */
  skyBandHeight?: number;
  /** Layers between the base sky SVG and scene content (time-phase sky, celestial). */
  skyOverlays?: React.ReactNode;
  children: React.ReactNode;
};

/** Fixed sky layer only — hills scroll in the world layer via RepeatingSeasonGround. */
export function SeasonBackground({
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  width,
  viewportHeight,
  skyBandHeight,
  skyOverlays,
  children,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const { sky, season } = getSeasonPalette(month);
  const skyH = skyBandHeight ?? getGardenSkyHeight(viewportHeight);
  const horizonGlow = getHorizonGlow(variant, season);

  return (
    <div className="relative flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: skyH }}>
          <svg
            className="absolute left-0 right-0 top-0"
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
          {skyOverlays}
          {/* After time-phase overlay so distant peaks stay visible at the horizon */}
          <AmbientSky month={month} width={width} skyHeight={skyH} />
        </div>
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
