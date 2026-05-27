'use client';

import React, { useMemo } from 'react';

import { buildHillPaths } from '@bloom/core/garden/season-hills';
import { computeGroundVariant, getGroundStyle } from '@bloom/core/garden/ground';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { getHillColors } from '@bloom/core/scene';
import { getSeason } from '@bloom/core/theme/seasons';
import type { GroundVariant, Season } from '@bloom/core';

type TileGround = {
  month: number;
  groundVariant: GroundVariant;
  groundSeed: number;
  season?: Season | null;
};

type Props = {
  scrollLeft: number;
  /** Pan viewport width — each hill tile matches this width. */
  tileWidth: number;
  viewportHeight: number;
  /** When hills sit inside a parent `translateX(-offset)` pan wrapper, add this so tile math is not applied twice. */
  wrapperOffset?: number;
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  sceneSeason?: Season | null;
  sceneReady?: boolean;
  getTileGround?: (tileIndex: number) => TileGround | null;
};

function tileScrollOffset(scrollLeft: number, tileWidth: number): number {
  if (tileWidth <= 0) return 0;
  return ((scrollLeft % tileWidth) + tileWidth) % tileWidth;
}

/**
 * Viewport-fixed tiling hill SVG segments synced to horizontal pan offset.
 * Renders adjacent tiles based on scrollLeft so the meadow always fills the pan width.
 */
export function RepeatingSeasonGround({
  scrollLeft,
  tileWidth,
  viewportHeight,
  wrapperOffset = 0,
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  sceneSeason = null,
  getTileGround,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const hillSkyOverlap = 12;
  const hillTop = getGardenHillTop(viewportHeight) - hillSkyOverlap;
  const groundSvgH = getGardenHillSvgHeight(viewportHeight) + hillSkyOverlap;
  const hillPaths = useMemo(() => buildHillPaths(tileWidth, groundSvgH), [tileWidth, groundSvgH]);

  const offset = tileScrollOffset(scrollLeft, tileWidth);
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
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ height: viewportHeight }}
    >
      {indices.map((tileIndex) => {
        const tileGround = getTileGround?.(tileIndex);
        const tileMonth = tileGround?.month ?? month;
        const tileSeed = tileGround?.groundSeed ?? groundSeed;
        const tileVariant = tileGround?.groundVariant ?? variant;
        const baseGroundStyle = getGroundStyle(tileVariant);
        const hillsSeason = tileGround?.season ?? sceneSeason ?? getSeason(tileMonth);
        const sceneHills = getHillColors(hillsSeason);
        const groundStyle = {
          ...baseGroundStyle,
          backTop: sceneHills.far,
          backBottom: sceneHills.far,
          midTop: sceneHills.mid,
          midBottom: sceneHills.mid,
          frontTop: sceneHills.near,
          frontBottom: sceneHills.near,
        };
        const x = tileIndex * tileWidth - offset + wrapperOffset;
        const gradId = `hill-${tileIndex}-${tileSeed}`;

        return (
          <React.Fragment key={tileIndex}>
            <div
              className="absolute inset-y-0"
              style={{ left: x, width: tileWidth, backgroundColor: groundStyle.haze, opacity: 0.22 }}
            />
            <svg
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
                opacity={tileVariant === 3 ? 0.82 : 0.7}
              />
              <path d={hillPaths.midHill} fill={`url(#${gradId}-mid)`} opacity={0.88} />
              <path d={hillPaths.frontHill} fill={`url(#${gradId}-front)`} />
            </svg>
          </React.Fragment>
        );
      })}
    </div>
  );
}
