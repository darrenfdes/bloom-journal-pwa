'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { JournalPanel } from '@/components/scene/JournalPanel';
import { SceneLocatingLabel } from '@/components/scene/SceneLocatingLabel';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { WeatherParticles } from '@/components/scene/WeatherParticles';
import { GardenFlower } from '@/components/garden/GardenFlower';
import { GardenPanIndicator } from '@/components/garden/GardenPanIndicator';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { PollenSparkles } from '@/components/garden/PollenSparkles';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { TimelineScrubber } from '@/components/garden/TimelineScrubber';
import { MOODS } from '@/lib/constants/moods';
import { useElementSize } from '@/lib/hooks/useElementSize';
import { useHorizontalDragPan } from '@/lib/hooks/useHorizontalDragPan';
import { useScrollMetrics } from '@/lib/hooks/useScrollMetrics';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { applyGardenFilter } from '@bloom/core/garden/filters';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import {
  GARDEN_CLUSTER_BAND_WIDTH,
  GARDEN_CLUSTER_GAP,
  computeGardenLayout,
  getGardenContentWidth,
  getGardenGroundY,
  getGardenHorizontalPadding,
  getMonthClusters,
} from '@bloom/core/garden/layout';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { daysSinceLastEntry, isGardenWilted } from '@bloom/core/garden/wilt';
import type { EntryRecord, GardenMeta, Mood } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  meta: GardenMeta;
  entries: EntryRecord[];
};

