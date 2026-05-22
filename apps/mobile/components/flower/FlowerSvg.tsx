import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Flower } from '@/components/flower/Flower';
import { buildFlowerGenome } from '@/lib/flowers/genome';
import type { EntryRecord, FlowerGenome } from '@/lib/types';

type Props = {
  entry: EntryRecord;
  size?: number;
  animateBloom?: boolean;
  animateSway?: boolean;
  genomeOverride?: FlowerGenome;
  daysSinceLastEntry?: number | null;
  entryIndex?: number;
  totalEntries?: number;
};

export function FlowerSvg({
  entry,
  size = 96,
  animateBloom = false,
  animateSway = false,
  genomeOverride,
  daysSinceLastEntry,
  entryIndex,
  totalEntries,
}: Props) {
  const genome =
    genomeOverride ??
    buildFlowerGenome(
      { ...entry, mood: entry.mood ?? 'peaceful' },
      { daysSinceLastEntry: daysSinceLastEntry ?? undefined, entryIndex, totalEntries }
    );

  const scale = useSharedValue(animateBloom ? 0.12 : 1);
  const sway = useSharedValue(0);

  useEffect(() => {
    if (animateBloom) {
      scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.4)) });
    }
  }, [animateBloom, scale]);

  useEffect(() => {
    if (animateSway) {
      sway.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1.2, { duration: 2800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }
  }, [animateSway, sway]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * (genome.isFavourited ? 1.06 : 1) },
      { rotate: `${sway.value + genome.stemLean * 0.1}deg` },
    ],
    opacity: 1 - genome.fadeFactor,
  }));

  const wiltDroop = genome.wiltFactor * 8;

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, animatedStyle]}>
      {genome.isFavourited ? (
        <View
          pointerEvents="none"
          style={[
            styles.favGlow,
            {
              width: size * 0.92,
              height: size * 0.92,
              borderRadius: size * 0.46,
              top: size * 0.04,
              left: size * 0.04,
            },
          ]}
        />
      ) : null}
      <Flower
        mood={genome.bloomMood}
        seed={genome.seed}
        size={size}
        wordCount={genome.wordCount}
        wiltDroop={wiltDroop}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  favGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 215, 110, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(245, 215, 110, 0.5)',
  },
});
