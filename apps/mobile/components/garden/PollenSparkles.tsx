import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SeededRNG } from '@/lib/flowers/seeded-rng';

type SparkleProps = {
  x: number;
  y: number;
  delay: number;
  duration: number;
  driftX: number;
};

const Sparkle = ({ x, y, delay, duration, driftX }: SparkleProps) => {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: duration * 0.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    ty.value = withDelay(
      delay,
      withRepeat(
        withTiming(-80, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    tx.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(driftX, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-driftX, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [delay, driftX, duration, opacity, tx, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return <Animated.View style={[styles.sparkle, { left: x, top: y }, style]} />;
};

type Props = {
  width: number;
  height: number;
  count?: number;
  seed?: number;
};

export function PollenSparkles({ width, height, count = 14, seed = 4242 }: Props) {
  const sparkles = useMemo(() => {
    const rng = new SeededRNG(seed);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: rng.range(0, width),
      y: rng.range(height * 0.2, height * 0.85),
      delay: Math.floor(rng.range(0, 4000)),
      duration: Math.floor(rng.range(6000, 12000)),
      driftX: rng.range(-18, 18),
    }));
  }, [count, height, seed, width]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      {sparkles.map((s) => {
        const { key, ...rest } = s;
        return <Sparkle key={key} {...rest} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 240, 200, 0.85)',
    shadowColor: '#FFE9A6',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
