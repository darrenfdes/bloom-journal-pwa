import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { PollenSparkles } from '@/components/garden/PollenSparkles';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { TimelineScrubber } from '@/components/garden/TimelineScrubber';
import { computeGroundVariant } from '@/lib/garden/ground';
import { applyGardenFilter } from '@/lib/garden/filters';
import {
  GARDEN_CLUSTER_BAND_WIDTH,
  computeGardenLayout,
  getGardenContentWidth,
  getGardenGroundY,
  getMonthClusters,
} from '@/lib/garden/layout';
import { isXRangeVisible } from '@/lib/garden/visibility';
import { daysSinceLastEntry, isGardenWilted } from '@/lib/garden/wilt';
import { isAnniversaryBlossom } from '@/lib/garden/anniversary';
import { MOODS } from '@/lib/constants/moods';
import { fonts, palette } from '@/lib/theme';
import type { EntryRecord, GardenMeta, Mood } from '@/lib/types';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  meta: GardenMeta;
  entries: EntryRecord[];
};

const VIEWPORT_BUFFER = 320;

function flowerSizeForEntry(entry: EntryRecord): number {
  if (entry.isFavourited) return 156;
  if (isAnniversaryBlossom(entry.createdAt)) return 148;
  return 140;
}

export function GardenScene({ meta, entries }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filter = useBloomStore((s) => s.gardenFilter);
  const setGardenFilter = useBloomStore((s) => s.setGardenFilter);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [filterMenu, setFilterMenu] = useState<{
    entryId: string;
    mood: Mood | null;
    monthKey: string;
  } | null>(null);

  const { width, height: viewportHeight } = Dimensions.get('window');
  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const bounds = useMemo(() => ({ width, height: viewportHeight }), [width, viewportHeight]);

  const layout = useMemo(() => computeGardenLayout(filtered, bounds), [filtered, bounds]);
  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => a.position.z - b.position.z),
    [layout]
  );
  const clusters = useMemo(() => getMonthClusters(filtered, bounds), [filtered, bounds]);
  const contentWidth = useMemo(
    () => getGardenContentWidth(clusters.length, width),
    [clusters.length, width]
  );
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const clusterGroundY = groundY + 4;

  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const gardenMonth = meta.lastEntryAt
    ? new Date(meta.lastEntryAt).getMonth() + 1
    : new Date().getMonth() + 1;
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const groundVariant = computeGroundVariant(gardenMonth, groundSeed);

  const visibleClusterKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const c of clusters) {
      const left = c.groundX;
      const right = c.groundX + GARDEN_CLUSTER_BAND_WIDTH;
      if (isXRangeVisible(left, right, scrollLeft, width, VIEWPORT_BUFFER)) {
        keys.add(c.monthKey);
      }
    }
    return keys;
  }, [clusters, scrollLeft, width]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollLeft(e.nativeEvent.contentOffset.x);
  };

  const handleLongPress = (entry: EntryRecord, monthKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFilterMenu({ entryId: entry.id, mood: entry.mood, monthKey });
  };

  const applyMoodFilter = () => {
    if (!filterMenu?.mood) return;
    setGardenFilter({ type: 'mood', mood: filterMenu.mood });
    setFilterMenu(null);
  };

  const applyMonthFilter = () => {
    if (!filterMenu) return;
    const [year, month] = filterMenu.monthKey.split('-').map(Number);
    setGardenFilter({ type: 'month', year, month });
    setFilterMenu(null);
  };

  return (
    <SeasonBackground groundVariant={groundVariant} groundSeed={groundSeed} month={gardenMonth}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Your Garden</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      {filter.type !== 'all' ? (
        <Pressable style={styles.filterBanner} onPress={() => setGardenFilter({ type: 'all' })}>
          <Text style={styles.filterBannerText}>Filter active · tap to show all</Text>
        </Pressable>
      ) : null}

      {wilted ? (
        <Text style={styles.wiltHint}>Your garden misses you — write to refresh it</Text>
      ) : null}

      <TimelineScrubber
        clusters={clusters}
        onJump={(x) => scrollRef.current?.scrollTo({ x, animated: true })}
      />

      <View style={styles.panWrap}>
        <PollenSparkles width={width} height={viewportHeight} count={Math.min(20, Math.max(8, sortedLayout.length))} />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ width: contentWidth, height: viewportHeight }}
        >
          <RepeatingSeasonGround
            scrollLeft={scrollLeft}
            tileWidth={width}
            viewportHeight={viewportHeight}
            month={gardenMonth}
            groundVariant={groundVariant}
            groundSeed={groundSeed}
          />

          {clusters.map((c) => {
            if (!visibleClusterKeys.has(c.monthKey)) return null;

            const clusterMonth = new Date(`${c.monthKey}-01`).getMonth() + 1;
            const clusterSeed =
              c.monthKey.charCodeAt(0) * 31 + c.monthKey.charCodeAt(c.monthKey.length - 1);
            const clusterGround = computeGroundVariant(clusterMonth, clusterSeed);

            return (
              <React.Fragment key={`ground-${c.monthKey}`}>
                <View style={{ position: 'absolute', left: c.groundX, width: GARDEN_CLUSTER_BAND_WIDTH }}>
                  <GroundTexture
                    width={GARDEN_CLUSTER_BAND_WIDTH}
                    height={180}
                    groundY={clusterGroundY}
                    variant={clusterGround}
                    seed={clusterSeed}
                  />
                  <GrassLayer
                    width={GARDEN_CLUSTER_BAND_WIDTH}
                    height={180}
                    groundY={clusterGroundY}
                    month={clusterMonth}
                    seed={clusterSeed}
                    density={28}
                    groundVariant={clusterGround}
                  />
                </View>
                <Text
                  style={[
                    styles.clusterLabel,
                    { left: c.centerX - 60, top: c.groundY },
                  ]}
                >
                  {c.label}
                </Text>
              </React.Fragment>
            );
          })}

          {sortedLayout.map(({ entry, position }, index) => {
            const flowerSize = flowerSizeForEntry(entry);
            const plotHeight = flowerSize * 1.15;
            const plotLeft = position.x - flowerSize / 2;
            const plotRight = position.x + flowerSize / 2;

            if (
              !isXRangeVisible(plotLeft, plotRight, scrollLeft, width, VIEWPORT_BUFFER)
            ) {
              return null;
            }

            return (
              <Pressable
                key={entry.id}
                onPress={() => router.push(`/entry/${entry.id}`)}
                onLongPress={() => handleLongPress(entry, formatMonth(entry.createdAt))}
                style={[
                  styles.flowerPlot,
                  {
                    left: plotLeft,
                    top: position.y - plotHeight,
                    width: flowerSize,
                    height: plotHeight,
                    zIndex: position.z,
                    transform: [
                      { rotate: `${position.rotation}deg` },
                      { scale: position.scale },
                    ],
                  },
                ]}
              >
                <FlowerSvg
                  entry={entry}
                  size={flowerSize}
                  animateSway
                  daysSinceLastEntry={daysSince}
                  entryIndex={index}
                  totalEntries={filtered.length}
                />
                {isAnniversaryBlossom(entry.createdAt) ? (
                  <Text style={styles.anniversary}>✦ anniversary</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/write')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {filterMenu ? (
        <View style={styles.filterSheet}>
          <Text style={styles.filterTitle}>Filter garden</Text>
          {filterMenu.mood ? (
            <Pressable style={styles.filterOption} onPress={applyMoodFilter}>
              <Text style={styles.filterOptionText}>
                Mood: {MOODS.find((m) => m.id === filterMenu.mood)?.label}
              </Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.filterOption} onPress={applyMonthFilter}>
            <Text style={styles.filterOptionText}>Month: {filterMenu.monthKey}</Text>
          </Pressable>
          <Pressable style={styles.filterCancel} onPress={() => setFilterMenu(null)}>
            <Text style={styles.filterCancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </SeasonBackground>
  );
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: palette.ink,
    textShadowColor: 'rgba(255, 247, 230, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  settingsLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
  filterBanner: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: palette.whiteWash,
  },
  filterBannerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  wiltHint: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  panWrap: {
    flex: 1,
    marginTop: 8,
    minHeight: 0,
  },
  clusterLabel: {
    position: 'absolute',
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.inkSoft,
    width: 120,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 247, 230, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  flowerPlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  anniversary: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: palette.inkMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    fontSize: 32,
    color: palette.cream,
    marginTop: -2,
  },
  filterSheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 100,
    backgroundColor: palette.cream,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.parchment,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  filterTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: palette.ink,
    marginBottom: 12,
  },
  filterOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.parchment,
  },
  filterOptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: palette.inkSoft,
  },
  filterCancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  filterCancelText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
  },
});
