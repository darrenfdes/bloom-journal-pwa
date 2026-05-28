'use client';

import React, { useMemo } from 'react';

import { buildHillPaths } from '@bloom/core/garden/season-hills';
import { computeGroundVariant, getGroundStyle } from '@bloom/core/garden/ground';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { GARDEN_HILL_SKY_OVERLAP } from '@bloom/core/garden/horizon-layout';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { getHillColors, getNightHillColors, NIGHT_MEADOW_BASE } from '@bloom/core/scene';
import { getSeason } from '@bloom/core/theme/seasons';
import type { GroundVariant, Season } from '@bloom/core';

type TileGround = {
  month: number;
  groundVariant: GroundVariant;
  groundSeed: number;
  season?: Season | null;
};

export function gardenTileScrollOffset(scrollLeft: number, tileWidth: number): number {
  if (tileWidth <= 0) return 0;
  return ((scrollLeft % tileWidth) + tileWidth) % tileWidth;
}

type Props = {
  /**
   * Total world content width — hill tiles fill this width.
   * When placed inside the scroll container, the browser's native scroll
   * moves the hills with the flowers.
   */
  contentWidth?: number;
  /** When using a simulated horizontal-scroll viewport (like in WeatherPreviewScene), pass scrollLeft. */
  scrollLeft?: number;
  /** Pan viewport width — each hill tile matches this width. */
  tileWidth: number;
  viewportHeight: number;
  groundY?: number;
  /** When hills sit inside a parent `translateX(-offset)` pan wrapper, add this so tile math is not applied twice. */
  wrapperOffset?: number;
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  sceneSeason?: Season | null;
  sceneReady?: boolean;
  nightMode?: boolean;
  getTileGround?: (tileIndex: number) => TileGround | null;
};

/**
 * Hill SVG segments that tile either across the full content width (native scroll),
 * or based on viewport-offset tiling (simulated scroll).
 */
export function RepeatingSeasonGround({
  contentWidth,
  scrollLeft,
  tileWidth,
  viewportHeight,
  groundY,
  wrapperOffset = 0,
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  sceneSeason = null,
  nightMode = false,
  getTileGround,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const hillTop = getGardenHillTop(viewportHeight) - GARDEN_HILL_SKY_OVERLAP;
  const groundSvgH = getGardenHillSvgHeight(viewportHeight) + GARDEN_HILL_SKY_OVERLAP;
  const hillPaths = useMemo(() => buildHillPaths(tileWidth, groundSvgH), [tileWidth, groundSvgH]);

  const isSimulatedMode = scrollLeft !== undefined;

  const offset = isSimulatedMode ? gardenTileScrollOffset(scrollLeft, tileWidth) : 0;
  const startIndex = isSimulatedMode
    ? (tileWidth > 0 ? Math.floor(scrollLeft / tileWidth) - 1 : 0)
    : 0;
  const endIndex = isSimulatedMode
    ? (tileWidth > 0 ? Math.ceil((scrollLeft + tileWidth) / tileWidth) + 1 : startIndex + 3)
    : (tileWidth > 0 ? Math.ceil((contentWidth ?? tileWidth) / tileWidth) : 1);

  const indices = useMemo(() => {
    const list: number[] = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      list.push(i);
    }
    return list;
  }, [startIndex, endIndex]);

  const containerWidth = isSimulatedMode ? '100%' : (contentWidth ?? '100%');

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-0 overflow-hidden"
      aria-hidden
      style={{ width: containerWidth, height: viewportHeight }}
    >
      {indices.map((tileIndex) => {
        const tileGround = getTileGround?.(tileIndex);
        const tileMonth = tileGround?.month ?? month;
        const tileSeed = tileGround?.groundSeed ?? groundSeed;
        const tileVariant = tileGround?.groundVariant ?? variant;
        const baseGroundStyle = getGroundStyle(tileVariant);
        const hillsSeason = tileGround?.season ?? sceneSeason ?? getSeason(tileMonth);
        const sceneHills = nightMode ? getNightHillColors() : getHillColors(hillsSeason);
        const groundStyle = {
          ...baseGroundStyle,
          backTop: sceneHills.far,
          backBottom: sceneHills.far,
          midTop: sceneHills.mid,
          midBottom: sceneHills.mid,
          frontTop: sceneHills.near,
          frontBottom: nightMode ? NIGHT_MEADOW_BASE : sceneHills.near,
        };
        const x = isSimulatedMode
          ? tileIndex * tileWidth - offset + wrapperOffset
          : tileIndex * tileWidth;
        const gradId = `hill-${tileIndex}-${tileSeed}`;

        return (
          <React.Fragment key={tileIndex}>
            <div
              className="absolute"
              style={{
                left: x,
                top: hillTop,
                width: tileWidth,
                height: viewportHeight - hillTop,
                backgroundColor: groundStyle.frontBottom,
              }}
            />
            {nightMode ? (
              <div
                className="absolute"
                style={{
                  left: x,
                  top: Math.max(0, hillTop - GARDEN_HILL_SKY_OVERLAP),
                  width: tileWidth,
                  height: GARDEN_HILL_SKY_OVERLAP,
                  backgroundColor: NIGHT_MEADOW_BASE,
                }}
              />
            ) : null}
            <div
              className="absolute"
              style={{
                left: x,
                top: hillTop,
                width: tileWidth,
                height: viewportHeight - hillTop,
                backgroundColor: nightMode ? 'rgba(25, 66, 24, 0.18)' : groundStyle.haze,
                opacity: nightMode ? 1 : 0.22,
              }}
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
            <div
              className="pointer-events-none absolute"
              style={{
                left: x,
                width: tileWidth,
                height: viewportHeight,
                top: 0,
              }}
            >
              {groundY !== undefined && (
                <>
                  <GroundTexture
                    width={tileWidth}
                    height={180}
                    groundY={groundY + 4}
                    variant={tileVariant}
                    seed={tileSeed}
                  />
                  <GrassLayer
                    width={tileWidth}
                    height={180}
                    groundY={groundY + 4}
                    month={tileMonth}
                    seed={tileSeed}
                    density={24}
                    groundVariant={tileVariant}
                  />
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
