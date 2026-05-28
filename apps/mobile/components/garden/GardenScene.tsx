import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { PollenSparkles } from '@/components/garden/PollenSparkles';
import {
  RepeatingSeasonGround,
  gardenTileScrollOffset,
} from '@/components/garden/RepeatingSeasonGround';
import { SwayingGrassLayer } from '@/components/garden/SwayingGrassLayer';
import { NightHorizonBand } from '@/components/scene/NightHorizonBand';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { TimelineScrubber } from '@/components/garden/TimelineScrubber';
import { FlowerActionDrawer } from '@/components/garden/FlowerActionDrawer';
import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { JournalPanel } from '@/components/scene/JournalPanel';
import { SceneLocatingLabel } from '@/components/scene/SceneLocatingLabel';
import { WeatherParticles } from '@/components/scene/WeatherParticles';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { computeGroundVariant } from '@/lib/garden/ground';
import { applyGardenFilter } from '@/lib/garden/filters';
import {
  computeGardenLayout,
  getGardenContentWidth,
  getGardenFocusScrollX,
  getGardenGroundY,
  getMonthClusters,
  resolveClusterAtWorldX,
} from '@/lib/garden/layout';
import { getSeason } from '@/lib/theme/seasons';
import { useGardenRubberBandPan } from '@/lib/hooks/useGardenRubberBandPan';
import { isXRangeVisible } from '@/lib/garden/visibility';
import { daysSinceLastEntry, isGardenWilted } from '@/lib/garden/wilt';
import { isAnniversaryBlossom } from '@/lib/garden/anniversary';
import {
  getWindSwayDegrees,
  isNightPhase,
  shouldHideFlowersForWinter,
  shouldShowMoonDisc,
} from '@bloom/core';
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
  const scene = useSceneContext();
  const sceneReady = scene.status === 'ready';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filter = useBloomStore((s) => s.gardenFilter);
  const setGardenFilter = useBloomStore((s) => s.setGardenFilter);
  const scrollRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [actionDrawerState, setActionDrawerState] = useState<{
    entry: EntryRecord;
    monthKey: string;
  } | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const panWrapRef = useRef<View>(null);
  const [panTopOffset, setPanTopOffset] = useState(0);
  const [panSceneHeight, setPanSceneHeight] = useState(0);

  const { width, height: viewportHeight } = Dimensions.get('window');
  const sceneHeight = panSceneHeight > 0 ? panSceneHeight : viewportHeight;
  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const bounds = useMemo(() => ({ width, height: sceneHeight }), [width, sceneHeight]);

  const layout = useMemo(() => computeGardenLayout(filtered, bounds), [filtered, bounds]);
  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => a.position.z - b.position.z),
    [layout]
  );
  const clusters = useMemo(() => getMonthClusters(filtered, bounds), [filtered, bounds]);
  const contentWidth = useMemo(
    () => getGardenContentWidth(clusters, width, bounds),
    [clusters, width, bounds]
  );
  const maxScroll = Math.max(0, contentWidth - width);
  const rubberBandEnabled = maxScroll <= 0 && width > 0;
  const { panHandlers, sceneTranslateStyle, rubberBandOffset } = useGardenRubberBandPan({
    viewportWidth: width,
    enabled: rubberBandEnabled,
  });
  const visualScrollLeft = scrollLeft + rubberBandOffset;
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const clusterGroundY = groundY + 4;

  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const gardenMonth = meta.lastEntryAt
    ? new Date(meta.lastEntryAt).getMonth() + 1
    : new Date().getMonth() + 1;
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const groundVariant = computeGroundVariant(gardenMonth, groundSeed);

  const getTileGround = useCallback(
    (tileIndex: number) => {
      if (width <= 0 || clusters.length === 0) return null;
      const offset = gardenTileScrollOffset(visualScrollLeft, width);
      const tileCenterX = tileIndex * width - offset + visualScrollLeft + width / 2;
      const cluster = resolveClusterAtWorldX(tileCenterX, clusters);
      if (!cluster) return null;
      const month = new Date(`${cluster.monthKey}-01`).getMonth() + 1;
      const groundSeed =
        cluster.monthKey.charCodeAt(0) * 31 +
        cluster.monthKey.charCodeAt(cluster.monthKey.length - 1);
      return {
        month,
        groundSeed,
        groundVariant: computeGroundVariant(month, groundSeed),
        season: getSeason(month),
      };
    },
    [clusters, visualScrollLeft, width]
  );

  const visibleClusterKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const c of clusters) {
      const left = c.groundX;
      const right = c.groundX + c.columnWidth;
      if (isXRangeVisible(left, right, scrollLeft, width, VIEWPORT_BUFFER)) {
        keys.add(c.monthKey);
      }
    }
    return keys;
  }, [clusters, scrollLeft, width]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollLeft(e.nativeEvent.contentOffset.x);
  };

  useLayoutEffect(() => {
    if (width <= 0) return;
    const x = getGardenFocusScrollX(clusters, width, contentWidth);
    scrollRef.current?.scrollTo({ x, animated: false });
  }, [clusters, contentWidth, width]);

  const handleOpenActionDrawer = (entry: EntryRecord, monthKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionDrawerState({ entry, monthKey });
  };

  const nightCanvasActive = sceneReady && isNightPhase(scene.timePhase);
  const nightShowMoon = shouldShowMoonDisc({
    timePhase: scene.timePhase,
    weatherCategory: scene.weather?.category,
    moon: scene.moon,
  });
  const moonLatitude = scene.weather?.coords.lat ?? 0;

  return (
    <SeasonBackground
      groundVariant={groundVariant}
      groundSeed={groundSeed}
      month={gardenMonth}
      nightCanvasActive={nightCanvasActive}
      nightShowMoon={nightShowMoon}
      moonPhase={scene.moon}
      moonLatitude={moonLatitude}
      panTopOffset={panTopOffset}
      sceneHeight={sceneHeight}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          style={styles.settingsBtn}
          accessibilityLabel="Settings"
        >
          <Feather name="settings" size={22} color="#fff" />
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

      <View
        ref={panWrapRef}
        style={styles.panWrap}
        onLayout={(e) => {
          setPanSceneHeight(e.nativeEvent.layout.height);
          panWrapRef.current?.measureInWindow((_x, y) => {
            if (y >= 0) setPanTopOffset(y);
          });
        }}
        {...(panHandlers ?? {})}
      >
        <Animated.View style={[StyleSheet.absoluteFill, sceneTranslateStyle]}>
          <PollenSparkles width={width} height={sceneHeight} count={Math.min(20, Math.max(8, sortedLayout.length))} />

          <RepeatingSeasonGround
            scrollLeft={visualScrollLeft}
            wrapperOffset={rubberBandOffset}
            tileWidth={width}
            viewportHeight={sceneHeight}
            month={gardenMonth}
            groundVariant={groundVariant}
            groundSeed={groundSeed}
            sceneSeason={scene.season}
            sceneReady={sceneReady}
            nightMode={nightCanvasActive}
            getTileGround={getTileGround}
          />

          {nightCanvasActive ? (
            <NightHorizonBand sceneHeight={sceneHeight} panTopOffset={panTopOffset} />
          ) : null}

          <SwayingGrassLayer
            scrollLeft={visualScrollLeft}
            wrapperOffset={rubberBandOffset}
            tileWidth={width}
            viewportHeight={sceneHeight}
            seed={groundSeed}
          />

          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            scrollEnabled={!rubberBandEnabled}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={[StyleSheet.absoluteFill, styles.flowerScroll]}
            contentContainerStyle={{ width: contentWidth, height: sceneHeight }}
          >
          {clusters.map((c) => {
            if (!visibleClusterKeys.has(c.monthKey)) return null;

            const clusterMonth = new Date(`${c.monthKey}-01`).getMonth() + 1;
            const clusterSeed =
              c.monthKey.charCodeAt(0) * 31 + c.monthKey.charCodeAt(c.monthKey.length - 1);
            const clusterGround = computeGroundVariant(clusterMonth, clusterSeed);

            return (
              <React.Fragment key={`ground-${c.monthKey}`}>
                <View style={{ position: 'absolute', left: c.groundX, width: c.columnWidth }}>
                  <GroundTexture
                    width={c.columnWidth}
                    height={180}
                    groundY={clusterGroundY}
                    variant={clusterGround}
                    seed={clusterSeed}
                  />
                  <GrassLayer
                    width={c.columnWidth}
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
            const favHalo = entry.isFavourited ? 14 : 0;
            const plotWidth = flowerSize + favHalo * 2;
            const plotHeight = flowerSize * 1.15 + favHalo;
            const plotLeft = position.x - plotWidth / 2;
            const plotRight = position.x + plotWidth / 2;

            if (
              !isXRangeVisible(plotLeft, plotRight, scrollLeft, width, VIEWPORT_BUFFER)
            ) {
              return null;
            }

            return (
              <Pressable
                key={entry.id}
                onPress={() => handleOpenActionDrawer(entry, formatMonth(entry.createdAt))}
                onLongPress={() => handleOpenActionDrawer(entry, formatMonth(entry.createdAt))}
                style={[
                  styles.flowerPlot,
                  {
                    left: plotLeft,
                    top: position.y - plotHeight,
                    width: plotWidth,
                    height: plotHeight,
                    zIndex: position.z,
                    transform: [
                      { rotate: `${position.rotation}deg` },
                      { scale: position.scale },
                    ],
                    opacity: shouldHideFlowersForWinter(scene.season) ? 0 : 1,
                  },
                ]}
              >
                {entry.isFavourited ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.favHalo,
                      {
                        width: flowerSize * 0.9,
                        height: flowerSize * 0.9,
                        borderRadius: flowerSize * 0.45,
                        left: (plotWidth - flowerSize * 0.9) / 2,
                      },
                    ]}
                  />
                ) : null}
                <FlowerSvg
                  entry={entry}
                  size={flowerSize}
                  animateSway
                  daysSinceLastEntry={daysSince}
                  entryIndex={index}
                  totalEntries={filtered.length}
                  swayAmplitude={getWindSwayDegrees(scene.weather?.windSpeed ?? 0)}
                  showFavouriteHalo={false}
                />
                {isAnniversaryBlossom(entry.createdAt) ? (
                  <Text style={styles.anniversary}>✦ anniversary</Text>
                ) : null}
              </Pressable>
            );
          })}
          </Animated.ScrollView>
        </Animated.View>
      </View>

      {!journalOpen ? (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + 24 }]}
          onPress={() => setJournalOpen(true)}
          accessibilityLabel="New entry"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}

      <WeatherParticles />
      <AmbientOverlay />
      <SceneLocatingLabel />
      <JournalPanel visible={journalOpen} onClose={() => setJournalOpen(false)} />

      <FlowerActionDrawer
        entry={actionDrawerState?.entry ?? null}
        monthKey={actionDrawerState?.monthKey}
        onClose={() => setActionDrawerState(null)}
        onFilterMood={(mood) => {
          setGardenFilter({ type: 'mood', mood: mood as import('@/lib/types').Mood });
          setActionDrawerState(null);
        }}
        onFilterMonth={(year, month) => {
          setGardenFilter({ type: 'month', year, month });
          setActionDrawerState(null);
        }}
      />
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
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
    overflow: 'hidden',
  },
  flowerScroll: {
    zIndex: 5,
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
  favHalo: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(245, 215, 110, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(245, 215, 110, 0.5)',
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
