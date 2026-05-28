import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AmbientSky } from '@/components/garden/AmbientSky';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { NightMountainBand, NightMoonBand, NightSkyBand } from '@/components/scene/NightSkyBand';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { computeGroundVariant } from '@/lib/garden/ground';
import { getHorizonGlow } from '@bloom/core/garden/season-hills';
import { computeSkyBandHeight } from '@bloom/core/garden/horizon-layout';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSeasonPalette } from '@/lib/theme/seasons';
import type { MoonPhaseState } from '@bloom/core/scene';
import type { GroundVariant } from '@/lib/types';

type Props = {
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  nightCanvasActive?: boolean;
  nightShowMoon?: boolean;
  moonPhase?: MoonPhaseState;
  moonLatitude?: number;
  /** Pan top offset from screen top (header + chrome). */
  panTopOffset?: number;
  /** Pan viewport height. */
  sceneHeight?: number;
  children: React.ReactNode;
};

/** Fixed sky only — hills tile in the scrolling world layer. */
export function SeasonBackground({
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  nightCanvasActive = false,
  nightShowMoon: _nightShowMoon = true,
  moonPhase,
  moonLatitude = 0,
  panTopOffset = 0,
  sceneHeight: sceneHeightProp,
  children,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const { sky, season } = getSeasonPalette(month);
  const { width, height: windowHeight } = Dimensions.get('window');
  const sceneHeight = sceneHeightProp ?? windowHeight;
  const skyBandHeight = nightCanvasActive
    ? computeSkyBandHeight(panTopOffset, sceneHeight)
    : panTopOffset + getGardenSkyHeight(sceneHeight);
  const daySkyH = getGardenSkyHeight(sceneHeight);
  const horizonGlow = getHorizonGlow(variant, season);

  return (
    <View style={styles.root}>
      {nightCanvasActive ? (
        <NightSkyBand width={width} skyBandHeight={skyBandHeight} />
      ) : (
        <View style={[styles.skyBand, { height: daySkyH }]}>
          <Svg
            width={width}
            height={daySkyH}
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${width} ${daySkyH}`}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={sky} stopOpacity="1" />
                <Stop offset="50%" stopColor={sky} stopOpacity="0.95" />
                <Stop offset="85%" stopColor={horizonGlow} stopOpacity="0.85" />
                <Stop offset="100%" stopColor={horizonGlow} stopOpacity="0.6" />
              </LinearGradient>
            </Defs>
            <Path d={`M 0 0 L ${width} 0 L ${width} ${daySkyH} L 0 ${daySkyH} Z`} fill="url(#skyGrad)" />
          </Svg>

          <SkyTimePhaseLayer />
          <CelestialLayer />
          <AmbientSky month={month} skyHeight={daySkyH} />
        </View>
      )}

      {nightCanvasActive ? (
        <>
          <CelestialLayer skyHeight={skyBandHeight} showMoon={false} />
          <NightMountainBand
            width={width}
            skyBandHeight={skyBandHeight}
            sceneHeight={sceneHeight}
          />
          {_nightShowMoon && moonPhase ? (
            <NightMoonBand
              width={width}
              skyBandHeight={skyBandHeight}
              sceneHeight={sceneHeight}
              moonPhase={moonPhase}
              latitude={moonLatitude}
            />
          ) : null}
        </>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  skyBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
