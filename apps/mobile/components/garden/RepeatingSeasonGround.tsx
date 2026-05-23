import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildHillPaths } from '@bloom/core/garden/season-hills';
import {
  getGardenHillSvgHeight,
  getGardenHillTop,
} from '@bloom/core/garden/scene-layout';
import { computeGroundVariant, getGroundStyle } from '@/lib/garden/ground';
import type { GroundVariant } from '@/lib/types';

type Props = {
  scrollLeft: number;
  tileWidth: number;
  viewportHeight: number;
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
};

export function RepeatingSeasonGround({
  scrollLeft,
  tileWidth,
  viewportHeight,
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const groundStyle = getGroundStyle(variant);
  const groundSvgH = viewportHeight * 0.7;
  const skyH = viewportHeight * 0.5;
  const hills = useMemo(() => buildHillPaths(tileWidth, groundSvgH), [tileWidth, groundSvgH]);

  const offset = scrollLeft % tileWidth;
  const startIndex = Math.floor(scrollLeft / tileWidth) - 1;
  const indices = [startIndex, startIndex + 1, startIndex + 2, startIndex + 3];

  return (
    <View style={[styles.root, { height: viewportHeight }]} pointerEvents="none">
      {indices.map((tileIndex) => {
        const x = tileIndex * tileWidth - offset;
        const gradPrefix = `m-${tileIndex}-${groundSeed}`;

        return (
          <Svg
            key={tileIndex}
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
              opacity={variant === 3 ? 0.82 : 0.7}
            />
            <Path d={hills.midHill} fill={`url(#${gradPrefix}-mid)`} opacity={0.88} />
            <Path d={hills.frontHill} fill={`url(#${gradPrefix}-front)`} />
          </Svg>
        );
      })}
      <View style={[styles.haze, { backgroundColor: groundStyle.haze }]} />
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
  haze: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
});
