import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, ClipPath, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { getNightMoonLayout, getNightMountainSvgPaths, NIGHT_MOON_CRATERS } from '@bloom/core/scene';

type SkyBandProps = {
  width?: number;
  skyBandHeight: number;
};

/** Reference night sky gradient — fixed behind stars and mountains. */
export function NightSkyBand({ width, skyBandHeight }: SkyBandProps) {
  const W = width ?? Dimensions.get('window').width;

  return (
    <View
      style={[styles.skyRoot, { height: skyBandHeight }]}
      pointerEvents="none"
    >
      <Svg width={W} height={skyBandHeight} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="nightSkyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#070d1c" stopOpacity="1" />
            <Stop offset="100%" stopColor="#11203a" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={skyBandHeight} fill="url(#nightSkyGrad)" />
      </Svg>
    </View>
  );
};

type MountainBandProps = SkyBandProps & {
  sceneHeight: number;
};

/** Distant mountain silhouettes — drawn above stars, below meadow pan. */
export function NightMountainBand({ width, skyBandHeight, sceneHeight }: MountainBandProps) {
  const W = width ?? Dimensions.get('window').width;
  const paths = useMemo(
    () => getNightMountainSvgPaths(W, sceneHeight, skyBandHeight),
    [W, sceneHeight, skyBandHeight]
  );

  return (
    <View
      style={[styles.skyRoot, { height: skyBandHeight }]}
      pointerEvents="none"
    >
      <Svg width={W} height={skyBandHeight} style={StyleSheet.absoluteFill}>
        <Path d={paths.back} fill="#172535" />
        <Path d={paths.mid} fill="#1c2e42" />
      </Svg>
    </View>
  );
}

type MoonBandProps = SkyBandProps & {
  sceneHeight: number;
};

/** Moon with craters — rendered above distant mountain silhouettes. */
export function NightMoonBand({ width, skyBandHeight, sceneHeight }: MoonBandProps) {
  const W = width ?? Dimensions.get('window').width;
  const { mx, my, mr } = useMemo(
    () => getNightMoonLayout(W, skyBandHeight, sceneHeight),
    [W, skyBandHeight, sceneHeight]
  );
  const svgSize = mr * 2;
  const left = mx - mr;
  const top = my - mr;

  return (
    <View
      style={[styles.skyRoot, styles.moonLayer, { height: skyBandHeight }]}
      pointerEvents="none"
    >
      <Svg
        width={svgSize}
        height={svgSize}
        style={{ position: 'absolute', left, top }}
      >
        <Defs>
          <RadialGradient id="moonDisc" cx="35%" cy="32%" r="65%">
            <Stop offset="0%" stopColor="#f4f6ff" />
            <Stop offset="55%" stopColor="#dde2f0" />
            <Stop offset="100%" stopColor="#b8bfd4" />
          </RadialGradient>
          <ClipPath id="moonClip">
            <Circle cx={mr} cy={mr} r={mr} />
          </ClipPath>
        </Defs>
        <Circle cx={mr} cy={mr} r={mr} fill="url(#moonDisc)" />
        {NIGHT_MOON_CRATERS.map(({ dx, dy, r, shade = 0.22 }, i) => (
          <Circle
            key={i}
            cx={mr + mr * dx}
            cy={mr + mr * dy}
            r={mr * r}
            fill={`rgba(96,104,136,${shade})`}
            clipPath="url(#moonClip)"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  skyRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  moonLayer: {
    zIndex: 3,
  },
});
