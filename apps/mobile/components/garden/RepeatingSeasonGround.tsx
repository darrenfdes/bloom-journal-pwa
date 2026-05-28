import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildHillPaths } from '@bloom/core/garden/season-hills';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { computeGroundVariant, getGroundStyle } from '@/lib/garden/ground';
import { getHillColors, type Season } from '@bloom/core';
import { getSeason } from '@/lib/theme/seasons';
import type { GroundVariant } from '@/lib/types';

type TileGround = {
  month: number;
  groundVariant: GroundVariant;
  groundSeed: number;
  season?: Season | null;
};

type Props = {
  scrollLeft: number;
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

export function gardenTileScrollOffset(scrollLeft: number, tileWidth: number): number {
  return tileScrollOffset(scrollLeft, tileWidth);
}

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
  const hills = useMemo(() => buildHillPaths(tileWidth, groundSvgH), [tileWidth, groundSvgH]);

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
    <View style={[styles.root, { height: viewportHeight }]} pointerEvents="none">
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
        const gradPrefix = `m-${tileIndex}-${tileSeed}`;

        return (
          <React.Fragment key={tileIndex}>
            <View
              style={[
                styles.meadowBase,
                {
                  left: x,
                  top: hillTop,
                  width: tileWidth,
                  height: viewportHeight - hillTop,
                  backgroundColor: groundStyle.frontBottom,
                },
              ]}
            />
            <View
              style={[
                styles.hazeTile,
                { left: x, width: tileWidth, backgroundColor: groundStyle.haze, opacity: 0.22 },
              ]}
            />
            <Svg
              width={tileWidth}
              height={groundSvgH}
              style={[styles.tile, { left: x, top: hillTop }]}
              viewBox={`0 0 ${tileWidth} ${groundSvgH}`}
              preserveAspectRatio="none"
            >
              <Defs>
                <LinearGradient id={`${gradPrefix}-back`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={groundStyle.backTop} stopOpacity="1" />
                  <Stop offset="100%" stopColor={groundStyle.backBottom} stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id={`${gradPrefix}-mid`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={groundStyle.midTop} stopOpacity="1" />
                  <Stop offset="100%" stopColor={groundStyle.midBottom} stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id={`${gradPrefix}-front`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={groundStyle.frontTop} stopOpacity="1" />
                  <Stop offset="100%" stopColor={groundStyle.frontBottom} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Path
                d={hills.backHill}
                fill={`url(#${gradPrefix}-back)`}
                opacity={tileVariant === 3 ? 0.82 : 0.7}
              />
              <Path d={hills.midHill} fill={`url(#${gradPrefix}-mid)`} opacity={0.88} />
              <Path d={hills.frontHill} fill={`url(#${gradPrefix}-front)`} />
            </Svg>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
  },
  meadowBase: {
    position: 'absolute',
  },
  hazeTile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
