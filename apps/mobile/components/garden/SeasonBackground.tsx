import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AmbientSky } from '@/components/garden/AmbientSky';
import { computeGroundVariant, getGroundStyle } from '@/lib/garden/ground';
import { getSeasonPalette } from '@/lib/theme/seasons';
import type { GroundVariant } from '@/lib/types';

type Props = {
  month?: number;
  groundVariant?: GroundVariant;
  groundSeed?: number;
  children: React.ReactNode;
};

export function SeasonBackground({
  month = new Date().getMonth() + 1,
  groundVariant,
  groundSeed = 0,
  children,
}: Props) {
  const variant = groundVariant ?? computeGroundVariant(month, groundSeed);
  const groundStyle = getGroundStyle(variant);
  const { sky, ground, season } = getSeasonPalette(month);
  const { width, height } = Dimensions.get('window');

  const skyH = height * 0.5;
  const groundSvgH = height * 0.7;

  const horizonGlow =
    variant === 4
      ? '#F8E4B0'
      : season === 'spring'
        ? '#FDE9C9'
        : season === 'summer'
          ? '#FFE3B0'
          : season === 'autumn'
            ? '#F4C794'
            : '#E2DCE6';

  const backHill = `M 0 ${groundSvgH * 0.42}
    C ${width * 0.15} ${groundSvgH * 0.34} ${width * 0.32} ${groundSvgH * 0.46} ${width * 0.5} ${groundSvgH * 0.4}
    C ${width * 0.7} ${groundSvgH * 0.32} ${width * 0.85} ${groundSvgH * 0.5} ${width} ${groundSvgH * 0.42}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const midHill = `M 0 ${groundSvgH * 0.55}
    C ${width * 0.2} ${groundSvgH * 0.45} ${width * 0.4} ${groundSvgH * 0.6} ${width * 0.55} ${groundSvgH * 0.5}
    C ${width * 0.75} ${groundSvgH * 0.4} ${width * 0.88} ${groundSvgH * 0.55} ${width} ${groundSvgH * 0.48}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const frontHill = `M 0 ${groundSvgH * 0.7}
    C ${width * 0.18} ${groundSvgH * 0.6} ${width * 0.35} ${groundSvgH * 0.72} ${width * 0.5} ${groundSvgH * 0.66}
    C ${width * 0.72} ${groundSvgH * 0.58} ${width * 0.88} ${groundSvgH * 0.72} ${width} ${groundSvgH * 0.66}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

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

      <Svg
        width={width}
        height={groundSvgH}
        style={[styles.hillSvg, { top: skyH * 0.7 }]}
        viewBox={`0 0 ${width} ${groundSvgH}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="backHillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={groundStyle.backTop} stopOpacity="1" />
            <Stop offset="100%" stopColor={groundStyle.backBottom} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="midHillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={groundStyle.midTop} stopOpacity="1" />
            <Stop offset="100%" stopColor={groundStyle.midBottom} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="frontHillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={groundStyle.frontTop} stopOpacity="1" />
            <Stop offset="100%" stopColor={groundStyle.frontBottom} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path d={backHill} fill="url(#backHillGrad)" opacity={variant === 3 ? 0.82 : 0.7} />
        <Path d={midHill} fill="url(#midHillGrad)" opacity={0.88} />
        <Path d={frontHill} fill="url(#frontHillGrad)" />
      </Svg>

      <View style={[styles.haze, { backgroundColor: groundStyle.haze }]} pointerEvents="none" />

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
  hillSvg: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  haze: {
    ...StyleSheet.absoluteFillObject,
  },
});
