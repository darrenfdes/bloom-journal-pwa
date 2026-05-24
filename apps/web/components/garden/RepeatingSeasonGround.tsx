'use client';

import React, { useMemo } from 'react';

import { buildHillPaths } from '@bloom/core/garden/season-hills';
import { computeGroundVariant, getGroundStyle } from '@bloom/core/garden/ground';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { getHillColors } from '@bloom/core/scene';
import type { GroundVariant, Season } from '@bloom/core';

type Props = {
  scrollLeft: number;
  /** Pan viewport width — each hill tile matches this width. */
  tileWidth: number;
  viewportHeight: number;
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  sceneSeason?: Season | null;
  sceneReady?: boolean;
};

/**
 * Viewport-fixed tiling hill SVG segments synced to horizontal pan offset.
 * Renders adjacent tiles based on scrollLeft so the meadow always fills the pan width.
 */
export function RepeatingSeasonGround({
  scrollLeft,
  tileWidth,
  viewportHeight,
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  sceneSeason = null,
  sceneReady = false,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const baseGroundStyle = getGroundStyle(variant);
  const sceneHills = sceneReady && sceneSeason ? getHillColors(sceneSeason) : null;
  const groundStyle = sceneHills
    ? {
        ...baseGroundStyle,
        backTop: sceneHills.far,
        backBottom: sceneHills.far,
        midTop: sceneHills.mid,
        midBottom: sceneHills.mid,
        frontTop: sceneHills.near,
        frontBottom: sceneHills.near,
      }
    : baseGroundStyle;
  const hillTop = getGardenHillTop(viewportHeight);
  const groundSvgH = getGardenHillSvgHeight(viewportHeight);
  const hillPaths = useMemo(() => buildHillPaths(tileWidth, groundSvgH), [tileWidth, groundSvgH]);

  const offset = tileWidth > 0 ? scrollLeft % tileWidth : 0;
  const startIndex = tileWidth > 0 ? Math.floor(scrollLeft / tileWidth) - 1 : 0;
  const endIndex =
    tileWidth > 0 ? Math.ceil((scrollLeft + tileWidth) / tileWidth) + 1 : startIndex + 3;
  const indices = useMemo(() => {
    const list: number[] = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      list.push(i);
    }
    return list;
  }, [startIndex, endIndex]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      style={{ height: viewportHeight }}
    >
      {indices.map((tileIndex) => {
        const x = tileIndex * tileWidth - offset;
        const gradId = `hill-${tileIndex}-${groundSeed}`;

        return (
          <svg
            key={tileIndex}
            className="absolute top-0"
            style={{ left: x, top: hillTop }}
            width={tileWidth}
            height={groundSvgH}
            viewBox={`0 0 ${tileWidth} ${groundSvgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`${gradId}-back`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={groundStyle.backTop} stopOpacity="1" />
                <stop offset="100%" stopColor={groundStyle.backBottom} stopOpacity="1" />
              </linearGradient>
              <linearGradient id={`${gradId}-mid`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={groundStyle.midTop} stopOpacity="1" />
                <stop offset="100%" stopColor={groundStyle.midBottom} stopOpacity="1" />
              </linearGradient>
              <linearGradient id={`${gradId}-front`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={groundStyle.frontTop} stopOpacity="1" />
                <stop offset="100%" stopColor={groundStyle.frontBottom} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d={hillPaths.backHill}
              fill={`url(#${gradId}-back)`}
              opacity={variant === 3 ? 0.82 : 0.7}
            />
            <path d={hillPaths.midHill} fill={`url(#${gradId}-mid)`} opacity={0.88} />
            <path d={hillPaths.frontHill} fill={`url(#${gradId}-front)`} />
          </svg>
        );
      })}
      <div className="absolute inset-0" style={{ backgroundColor: groundStyle.haze, opacity: 0.35 }} />
    </div>
  );
}
