'use client';

import React, { useMemo } from 'react';

import { buildMeadowHills, getMeadowLightTint, mixHex } from '@/lib/scene/atmosphere';
import { useSceneContextOptional } from '@/lib/scene/SceneContext';
import { computeGroundVariant, getGroundStyle } from '@bloom/core/garden/ground';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { GARDEN_HILL_SKY_OVERLAP } from '@bloom/core/garden/horizon-layout';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { getHillColors, getNightHillColors, NIGHT_MEADOW_BASE } from '@bloom/core/scene';
import { SeededRNG } from '@bloom/core/flowers/seeded-rng';
import { getSeason } from '@bloom/core/theme/seasons';
import type { SilhouettePoint } from '@/lib/scene/atmosphere';
import type { GroundVariant, Season } from '@bloom/core';

type TileGround = {
  month: number;
  groundVariant: GroundVariant;
  groundSeed: number;
  season?: Season | null;
};

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

type HillTree = {
  x: number;
  y: number;
  scale: number;
  kind: 'round' | 'conifer';
};

/** Seeded tree/shrub silhouettes along a hill crest, clear of tile edges. */
function placeTrees(
  points: SilhouettePoint[],
  tileWidth: number,
  seed: number,
  count: number,
  scaleMin: number,
  scaleMax: number
): HillTree[] {
  const rng = new SeededRNG(seed);
  const usable = points.filter((p) => p.x > 48 && p.x < tileWidth - 48);
  if (usable.length === 0) return [];
  const trees: HillTree[] = [];
  const n = Math.max(0, Math.round(count + rng.range(-1, 1)));
  for (let i = 0; i < n; i += 1) {
    const p = usable[Math.floor(rng.next() * usable.length)]!;
    trees.push({
      x: p.x + rng.range(-14, 14),
      y: p.y + 2,
      scale: rng.range(scaleMin, scaleMax),
      kind: rng.next() < 0.72 ? 'round' : 'conifer',
    });
  }
  return trees.sort((a, b) => a.x - b.x);
}

