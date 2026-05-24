import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { Button } from '@/components/ui/Button';
import { buildFlowerGenome } from '@/lib/flowers/genome';
import { plantEntry } from '@/lib/db/repositories/entries';
import { clearWriteDraft } from '@/lib/db/repositories/settings';
import { resolveMood } from '@/lib/sentiment/infer';
import { getMood } from '@/lib/constants/moods';
import { fonts, palette } from '@/lib/theme';
import type { EntryRecord } from '@/lib/types';
import { useBloomStore } from '@/stores/useBloomStore';
export default function PlantConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pending = useBloomStore((s) => s.pendingPlant);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setEntries = useBloomStore((s) => s.setEntries);
  const resetDraft = useBloomStore((s) => s.resetDraft);
  const meta = useBloomStore((s) => s.gardenMeta);
  const [planting, setPlanting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const previewEntry: EntryRecord | null = useMemo(() => {
    if (!pending) return null;
    const { mood, inferredSentiment } = resolveMood(pending.mood, pending.content);
    const now = new Date().toISOString();
    return {
      id: 'preview',
      userId: 'local',
      title: pending.title.trim() || null,
      content: pending.content,
      mood,
      inferredSentiment,
      tags: pending.tags,
      createdAt: pending.createdAtOverride ?? now,
      updatedAt: now,
      flowerSeed: 42,
      flowerStyle: '{}',
      gardenPosition: null,
      isFavourited: false,
      revisitOf: pending.revisitOf,
      isDeleted: false,
    };
  }, [pending]);

  useEffect(() => {
    if (!pending || !previewEntry) {
      router.replace('/write');
    }
  }, [pending, previewEntry, router]);

  if (!pending || !previewEntry) {
    return null;
  }

  const moodLabel = getMood(previewEntry.mood)?.label ?? previewEntry.mood;
  const genome = buildFlowerGenome({ ...previewEntry, mood: previewEntry.mood! });

  const confirmPlant = async () => {
    if (planting) return;
    setPlanting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const { width, height } = Dimensions.get('window');
    const entry = await plantEntry(pending, { width, height });
    await clearWriteDraft();

    const entries = await import('@/lib/db/repositories/entries').then((m) => m.listEntries());
    const gardenMeta = await import('@/lib/db/repositories/garden').then((m) =>
      m.getOrCreateGardenMeta()
    );

    setEntries(entries);
    setGardenMeta(gardenMeta);
    setPendingPlant(null);
    resetDraft();
    setCelebrating(true);

    setTimeout(() => {
      setPlanting(false);
      if (!meta?.hasPlantedFirst) {
        router.replace({ pathname: '/garden', params: { bloom: entry.id } });
      } else {
        router.replace('/garden');
      }
    }, 1500);
  };

  return (
    <>
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.prompt}>Ready to plant this?</Text>

      <View style={styles.flowerWrap}>
        <FlowerSvg entry={previewEntry} size={220} animateBloom genomeOverride={genome} />
      </View>

      <Text style={styles.date}>
        {new Date(previewEntry.createdAt).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </Text>
      <Text style={styles.mood}>{moodLabel}</Text>

      <Text style={styles.hint}>Every entry grows a flower — no two alike.</Text>

      <Button
        label={planting ? 'Planting...' : 'Plant this memory'}
        onPress={confirmPlant}
        disabled={planting}
        style={styles.btn}
      />
    </View>

    {celebrating && (
      <Animated.View 
        entering={FadeIn.duration(400)} 
        exiting={FadeOut} 
        style={styles.celebrateOverlay}
      >
        <Animated.View entering={ZoomIn.duration(1000)} style={styles.celebrateGlow} />
        <Animated.View entering={ZoomIn.delay(300).springify()}>
          <Text style={styles.celebrateText}>Nurturing your memory...</Text>
        </Animated.View>
      </Animated.View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.cream,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  prompt: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: palette.ink,
    marginBottom: 24,
  },
  flowerWrap: {
    marginVertical: 16,
  },
  date: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: palette.inkSoft,
    marginTop: 8,
  },
  mood: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: palette.sage,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  btn: {
    width: '100%',
  },
  celebrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253, 248, 241, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrateGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(143, 168, 138, 0.3)',
  },
  celebrateText: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: palette.ink,
    marginTop: 20,
  },
});
