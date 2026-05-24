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
import { getWeatherClouds, isNightPhase } from '@bloom/core/scene';

type CloudProps = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
};

const AnimatedCloud = ({ x, y, scale, opacity, duration, delay, drift }: CloudProps) => {
  const tx = useSharedValue(0);

  useEffect(() => {
    tx.value = withDelay(
      delay,
      withRepeat(withTiming(drift, { duration, easing: Easing.linear }), -1, false)
    );
  }, [delay, drift, duration, tx]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { scale }],
    opacity,
  }));

  return (
    <Animated.View style={[styles.cloudWrap, { left: x, top: y }, style]}>
      <Svg width={120} height={50} viewBox="0 0 120 50">
        <Ellipse cx="35" cy="32" rx="28" ry="14" fill="rgba(255,255,255,0.72)" />
        <Ellipse cx="65" cy="24" rx="34" ry="18" fill="rgba(255,255,255,0.82)" />
        <Ellipse cx="92" cy="32" rx="22" ry="12" fill="rgba(255,255,255,0.68)" />
      </Svg>
    </Animated.View>
  );
};

export function AmbientSky({ month = new Date().getMonth() + 1 }: { month?: number }) {
  const scene = useSceneContext();
  const { width } = Dimensions.get('window');
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

  return (
    <View style={styles.root} pointerEvents="none">
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

      <Svg
        width={width}
        height={120}
        style={styles.mountains}
        viewBox={`0 0 ${width} 120`}
        preserveAspectRatio="none"
      >
        <Path
          d={`M 0 90 L ${width * 0.18} 50 L ${width * 0.3} 78 L ${width * 0.42} 38 L ${width * 0.55} 70 L ${width * 0.68} 42 L ${width * 0.82} 76 L ${width} 56 L ${width} 120 L 0 120 Z`}
          fill="rgba(140, 160, 170, 0.32)"
        />
        <Path
          d={`M 0 110 L ${width * 0.22} 78 L ${width * 0.4} 100 L ${width * 0.58} 72 L ${width * 0.75} 96 L ${width} 80 L ${width} 120 L 0 120 Z`}
          fill="rgba(120, 145, 145, 0.38)"
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
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