function TreeSilhouette({ tree, fill, lit }: { tree: HillTree; fill: string; lit: string }) {
  const s = tree.scale;
  const { x, y } = tree;
  if (tree.kind === 'conifer') {
    return (
      <g>
        <path
          d={`M ${x} ${y - 22 * s}
              L ${x + 6.5 * s} ${y - 9 * s} L ${x + 3.5 * s} ${y - 9 * s}
              L ${x + 8.5 * s} ${y} L ${x - 8.5 * s} ${y}
              L ${x - 3.5 * s} ${y - 9 * s} L ${x - 6.5 * s} ${y - 9 * s} Z`}
          fill={fill}
        />
        <path
          d={`M ${x} ${y - 22 * s} L ${x - 3.2 * s} ${y - 12 * s} L ${x - 1 * s} ${y - 12 * s} Z`}
          fill={lit}
          opacity={0.5}
        />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - 1.1 * s} y={y - 6 * s} width={2.2 * s} height={6.5 * s} rx={s} fill={fill} />
      <circle cx={x - 4.5 * s} cy={y - 9 * s} r={5.5 * s} fill={fill} />
      <circle cx={x + 4.5 * s} cy={y - 9.5 * s} r={5 * s} fill={fill} />
      <circle cx={x} cy={y - 13 * s} r={6 * s} fill={fill} />
      <circle cx={x - 2 * s} cy={y - 14.5 * s} r={3.4 * s} fill={lit} opacity={0.4} />
    </g>
  );
}

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
  const scene = useSceneContextOptional();
  const lightTint = getMeadowLightTint(
    scene?.status === 'ready' ? scene.timePhase : 'day',
    scene?.weather?.category
  );
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const hillTop = getGardenHillTop(viewportHeight) - GARDEN_HILL_SKY_OVERLAP;
  const groundSvgH = getGardenHillSvgHeight(viewportHeight) + GARDEN_HILL_SKY_OVERLAP;
  const hills = useMemo(
    () => (tileWidth > 0 ? buildMeadowHills(tileWidth, groundSvgH) : null),
    [tileWidth, groundSvgH]
  );

  const isSimulatedMode = scrollLeft !== undefined;

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
        const seasonHills = nightMode ? getNightHillColors() : getHillColors(hillsSeason);
        // Bend the greens toward the sky's light (dawn rose, golden amber, storm slate)
        const sceneHills = nightMode
          ? seasonHills
          : {
              far: mixHex(seasonHills.far, lightTint.color, lightTint.far),
              mid: mixHex(seasonHills.mid, lightTint.color, lightTint.mid),
              near: mixHex(seasonHills.near, lightTint.color, lightTint.near),
            };
        const meadowBase = nightMode ? NIGHT_MEADOW_BASE : sceneHills.near;

        const backTop = mixHex(sceneHills.far, '#ffffff', nightMode ? 0.06 : 0.3);
        const backBottom = mixHex(sceneHills.far, nightMode ? '#0a1410' : '#2a4a33', 0.22);
        const midTop = mixHex(sceneHills.mid, '#ffffff', nightMode ? 0.04 : 0.16);
        const midBottom = mixHex(sceneHills.mid, nightMode ? '#0a1410' : '#22361c', 0.26);
        const frontTop = mixHex(sceneHills.near, '#ffffff', nightMode ? 0.03 : 0.1);
        const frontBottom = nightMode
          ? NIGHT_MEADOW_BASE
          : mixHex(sceneHills.near, '#1f2c18', 0.26);

        const treeFill = nightMode
          ? mixHex(sceneHills.near, '#06140c', 0.6)
          : mixHex(sceneHills.mid, '#15241a', 0.52);
        const treeLit = nightMode
          ? mixHex(sceneHills.near, '#1d3a52', 0.35)
          : mixHex(sceneHills.mid, '#f5ecc8', 0.4);

        // Tile i covers world [i*w, (i+1)*w); screen x = world − scroll
        const x = isSimulatedMode
          ? tileIndex * tileWidth - scrollLeft + wrapperOffset
          : tileIndex * tileWidth;
        const gradId = `hill-${tileIndex}-${tileSeed}`;

        const backTrees = hills
          ? placeTrees(hills.back.points, tileWidth, tileSeed * 31 + 1, 6, 0.7, 1.1)
          : [];
        const midTrees = hills
          ? placeTrees(hills.mid.points, tileWidth, tileSeed * 31 + 2, 4, 1.1, 1.7)
          : [];

        return (
          <React.Fragment key={tileIndex}>
            <div
              className="absolute"
              style={{
                left: x,
                top: hillTop,
                width: tileWidth,
                height: viewportHeight - hillTop,
                backgroundColor: frontBottom,
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
                backgroundColor: nightMode ? 'rgba(25, 66, 24, 0.18)' : baseGroundStyle.haze,
                opacity: nightMode ? 1 : 0.22,
              }}
            />
            {hills ? (
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
                    <stop offset="0%" stopColor={backTop} />
                    <stop offset="100%" stopColor={backBottom} />
                  </linearGradient>
                  <linearGradient id={`${gradId}-mid`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={midTop} />
                    <stop offset="55%" stopColor={sceneHills.mid} />
                    <stop offset="100%" stopColor={midBottom} />
                  </linearGradient>
                  <linearGradient id={`${gradId}-front`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={frontTop} />
                    <stop offset="45%" stopColor={meadowBase} />
                    <stop offset="100%" stopColor={frontBottom} />
                  </linearGradient>
                  <linearGradient id={`${gradId}-horizon`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={nightMode ? 'rgba(150, 180, 235, 0.06)' : 'rgba(255, 250, 235, 0.3)'}
                    />
                    <stop offset="100%" stopColor="rgba(255, 250, 235, 0)" />
                  </linearGradient>
                </defs>

                <path
                  d={hills.back.fill}
                  fill={`url(#${gradId}-back)`}
                  opacity={tileVariant === 3 ? 0.85 : 0.74}
                />
                <path
                  d={hills.back.crest}
                  fill="none"
                  stroke={mixHex(backTop, '#ffffff', nightMode ? 0.1 : 0.4)}
                  strokeWidth={1.2}
                  strokeOpacity={0.45}
                />
                <g opacity={0.8}>
                  {backTrees.map((tree, i) => (
                    <TreeSilhouette key={`bt-${i}`} tree={tree} fill={treeFill} lit={treeLit} />
                  ))}
                </g>

                {/* Horizon light pooling on the far slope */}
                <rect
                  x={0}
                  y={0}
                  width={tileWidth}
                  height={groundSvgH * 0.3}
                  fill={`url(#${gradId}-horizon)`}
                />

                <path d={hills.mid.fill} fill={`url(#${gradId}-mid)`} opacity={0.92} />
                <path
                  d={hills.mid.crest}
                  fill="none"
                  stroke={mixHex(midTop, '#ffffff', nightMode ? 0.08 : 0.35)}
                  strokeWidth={1.3}
                  strokeOpacity={0.4}
                />
                <g opacity={0.92}>
                  {midTrees.map((tree, i) => (
                    <TreeSilhouette key={`mt-${i}`} tree={tree} fill={treeFill} lit={treeLit} />
                  ))}
                </g>

                <path d={hills.front.fill} fill={`url(#${gradId}-front)`} />
                <path
                  d={hills.front.crest}
                  fill="none"
                  stroke={mixHex(frontTop, '#ffffff', nightMode ? 0.06 : 0.3)}
                  strokeWidth={1.4}
                  strokeOpacity={0.35}
                />
              </svg>
            ) : null}
            <div
              className="pointer-events-none absolute"
              style={{
                left: x,
                width: tileWidth,
                height: viewportHeight,
                top: 0,
                opacity: nightMode ? 0.45 : 1,
                filter: nightMode ? 'brightness(0.65) saturate(0.8)' : undefined,
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
