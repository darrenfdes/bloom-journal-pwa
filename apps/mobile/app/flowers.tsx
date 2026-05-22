import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Flower } from '@/components/flower/Flower';
import { BLOOM_MOODS, BLOOM_MOOD_LABEL } from '@/lib/flowers/moodBloom';
import { BLOOM_PALETTES, type BloomMood } from '@/lib/flowers/moodPalettes';
import { fonts, palette } from '@/lib/theme';

const PARCHMENT = '#F4ECDC';
const CARD_PARCHMENT = '#FCF6E8';

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000) >>> 0;
}

type SeedsByMood = Record<BloomMood, number>;

function initialSeeds(): SeedsByMood {
  return BLOOM_MOODS.reduce((acc, mood) => {
    acc[mood] = randomSeed();
    return acc;
  }, {} as SeedsByMood);
}

export default function FlowersGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [seeds, setSeeds] = useState<SeedsByMood>(initialSeeds);
  const [expanded, setExpanded] = useState<BloomMood | null>(null);

  const cardWidth = useMemo(() => {
    const horizontalPad = 24;
    const gap = 14;
    const cols = width > 720 ? 3 : 2;
    return Math.floor((width - horizontalPad * 2 - gap * (cols - 1)) / cols);
  }, [width]);

  const reseedAll = useCallback(() => {
    setSeeds(initialSeeds());
  }, []);

  const reseed = useCallback((mood: BloomMood) => {
    setSeeds((prev) => ({ ...prev, [mood]: randomSeed() }));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← back</Text>
        </Pressable>
        <Text style={styles.title}>Flower Gallery</Text>
        <Pressable onPress={reseedAll} hitSlop={12} style={styles.reseedAll}>
          <Text style={styles.reseedAllText}>↻ Reseed All</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Six mood-locked blooms. Tap a card to expand 8 siblings with seeds offset by 17.
        </Text>

        <View style={styles.grid}>
          {BLOOM_MOODS.map((mood) => (
            <FlowerCard
              key={mood}
              mood={mood}
              seed={seeds[mood]}
              width={cardWidth}
              onReseed={() => reseed(mood)}
              onExpand={() => setExpanded((cur) => (cur === mood ? null : mood))}
              expanded={expanded === mood}
            />
          ))}
        </View>

        {expanded ? (
          <ExpandedPanel mood={expanded} baseSeed={seeds[expanded]} width={width - 48} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function FlowerCard({
  mood,
  seed,
  width,
  onReseed,
  onExpand,
  expanded,
}: {
  mood: BloomMood;
  seed: number;
  width: number;
  onReseed: () => void;
  onExpand: () => void;
  expanded: boolean;
}) {
  const moodPalette = BLOOM_PALETTES[mood];
  return (
    <Pressable
      onPress={onExpand}
      style={[
        styles.card,
        {
          width,
          borderColor: expanded ? moodPalette.petalDark : 'rgba(80, 60, 40, 0.08)',
          backgroundColor: CARD_PARCHMENT,
        },
      ]}
    >
      <View style={[styles.swatchBar, { backgroundColor: moodPalette.petalMid }]} />
      <View style={styles.flowerWrap}>
        <Flower mood={mood} seed={seed} size={width - 32} />
      </View>
      <Text style={[styles.moodLabel, { color: moodPalette.petalDeepest }]}>
        {BLOOM_MOOD_LABEL[mood]}
      </Text>
      <Text style={styles.seedLabel}>seed {seed}</Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onReseed();
        }}
        hitSlop={8}
        style={[styles.reseedBtn, { borderColor: moodPalette.petalDark }]}
      >
        <Text style={[styles.reseedBtnText, { color: moodPalette.petalDeepest }]}>
          ↻ new seed
        </Text>
      </Pressable>
    </Pressable>
  );
}

function ExpandedPanel({
  mood,
  baseSeed,
  width,
}: {
  mood: BloomMood;
  baseSeed: number;
  width: number;
}) {
  const moodPalette = BLOOM_PALETTES[mood];
  const itemSize = Math.floor(width / 4) - 4;
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: moodPalette.petalDark,
          backgroundColor: moodPalette.petalHighlight,
        },
      ]}
    >
      <Text style={[styles.panelTitle, { color: moodPalette.petalDeepest }]}>
        {BLOOM_MOOD_LABEL[mood]} siblings · base seed {baseSeed}
      </Text>
      <View style={styles.panelGrid}>
        {Array.from({ length: 8 }, (_, i) => {
          const siblingSeed = ((baseSeed + i * 17) >>> 0);
          const sway = (i - 4) * 1.5;
          return (
            <View key={i} style={[styles.panelItem, { width: itemSize }]}>
              <Flower mood={mood} seed={siblingSeed} size={itemSize} sway={sway} />
              <Text style={styles.panelSeed}>+{i * 17}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PARCHMENT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: palette.ink,
  },
  reseedAll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(80, 60, 40, 0.1)',
  },
  reseedAllText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.inkSoft,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#3D2A14',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  swatchBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  flowerWrap: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginTop: 6,
  },
  seedLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: palette.inkMuted,
    marginTop: 2,
  },
  reseedBtn: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  reseedBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  panel: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  panelTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    marginBottom: 10,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  panelItem: {
    alignItems: 'center',
  },
  panelSeed: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: palette.inkMuted,
  },
});
