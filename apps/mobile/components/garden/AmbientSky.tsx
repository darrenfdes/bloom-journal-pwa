import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { useSceneContext } from '@/lib/scene/SceneContext';
import { getSeason } from '@/lib/theme/seasons';
import { getWeatherClouds, isNightPhase, isSunPhase } from '@bloom/core/scene';

type CloudProps = {
  startX: number;
  endX: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
};

const AnimatedCloud = ({ startX, endX, y, scale, opacity, duration, delay }: CloudProps) => {
  const tx = useSharedValue(startX);

  useEffect(() => {
    tx.value = startX;
    tx.value = withDelay(
      delay,
      withRepeat(withTiming(endX, { duration, easing: Easing.linear }), -1, false)
    );
  }, [delay, duration, endX, startX, tx]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { scale }],
    opacity,
  }));

  return (
    <Animated.View style={[styles.cloudWrap, { left: 0, top: y }, style]}>
      <Svg width={120} height={50} viewBox="0 0 120 50">
        <Ellipse cx="35" cy="32" rx="28" ry="14" fill="rgba(255,255,255,0.72)" />
        <Ellipse cx="65" cy="24" rx="34" ry="18" fill="rgba(255,255,255,0.82)" />
        <Ellipse cx="92" cy="32" rx="22" ry="12" fill="rgba(255,255,255,0.68)" />
      </Svg>
    </Animated.View>
  );
};

export function AmbientSky({
  month = new Date().getMonth() + 1,
  skyHeight = 260,
}: {
  month?: number;
  skyHeight?: number;
}) {
  const scene = useSceneContext();
  const { width } = Dimensions.get('window');
  const mountainH = Math.min(140, Math.round(skyHeight * 0.45));
  const season = getSeason(month);
  const sunY = 60;
  const sunX = width * 0.78;
  const sunR = 36;
  const isWarm = season === 'summer' || season === 'spring';

  const cloudCover = scene.weather?.cloudCover ?? 35;
  const clouds = useMemo(
    () =>
      scene.status === 'ready' && isNightPhase(scene.timePhase)
        ? []
        : getWeatherClouds(cloudCover, width),
    [cloudCover, width, scene.status, scene.timePhase]
  );

  const sunPulse = useSharedValue(1);
  useEffect(() => {
    sunPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 3600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [sunPulse]);

  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sunPulse.value }],
  }));
  const showSun =
    scene.status === 'ready' && isSunPhase(scene.timePhase) && scene.timePhase !== 'dawn';

  return (
    <View style={[styles.root, { height: skyHeight }]} pointerEvents="none">
      {showSun ? (
        <Animated.View style={[styles.sunWrap, { left: sunX - sunR, top: sunY - sunR }, sunStyle]}>
          <Svg width={sunR * 2} height={sunR * 2}>
            <Defs>
              <RadialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={isWarm ? '#FFF6CE' : '#F3EBD8'} stopOpacity="1" />
                <Stop offset="55%" stopColor={isWarm ? '#FFE5A0' : '#E2DAC6'} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={isWarm ? '#FFCC78' : '#C7BFAA'} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={sunR} cy={sunR} r={sunR * 0.9} fill="url(#sunGrad)" />
            <Circle cx={sunR} cy={sunR} r={sunR * 0.45} fill={isWarm ? '#FFEFB8' : '#EFE6CE'} fillOpacity={0.8} />
          </Svg>
        </Animated.View>
      ) : null}

      <Svg
        width={width}
        height={mountainH}
        style={styles.mountains}
        viewBox={`0 0 ${width} ${mountainH}`}
        preserveAspectRatio="none"
      >
        <Path
          d={`M 0 ${mountainH * 0.75} L ${width * 0.18} ${mountainH * 0.42} L ${width * 0.3} ${mountainH * 0.65} L ${width * 0.42} ${mountainH * 0.32} L ${width * 0.55} ${mountainH * 0.58} L ${width * 0.68} ${mountainH * 0.35} L ${width * 0.82} ${mountainH * 0.63} L ${width} ${mountainH * 0.47} L ${width} ${mountainH} L 0 ${mountainH} Z`}
          fill="rgba(140, 160, 170, 0.38)"
        />
        <Path
          d={`M 0 ${mountainH * 0.92} L ${width * 0.22} ${mountainH * 0.65} L ${width * 0.4} ${mountainH * 0.83} L ${width * 0.58} ${mountainH * 0.6} L ${width * 0.75} ${mountainH * 0.8} L ${width} ${mountainH * 0.67} L ${width} ${mountainH} L 0 ${mountainH} Z`}
          fill="rgba(120, 145, 145, 0.45)"
        />
      </Svg>

      {clouds.map((cloud, i) => (
        <AnimatedCloud key={i} {...cloud} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sunWrap: {
    position: 'absolute',
  },
  cloudWrap: {
    position: 'absolute',
  },
  mountains: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.95,
  },
});
