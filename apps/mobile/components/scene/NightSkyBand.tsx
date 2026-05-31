import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, ClipPath, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import {
  getMoonPhaseShadowSvgPath,
  getNightMoonCraterGeometry,
  getNightMoonLayout,
  getNightMountainSvgPaths,
  NIGHT_MOON_CRATER_DETAIL_MIN_R,
  NIGHT_MOON_CRATERS,
  type MoonPhaseState,
} from '@bloom/core/scene';

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
        <Path d={paths.mid} fill="#1c2e42" />
      </Svg>
    </View>
  );
}

type MoonBandProps = SkyBandProps & {
  sceneHeight: number;
  moonPhase: MoonPhaseState;
  latitude?: number;
};

/** Moon with craters — rendered above distant mountain silhouettes. */
export function NightMoonBand({
  width,
  skyBandHeight,
  sceneHeight,
  moonPhase,
  latitude = 0,
}: MoonBandProps) {
  const W = width ?? Dimensions.get('window').width;
  const { mx, my, mr } = useMemo(
    () => getNightMoonLayout(W, skyBandHeight, sceneHeight),
    [W, skyBandHeight, sceneHeight]
  );
  const svgSize = mr * 2;
  const left = mx - mr;
  const top = my - mr;
  const shadowPath = useMemo(
    () => getMoonPhaseShadowSvgPath(mr, moonPhase, latitude),
    [mr, moonPhase, latitude]
  );

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
        {NIGHT_MOON_CRATERS.map((crater, i) => {
          const { cx, cy, rx, ry, depth } = getNightMoonCraterGeometry(mr, mr, mr, crater);
          const bowlR = Math.max(rx, ry);
          const showDetail = crater.r >= NIGHT_MOON_CRATER_DETAIL_MIN_R;
          const bowlId = `craterBowl-${i}`;
          const rimId = `craterRim-${i}`;
          const shadowId = `craterShadow-${i}`;
          const rimCx = cx - rx * 0.28;
          const rimCy = cy - ry * 0.32;
          const shadowCx = cx + rx * 0.22;
          const shadowCy = cy + ry * 0.26;

          return (
            <React.Fragment key={i}>
              <Defs>
                <RadialGradient
                  id={bowlId}
                  gradientUnits="userSpaceOnUse"
                  cx={cx}
                  cy={cy}
                  r={bowlR}
                >
                  <Stop offset="0%" stopColor={`rgba(58,64,88,${0.28 + depth * 0.3})`} />
                  <Stop offset="45%" stopColor={`rgba(78,84,108,${0.12 + depth * 0.14})`} />
                  <Stop offset="78%" stopColor={`rgba(108,116,142,${0.04 + depth * 0.06})`} />
                  <Stop offset="100%" stopColor="rgba(120,128,155,0)" />
                </RadialGradient>
                {showDetail ? (
                  <>
                    <RadialGradient
                      id={rimId}
                      gradientUnits="userSpaceOnUse"
                      cx={rimCx}
                      cy={rimCy}
                      r={bowlR * 0.72}
                    >
                      <Stop offset="0%" stopColor={`rgba(228,234,248,${0.16 + depth * 0.08})`} />
                      <Stop offset="50%" stopColor="rgba(196,204,224,0.06)" />
                      <Stop offset="100%" stopColor="rgba(196,204,224,0)" />
                    </RadialGradient>
                    <RadialGradient
                      id={shadowId}
                      gradientUnits="userSpaceOnUse"
                      cx={shadowCx}
                      cy={shadowCy}
                      r={bowlR * 0.55}
                    >
                      <Stop offset="0%" stopColor={`rgba(48,54,76,${0.08 + depth * 0.1})`} />
                      <Stop offset="60%" stopColor="rgba(48,54,76,0)" />
                    </RadialGradient>
                  </>
                ) : null}
              </Defs>
              <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${bowlId})`} clipPath="url(#moonClip)" />
              {showDetail ? (
                <>
                  <Ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx * 0.88}
                    ry={ry * 0.88}
                    fill={`url(#${rimId})`}
                    clipPath="url(#moonClip)"
                  />
                  <Ellipse
                    cx={cx}
                    cy={cy}
                    rx={rx * 0.72}
                    ry={ry * 0.72}
                    fill={`url(#${shadowId})`}
                    clipPath="url(#moonClip)"
                  />
                </>
              ) : null}
            </React.Fragment>
          );
        })}
          {shadowPath ? (
            <Path d={shadowPath} fill="#070d1c" clipPath="url(#moonClip)" />
          ) : null}
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
