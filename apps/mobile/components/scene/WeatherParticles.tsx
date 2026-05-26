import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  generatePetalDriftSpecs,
  generateRicklerRainRows,
  getLightningIntervalMs,
  isPrecipitatingCategory,
  shouldShowLightning,
  shouldShowPetals,
} from '@bloom/core';
import type { PetalDriftSpec, RicklerRainDropSpec, WeatherCategory } from '@bloom/core';

import { useSceneContext } from '@/lib/scene/SceneContext';

function RicklerDropMobile({
  drop,
  side,
  fallDistance,
  reducedMotion,
}: {
  drop: RicklerRainDropSpec;
  side: 'left' | 'right';
  fallDistance: number;
  reducedMotion: boolean;
}) {
  const y = useSharedValue(0);
  const stemOpacity = useSharedValue(1);
  const splatScale = useSharedValue(0);
  const splatOpacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    const durationMs = drop.durationSec * 1000;
    const delayMs = drop.delaySec * 1000;

    y.value = 0;
    stemOpacity.value = 1;
    splatScale.value = 0;
    splatOpacity.value = 1;

    y.value = withDelay(
      delayMs,
      withRepeat(withTiming(fallDistance * 0.9, { duration: durationMs }), -1, false)
    );
    stemOpacity.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(0, { duration: durationMs * 0.75 }),
        -1,
        false
      )
    );
    splatScale.value = withDelay(
      delayMs + durationMs * 0.8,
      withRepeat(
        withTiming(1.5, { duration: durationMs * 0.2 }),
        -1,
        false
      )
    );
    splatOpacity.value = withDelay(
      delayMs + durationMs * 0.8,
      withRepeat(
        withTiming(0, { duration: durationMs * 0.2 }),
        -1,
        false
      )
    );
  }, [drop, fallDistance, reducedMotion, splatOpacity, splatScale, stemOpacity, y]);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  const stemStyle = useAnimatedStyle(() => ({ opacity: stemOpacity.value }));
  const splatStyle = useAnimatedStyle(() => ({
    opacity: splatOpacity.value,
    transform: [{ scale: splatScale.value }],
  }));

  if (reducedMotion) return null;

  const horizontal = side === 'left' ? { left: `${drop.horizontalPct}%` } : { right: `${drop.horizontalPct}%` };

  return (
    <Animated.View
      style={[styles.ricklerDrop, horizontal, { bottom: `${drop.bottomPct}%` }, dropStyle]}
    >
      <Animated.View style={[styles.ricklerStem, stemStyle]} />
      <Animated.View style={[styles.ricklerSplat, splatStyle]} />
    </Animated.View>
  );
}

function PetalDriftMobile({
  petal,
  driftDistance,
  reducedMotion,
}: {
  petal: PetalDriftSpec;
  driftDistance: number;
  reducedMotion: boolean;
}) {
  const x = useSharedValue(-20);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    const durationMs = petal.durationSec * 1000;
    const delayMs = petal.delaySec * 1000;

    x.value = -20;
    rotate.value = 0;

    x.value = withDelay(
      delayMs,
      withRepeat(withTiming(driftDistance, { duration: durationMs }), -1, false)
    );
    rotate.value = withDelay(
      delayMs,
      withRepeat(withTiming(360, { duration: durationMs }), -1, false)
    );
  }, [petal, driftDistance, reducedMotion, rotate, x]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (reducedMotion) return null;

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          top: `${petal.topPct}%`,
          width: petal.size,
          height: petal.size * 0.7,
          backgroundColor: petal.color,
        },
        driftStyle,
      ]}
    />
  );
}

export function WeatherParticles() {
  const { weather, season, status } = useSceneContext();
  const [flash, setFlash] = useState(false);
  const [boltX, setBoltX] = useState(50);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ready = status === 'ready';
  const category = weather?.category ?? 'clear';
  const windSpeed = weather?.windSpeed ?? 0;
  const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!ready || !shouldShowLightning(category) || reducedMotion) {
      setFlash(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const { min, max } = getLightningIntervalMs(category);

    const schedule = () => {
      const delay = min + Math.random() * (max - min);
      timeoutId = setTimeout(() => {
        setBoltX(8 + Math.random() * 84);
        setFlash(true);
        setTimeout(() => setFlash(false), 180);
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [ready, category, reducedMotion]);

  const rows = useMemo(
    () => (isPrecipitatingCategory(category) ? generateRicklerRainRows(category) : null),
    [category]
  );
  const petals = useMemo(() => generatePetalDriftSpecs(), []);

  if (!ready) return null;

  const showRain = isPrecipitatingCategory(category);
  const showPetals = shouldShowPetals(season, category, windSpeed);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap]}>
      {showRain && reducedMotion ? (
        <View style={[styles.rainStatic, { opacity: 0.25 }]} />
      ) : null}
      {showRain && rows && !reducedMotion ? (
        <>
          <View style={styles.rainFrontRow}>
            {rows.front.slice(0, 55).map((drop) => (
              <RicklerDropMobile
                key={drop.id}
                drop={drop}
                side="left"
                fallDistance={windowHeight}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
          <View style={styles.rainBackRow}>
            {rows.back.slice(0, 55).map((drop) => (
              <RicklerDropMobile
                key={drop.id}
                drop={drop}
                side="right"
                fallDistance={windowHeight}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
        </>
      ) : null}
      {flash && !reducedMotion ? (
        <>
          <View style={styles.flash} />
          <View style={styles.flashTint} />
          <View style={[styles.bolt, { left: `${boltX}%` }]} />
        </>
      ) : null}
      {category === 'snow'
        ? Array.from({ length: 40 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.snow,
                { left: `${(i * 17) % 100}%`, top: (i * 31) % windowHeight },
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
      {showPetals && !reducedMotion
        ? petals.map((petal) => (
            <PetalDriftMobile
              key={petal.id}
              petal={petal}
              driftDistance={windowWidth + 20}
              reducedMotion={reducedMotion}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 12 },
  rainStatic: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(70, 90, 115, 0.15)',
  },
  rainFrontRow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  rainBackRow: {
    ...StyleSheet.absoluteFillObject,
    bottom: 60,
    opacity: 0.5,
    zIndex: 1,
  },
  ricklerDrop: {
    position: 'absolute',
    width: 15,
    height: 120,
  },
  ricklerStem: {
    width: 1,
    height: '60%',
    marginLeft: 7,
    backgroundColor: 'rgba(220, 235, 255, 0.35)',
  },
  ricklerSplat: {
    width: 15,
    height: 10,
    borderTopWidth: 2,
    borderTopColor: 'rgba(220, 235, 255, 0.55)',
    borderStyle: 'dotted',
    borderRadius: 8,
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
    left: 0,
    borderRadius: 4,
    opacity: 0.85,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  flashTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 140, 220, 0.25)',
  },
  bolt: {
    position: 'absolute',
    top: '8%',
    width: 2,
    height: '32%',
    marginLeft: -1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#dce6ff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});