const LONG_PRESS_MS = 500;
const SWAY_ENTRY_LIMIT = 18;
const COLUMN_SIZE = GARDEN_CLUSTER_BAND_WIDTH + GARDEN_CLUSTER_GAP;

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function GardenScene({ meta, entries }: Props) {
  const scene = useSceneContext();
  const sceneReady = scene.status === 'ready';
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = useBloomStore((s) => s.gardenFilter);
  const setGardenFilter = useBloomStore((s) => s.setGardenFilter);
  const highlightEntryId = useBloomStore((s) => s.highlightEntryId);
  const setHighlightEntryId = useBloomStore((s) => s.setHighlightEntryId);
  const panRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterMenu, setFilterMenu] = useState<{
    entryId: string;
    mood: Mood | null;
    monthKey: string;
  } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { width: panWidth, height: panHeight } = useElementSize(panRef);
  const { scrollLeft, scrollWidth, clientWidth } = useScrollMetrics(scrollRef);
  useHorizontalDragPan(scrollRef);

  const width = panWidth > 0 ? panWidth : windowWidth;
  const sceneHeight = panHeight > 0 ? panHeight : windowHeight;

  const bloomParam = searchParams.get('bloom');
  const highlightId = bloomParam ?? highlightEntryId;

  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const bounds = useMemo(() => ({ width, height: sceneHeight }), [width, sceneHeight]);

  const layout = useMemo(() => computeGardenLayout(filtered, bounds), [filtered, bounds]);
  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => a.position.z - b.position.z),
    [layout]
  );
  const clusters = useMemo(() => getMonthClusters(filtered, bounds), [filtered, bounds]);
  const horizontalPadding = useMemo(
    () => getGardenHorizontalPadding(bounds, clusters.length),
    [bounds, clusters.length]
  );
  const contentWidth = useMemo(
    () => getGardenContentWidth(clusters.length, width),
    [clusters.length, width]
  );
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const clusterGroundY = groundY + 4;
  const skyHeight = useMemo(() => getGardenSkyHeight(sceneHeight), [sceneHeight]);

  const flowersByMonth = useMemo(() => {
    const map = new Map<string, typeof sortedLayout>();
    for (const plot of sortedLayout) {
      const list = map.get(plot.monthKey) ?? [];
      list.push(plot);
      map.set(plot.monthKey, list);
    }
    return map;
  }, [sortedLayout]);

  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const gardenMonth = meta.lastEntryAt
    ? new Date(meta.lastEntryAt).getMonth() + 1
    : new Date().getMonth() + 1;
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const groundVariant = computeGroundVariant(gardenMonth, groundSeed);

  const enableSway = sortedLayout.length <= SWAY_ENTRY_LIMIT;
  const pollenCount = Math.min(12, Math.max(6, Math.floor(sortedLayout.length / 3)));
  const grassDensity = clusters.length > 6 ? 18 : 28;

  const columnVirtualizer = useVirtualizer({
    count: clusters.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => COLUMN_SIZE,
    horizontal: true,
    overscan: 2,
    paddingStart: horizontalPadding.paddingLeft,
    paddingEnd: horizontalPadding.paddingRight,
    scrollMargin: 0,
  });

  useLayoutEffect(() => {
    columnVirtualizer.measure();
  }, [columnVirtualizer, clusters.length, contentWidth, width, sceneHeight, horizontalPadding]);

  useLayoutEffect(() => {
    if (!scrollRef.current || width <= 0 || clusters.length === 0 || highlightId) return;
    const focus = clusters[clusters.length - 1];
    if (!focus) return;
    const maxScroll = Math.max(0, contentWidth - width);
    const target = Math.min(Math.max(0, focus.centerX - width / 2), maxScroll);
    scrollRef.current.scrollLeft = target;
  }, [clusters, contentWidth, width, highlightId]);

  React.useEffect(() => {
    if (!highlightId || sortedLayout.length === 0) return;

    const plot = sortedLayout.find((p) => p.entry.id === highlightId);
    if (!plot) return;

    setActiveHighlightId(highlightId);
    setHighlightEntryId(highlightId);

    const scrollX = Math.min(
      Math.max(0, plot.position.x - width / 2),
      Math.max(0, contentWidth - width)
    );
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ left: scrollX, behavior: 'smooth' });
    });

    const clearTimer = setTimeout(() => {
      setActiveHighlightId(null);
      setHighlightEntryId(null);
      if (bloomParam) {
        router.replace('/garden', { scroll: false });
      }
    }, 3000);

    return () => clearTimeout(clearTimer);
  }, [highlightId, bloomParam, sortedLayout, setHighlightEntryId, router, width, contentWidth]);

  const openFilterMenu = useCallback((entry: EntryRecord, monthKey: string) => {
    setFilterMenu({ entryId: entry.id, mood: entry.mood, monthKey });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (entry: EntryRecord, monthKey: string) => {
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        openFilterMenu(entry, monthKey);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, openFilterMenu]
  );

  const jumpToMonth = useCallback((scrollX: number) => {
    scrollRef.current?.scrollTo({ left: scrollX, behavior: 'smooth' });
  }, []);

  const virtualMonthKeys = useMemo(
    () =>
      new Set(
        columnVirtualizer
          .getVirtualItems()
          .map((v) => clusters[v.index]?.monthKey)
          .filter(Boolean)
      ),
    [columnVirtualizer, clusters]
  );

  const highlightedPlot = useMemo(
    () =>
      activeHighlightId
        ? sortedLayout.find((p) => p.entry.id === activeHighlightId)
        : undefined,
    [activeHighlightId, sortedLayout]
  );

  return (
    <SeasonBackground
      month={gardenMonth}
      groundVariant={groundVariant}
      groundSeed={groundSeed}
      width={width}
      viewportHeight={sceneHeight > 0 ? sceneHeight : windowHeight}
      skyOverlays={
        <>
          <SkyTimePhaseLayer scene={scene} />
          <CelestialLayer scene={scene} width={width} skyHeight={skyHeight} />
        </>
      }
    >
      <header className="relative z-10 flex shrink-0 items-center justify-end px-5 pb-2 pt-[calc(1rem+var(--safe-top))]">
        <Link
          href="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:bg-black/40"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
      </header>

      {filter.type !== 'all' ? (
        <button
          type="button"
          className="relative z-10 mx-auto mt-2 shrink-0 rounded-full bg-white/65 px-3.5 py-1.5 text-sm text-ink-soft"
          onClick={() => setGardenFilter({ type: 'all' })}
        >
          Filter active · tap to show all
        </button>
      ) : null}

      {wilted ? (
        <p className="relative z-10 mt-1 shrink-0 text-center text-sm italic text-ink-muted">
          Your garden misses you — write to refresh it
        </p>
      ) : null}

      <div className="relative z-10 shrink-0">
        <TimelineScrubber clusters={clusters} onJump={jumpToMonth} />
      </div>

      <div ref={panRef} className="relative z-[1] mt-2 min-h-0 flex-1">
        <RepeatingSeasonGround
          scrollLeft={scrollLeft}
          tileWidth={width}
          viewportHeight={sceneHeight}
          month={gardenMonth}
          groundVariant={groundVariant}
          groundSeed={groundSeed}
          sceneSeason={scene.season}
          sceneReady={sceneReady}
        />

        <div ref={scrollRef} className="garden-pan absolute inset-0">
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <PollenSparkles
              width={width}
              height={sceneHeight}
              count={pollenCount}
              seed={groundSeed}
            />
          </div>

          <div
            className="relative shrink-0"
            style={{
              width: contentWidth,
              minWidth: contentWidth,
              height: sceneHeight,
            }}
          >
            {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
              const cluster = clusters[virtualColumn.index];
              if (!cluster) return null;

              const clusterMonth = new Date(`${cluster.monthKey}-01`).getMonth() + 1;
              const clusterSeed =
                cluster.monthKey.charCodeAt(0) * 31 +
                cluster.monthKey.charCodeAt(cluster.monthKey.length - 1);
              const clusterGround = computeGroundVariant(clusterMonth, clusterSeed);
              const monthFlowers = flowersByMonth.get(cluster.monthKey) ?? [];

              return (
                <div
                  key={cluster.monthKey}
                  className="absolute top-0"
                  style={{
                    width: virtualColumn.size,
                    height: sceneHeight,
                    transform: `translateX(${virtualColumn.start}px)`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: 0,
                      width: GARDEN_CLUSTER_BAND_WIDTH,
                      height: sceneHeight,
                    }}
                  >
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
                      density={grassDensity}
                      groundVariant={clusterGround}
                    />
                  </div>

                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="pointer-events-none absolute w-[120px] text-center text-xs font-semibold uppercase tracking-wider text-ink-soft"
                    style={{
                      left: GARDEN_CLUSTER_BAND_WIDTH * 0.5 - 60,
                      top: cluster.groundY,
                    }}
                  >
                    {cluster.label}
                  </motion.p>

                  {monthFlowers.map(({ entry, position }, index) => {
                    const isHighlighted = activeHighlightId === entry.id;
                    return (
                      <GardenFlower
                        key={entry.id}
                        entry={entry}
                        position={position}
                        worldOffsetX={virtualColumn.start}
                        index={index}
                        totalEntries={filtered.length}
                        daysSince={daysSince}
                        isHighlighted={isHighlighted}
                        animateSway={enableSway}
                        monthKey={formatMonth(entry.createdAt)}
                        onOpenFilter={openFilterMenu}
                        onLongPressStart={startLongPress}
                        onLongPressEnd={clearLongPress}
                      />
                    );
                  })}
                </div>
              );
            })}

          {highlightedPlot && !virtualMonthKeys.has(highlightedPlot.monthKey) ? (
            <GardenFlower
              key={`highlight-${highlightedPlot.entry.id}`}
              entry={highlightedPlot.entry}
              position={highlightedPlot.position}
              index={0}
              totalEntries={filtered.length}
              daysSince={daysSince}
              isHighlighted
              animateSway={enableSway}
              monthKey={formatMonth(highlightedPlot.entry.createdAt)}
              onOpenFilter={openFilterMenu}
              onLongPressStart={startLongPress}
              onLongPressEnd={clearLongPress}
            />
          ) : null}
          </div>
        </div>

        <GardenPanIndicator
          scrollLeft={scrollLeft}
          scrollWidth={Math.max(scrollWidth, contentWidth)}
          clientWidth={clientWidth}
          onScrollTo={jumpToMonth}
        />
      </div>

      <WeatherParticles scene={scene} />
      <AmbientOverlay scene={scene} />
      <SceneLocatingLabel scene={scene} />
      <JournalPanel scene={scene} open={journalOpen} onClose={() => setJournalOpen(false)} />

      {!journalOpen ? (
        <button
          type="button"
          className="fixed right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-3xl text-cream shadow-lg"
          style={{ bottom: 'calc(1.5rem + var(--safe-bottom))' }}
          onClick={() => setJournalOpen(true)}
          aria-label="New entry"
        >
          +
        </button>
      ) : null}

      <AnimatePresence>
        {filterMenu ? (
          <motion.div
            key="filter-menu"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-24 left-5 right-5 z-30 rounded-2xl border border-parchment bg-cream p-4 shadow-lg"
          >
            <p className="mb-3 text-sm font-semibold text-ink">Filter garden</p>
            {filterMenu.mood ? (
              <button
                type="button"
                className="block w-full border-b border-parchment py-3 text-left text-sm text-ink-soft"
                onClick={() => {
                  if (filterMenu.mood) setGardenFilter({ type: 'mood', mood: filterMenu.mood });
                  setFilterMenu(null);
                }}
              >
                Mood: {MOODS.find((m) => m.id === filterMenu.mood)?.label}
              </button>
            ) : null}
            <button
              type="button"
              className="block w-full border-b border-parchment py-3 text-left text-sm text-ink-soft"
              onClick={() => {
                const [year, month] = filterMenu.monthKey.split('-').map(Number);
                setGardenFilter({ type: 'month', year: year!, month: month! });
                setFilterMenu(null);
              }}
            >
              Month: {filterMenu.monthKey}
            </button>
            <button
              type="button"
              className="mt-2 w-full text-center text-sm text-ink-muted"
              onClick={() => setFilterMenu(null)}
            >
              Cancel
            </button>
            <p className="mt-2 text-center text-[10px] text-ink-muted">
              Long-press, right-click, or Shift+click a flower for filters
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SeasonBackground>
  );
}
