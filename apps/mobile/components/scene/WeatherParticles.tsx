import { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getRainParticleCount } from '@bloom/core';
import type { WeatherCategory } from '@bloom/core';

import { useSceneContext } from '@/lib/scene/SceneContext';

function isRain(category: WeatherCategory): boolean {
  return category === 'drizzle' || category === 'rain' || category === 'heavy_rain';
}

function RainDrop({ left, delay }: { left: number; delay: number }) {
  const y = useSharedValue(-20);
  useEffect(() => {
    y.value = withRepeat(withTiming(800, { duration: 600 + delay * 100 }), -1, false);
  }, [y, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: '20deg' }],
  }));

  return (
    <Animated.View
      style={[styles.rain, { left: `${left}%` }, style]}
    />
  );
}

export function WeatherParticles() {
  const { weather, season, status } = useSceneContext();
  const [flash, setFlash] = useState(false);
  const ready = status === 'ready';
  const category = weather?.category ?? 'clear';
  const windSpeed = weather?.windSpeed ?? 0;
  const { height } = Dimensions.get('window');

  useEffect(() => {
    if (!ready || category !== 'thunderstorm') return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeoutId = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        schedule();
      }, 4000 + Math.random() * 8000);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [ready, category]);

  const rainCount = useMemo(() => Math.min(getRainParticleCount(category), 80), [category]);

  if (!ready) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      {flash ? <View style={styles.flash} /> : null}
      {isRain(category)
        ? Array.from({ length: rainCount }, (_, i) => (
            <RainDrop key={i} left={(i * 13) % 100} delay={i % 8} />
          ))
        : null}
      {category === 'snow'
        ? Array.from({ length: 40 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.snow,
                { left: `${(i * 17) % 100}%`, top: (i * 31) % height },
              ]}
            />
          ))
        : null}
      {season === 'autumn'
        ? Array.from({ length: 10 }, (_, i) => (
            <View
              key={`leaf-${i}`}
              style={[
                styles.leaf,
                { left: `${(i * 23) % 100}%`, backgroundColor: i % 2 ? '#e64a19' : '#bf360c' },
              ]}
            />
          ))
        : null}
      {season === 'spring' &&
      windSpeed > 8 &&
      (category === 'clear' || category === 'partly_cloudy')
        ? Array.from({ length: 6 }, (_, i) => (
            <View
              key={`petal-${i}`}
              style={[styles.petal, { top: `${(i * 15) % 50}%` }]}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 5 },
  rain: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 18,
    backgroundColor: 'rgba(174,214,241,0.6)',
  },
  snow: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  leaf: {
    position: 'absolute',
    top: -20,
    width: 12,
    height: 8,
    borderRadius: 6,
    opacity: 0.85,
  },
  petal: {
    position: 'absolute',
    left: -10,
    width: 8,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#f8bbd0',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
