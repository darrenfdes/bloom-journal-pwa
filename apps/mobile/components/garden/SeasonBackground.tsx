import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AmbientSky } from '@/components/garden/AmbientSky';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { computeGroundVariant } from '@/lib/garden/ground';
import { getHorizonGlow } from '@bloom/core/garden/season-hills';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSeasonPalette } from '@/lib/theme/seasons';
import type { GroundVariant } from '@/lib/types';

type Props = {
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  children: React.ReactNode;
};

/** Fixed sky only — hills tile in the scrolling world layer. */
export function SeasonBackground({
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  children,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const { sky, season } = getSeasonPalette(month);
  const { width, height } = Dimensions.get('window');
  const skyH = getGardenSkyHeight(height);
  const horizonGlow = getHorizonGlow(variant, season);

  return (
    <View style={styles.root}>
      <Svg
        width={width}
        height={skyH}
        style={styles.sky}
        viewBox={`0 0 ${width} ${skyH}`}
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
        <Path d={`M 0 0 L ${width} 0 L ${width} ${skyH} L 0 ${skyH} Z`} fill="url(#skyGrad)" />
      </Svg>

      <AmbientSky month={month} />
      <SkyTimePhaseLayer />
      <CelestialLayer />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
