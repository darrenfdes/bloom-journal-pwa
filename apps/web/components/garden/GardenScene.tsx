'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { JournalPanel } from '@/components/scene/JournalPanel';
import { SceneLocatingLabel } from '@/components/scene/SceneLocatingLabel';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { WeatherParticles } from '@/components/scene/WeatherParticles';
import { FlowerActionDrawer } from '@/components/garden/FlowerActionDrawer';
import { FlowerClusterPicker } from '@/components/garden/FlowerClusterPicker';
import { GardenFlower } from '@/components/garden/GardenFlower';
import { MemoryReplayCard } from '@/components/garden/MemoryReplayCard';
import { GardenPanIndicator } from '@/components/garden/GardenPanIndicator';
import { PollenSparkles } from '@/components/garden/PollenSparkles';
import {
  RepeatingSeasonGround,
  gardenTileScrollOffset,
} from '@/components/garden/RepeatingSeasonGround';
import { SwayingGrassCanvas } from '@/components/garden/SwayingGrassCanvas';
import { NightSceneCanvas } from '@/components/scene/NightSceneCanvas';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { TimelineScrubber } from '@/components/garden/TimelineScrubber';

import { useElementSize } from '@/lib/hooks/useElementSize';
import { useGardenRubberBandPan } from '@/lib/hooks/useGardenRubberBandPan';
import { useScrollMetrics } from '@/lib/hooks/useScrollMetrics';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { applyGardenFilter } from '@bloom/core/garden/filters';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import {
  GARDEN_CLUSTER_BAND_WIDTH,
  GARDEN_INTER_MONTH_GAP,
  computeGardenLayout,
  getGardenContentWidth,
  getGardenFocusScrollX,
  getGardenGroundY,
  getGardenHorizontalPadding,
  getMonthClusters,
  resolveClusterAtWorldX,
} from '@bloom/core/garden/layout';
import type { PlacedFlower } from '@bloom/core/garden/layout';
import { findPlacedFlowersAtPoint } from '@bloom/core/garden/hit-test';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSeason } from '@bloom/core/theme/seasons';
import { isNightPhase, shouldShowMoonDisc, type SceneState } from '@bloom/core/scene';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { daysSinceLastEntry, isGardenWilted } from '@bloom/core/garden/wilt';
import {
  findMemoryReplay,
  formatMemoryReplayDismissKey,
  formatMemoryReplayLine,
  isMemoryReplayDismissed,
  type MemoryReplayDismiss,
} from '@bloom/core/garden/memory-replay';
import type { EntryRecord, GardenMeta } from '@bloom/core';
import {
  readMemoryReplayDismiss,
  writeMemoryReplayDismiss,
} from '@/lib/memory-replay/dismiss';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  meta: GardenMeta;
  entries: EntryRecord[];
};
const SWAY_ENTRY_LIMIT = 18;
const DEFAULT_COLUMN_SIZE = GARDEN_CLUSTER_BAND_WIDTH + GARDEN_INTER_MONTH_GAP;

function clusterGroundFromKey(monthKey: string) {
  const month = new Date(`${monthKey}-01`).getMonth() + 1;
  const groundSeed =
    monthKey.charCodeAt(0) * 31 + monthKey.charCodeAt(monthKey.length - 1);
  return {
    month,
    groundSeed,
    groundVariant: computeGroundVariant(month, groundSeed),
    season: getSeason(month),
  };
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
  const [actionDrawerState, setActionDrawerState] = useState<{
    entry: EntryRecord;
    monthKey: string;
  } | null>(null);
  const [clusterPickerState, setClusterPickerState] = useState<PlacedFlower[] | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [memoryDismiss, setMemoryDismiss] = useState<MemoryReplayDismiss | null>(null);
  const [memoryDismissReady, setMemoryDismissReady] = useState(false);
  const journalOpen = useBloomStore((s) => s.quickWriteOpen);
  const setJournalOpen = useBloomStore((s) => s.setQuickWriteOpen);

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { width: panWidth, height: panHeight } = useElementSize(panRef);
  const { scrollLeft, scrollWidth, clientWidth } = useScrollMetrics(scrollRef);

  const width = panWidth > 0 ? panWidth : windowWidth;
  const sceneHeight = panHeight > 0 ? panHeight : windowHeight;

  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const bounds = useMemo(() => ({ width, height: sceneHeight }), [width, sceneHeight]);

  const layout = useMemo(() => computeGardenLayout(filtered, bounds), [filtered, bounds]);
  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => a.position.z - b.position.z),
    [layout]
  );
  const clusters = useMemo(() => getMonthClusters(filtered, bounds), [filtered, bounds]);
  const horizontalPadding = useMemo(
    () => getGardenHorizontalPadding(bounds, clusters.length, clusters),
    [bounds, clusters]
  );
  const contentWidth = useMemo(
    () => getGardenContentWidth(clusters, width, bounds),
    [clusters, width, bounds]
  );
  const maxScroll = Math.max(0, contentWidth - width);
  const rubberBandEnabled = maxScroll <= 0 && width > 0;
  const { rubberBandOffset } = useGardenRubberBandPan({
    scrollRef,
    viewportWidth: width,
    enabled: rubberBandEnabled,
  });
  const visualScrollLeft = scrollLeft + rubberBandOffset;
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const meadowSkyHeight = useMemo(
    () => getGardenSkyHeight(sceneHeight > 0 ? sceneHeight : windowHeight),
    [sceneHeight, windowHeight]
  );
  const [panTopOffset, setPanTopOffset] = useState(0);
  const skyBandHeight = panTopOffset + meadowSkyHeight;

  const bloomParam = searchParams.get('bloom');
  const highlightId = bloomParam ?? highlightEntryId;

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

  const memoryMatch = useMemo(() => findMemoryReplay(entries), [entries]);
  const memoryLine = useMemo(
    () =>
      memoryMatch
        ? formatMemoryReplayLine(memoryMatch.entry, memoryMatch.yearsAgo)
        : null,
    [memoryMatch]
  );
  const showMemoryCard =
    memoryDismissReady &&
    memoryMatch != null &&
    memoryLine != null &&
    !isMemoryReplayDismissed(memoryDismiss, memoryMatch);

  React.useEffect(() => {
    setMemoryDismiss(readMemoryReplayDismiss());
    setMemoryDismissReady(true);
  }, []);

  const dismissMemoryCard = useCallback(() => {
    if (!memoryMatch) return;
    const dismiss: MemoryReplayDismiss = {
      date: formatMemoryReplayDismissKey(new Date()),
      entryId: memoryMatch.entry.id,
    };
    writeMemoryReplayDismiss(dismiss);
    setMemoryDismiss(dismiss);
  }, [memoryMatch]);

  const openMemoryEntry = useCallback(() => {
    if (!memoryMatch) return;
    router.push(`/entry/${memoryMatch.entry.id}`);
  }, [memoryMatch, router]);

  const gardenMonth = meta.lastEntryAt
    ? new Date(meta.lastEntryAt).getMonth() + 1
    : new Date().getMonth() + 1;
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const groundVariant = computeGroundVariant(gardenMonth, groundSeed);

  const enableSway = sortedLayout.length <= SWAY_ENTRY_LIMIT;
  const pollenCount = Math.min(12, Math.max(6, Math.floor(sortedLayout.length / 3)));

  const columnVirtualizer = useVirtualizer({
    count: clusters.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => clusters[index]?.columnWidth ?? DEFAULT_COLUMN_SIZE,
    horizontal: true,
    overscan: 3,
    paddingStart: horizontalPadding.paddingLeft,
    paddingEnd: horizontalPadding.paddingRight,
    scrollMargin: 0,
  });

  useLayoutEffect(() => {
    columnVirtualizer.measure();
  }, [columnVirtualizer, clusters, contentWidth, width, sceneHeight, horizontalPadding]);

  const getTileGround = useCallback(
    (tileIndex: number) => {
      if (width <= 0 || clusters.length === 0) return null;
      const offset = gardenTileScrollOffset(visualScrollLeft, width);
      const tileCenterX = tileIndex * width - offset + visualScrollLeft + width / 2;
      const cluster = resolveClusterAtWorldX(tileCenterX, clusters);
      if (!cluster) return null;
      return clusterGroundFromKey(cluster.monthKey);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clusters, visualScrollLeft, width]
  );

  useLayoutEffect(() => {
    const measurePanTop = () => {
      if (panRef.current) {
        setPanTopOffset(panRef.current.offsetTop);
      }
    };

    measurePanTop();
    window.addEventListener('resize', measurePanTop);
    const observer = new ResizeObserver(measurePanTop);
    if (panRef.current) {
      observer.observe(panRef.current);
    }

    return () => {
      window.removeEventListener('resize', measurePanTop);
      observer.disconnect();
    };
  }, [filter.type, wilted, clusters.length, sceneHeight]);

  useLayoutEffect(() => {
    if (!scrollRef.current || width <= 0 || highlightId) return;
    scrollRef.current.scrollLeft = getGardenFocusScrollX(clusters, width, contentWidth);
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
        const params = new URLSearchParams(searchParams.toString());
        params.delete('bloom');
        const qs = params.toString();
        router.replace(qs ? `/garden?${qs}` : '/garden', { scroll: false });
      }
    }, 3000);

    return () => clearTimeout(clearTimer);
  }, [highlightId, bloomParam, sortedLayout, setHighlightEntryId, router, searchParams, width, contentWidth]);

  const openActionDrawer = useCallback((entry: EntryRecord, monthKey: string) => {
    setActionDrawerState({ entry, monthKey });
  }, []);

  const handleGardenTap = useCallback(
    (clientX: number, clientY: number) => {
      const el = scrollRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const worldX = clientX - rect.left + el.scrollLeft;
      const worldY = clientY - rect.top;
      const hits = findPlacedFlowersAtPoint(worldX, worldY, sortedLayout);

      if (hits.length === 0) return;
      if (hits.length === 1) {
        openActionDrawer(hits[0]!.entry, hits[0]!.monthKey);
        return;
      }
      setClusterPickerState(hits);
    },
    [sortedLayout, openActionDrawer]
  );

  const handleClusterSelect = useCallback(
    (entry: EntryRecord, monthKey: string) => {
      setClusterPickerState(null);
      openActionDrawer(entry, monthKey);
    },
    [openActionDrawer]
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

  const nightCanvasActive = sceneReady && isNightPhase(scene.timePhase);
  const nightShowMoon = shouldShowMoonDisc({
    timePhase: scene.timePhase,
    weatherCategory: scene.weather?.category,
    moon: scene.moon,
  });
  const moonLatitude = scene.weather?.coords.lat ?? 0;

  return (
    <SeasonBackground
      month={gardenMonth}
      groundVariant={groundVariant}
      groundSeed={groundSeed}
      width={width}
      viewportHeight={sceneHeight > 0 ? sceneHeight : windowHeight}
      skyBandHeight={skyBandHeight}
      nightCanvasActive={nightCanvasActive}
      nightShowMoon={nightShowMoon}
      moonPhase={scene.moon}
      moonLatitude={moonLatitude}
      skyOverlays={
        nightCanvasActive ? null : (
          <>
            <SkyTimePhaseLayer scene={scene} />
            <CelestialLayer scene={scene} width={width} skyHeight={skyBandHeight} />
          </>
        )
      }
    >
      <div className="relative z-10 shrink-0 pt-[calc(1rem+var(--safe-top))]">
        {filter.type !== 'all' ? (
          <button
            type="button"
            className="mx-auto mt-2 shrink-0 rounded-full bg-white/65 px-3.5 py-1.5 text-sm text-ink-soft"
            onClick={() => setGardenFilter({ type: 'all' })}
          >
            Filter active · tap to show all
          </button>
        ) : null}

        {wilted ? (
          <p className="mt-1 shrink-0 text-center text-sm italic text-ink-muted">
            Your garden misses you — write to refresh it
          </p>
        ) : null}

        {showMemoryCard && memoryLine ? (
          <MemoryReplayCard
            className="mt-2 mb-1"
            line={memoryLine}
            onOpen={openMemoryEntry}
            onDismiss={dismissMemoryCard}
          />
        ) : null}

        <TimelineScrubber clusters={clusters} onJump={jumpToMonth} />
      </div>

      <div ref={panRef} className="relative z-[1] mt-2 min-h-0 flex-1">
        {/* Infinite fixed-viewport hills & meadow */}
        <RepeatingSeasonGround
          scrollLeft={visualScrollLeft}
          tileWidth={width}
          viewportHeight={sceneHeight}
          groundY={groundY}
          wrapperOffset={rubberBandOffset}
          month={gardenMonth}
          groundVariant={groundVariant}
          groundSeed={groundSeed}
          sceneSeason={scene.season}
          sceneReady={sceneReady}
          nightMode={nightCanvasActive}
          getTileGround={getTileGround}
        />

        {nightCanvasActive ? (
          <NightSceneCanvas
            active
            layer="fireflies"
            showMoon={false}
            sceneHeight={sceneHeight}
            className="pointer-events-none absolute inset-0 z-[2]"
          />
        ) : null}

        <SwayingGrassCanvas
          scrollLeft={visualScrollLeft}
          tileWidth={width}
          viewportHeight={sceneHeight}
          wrapperOffset={rubberBandOffset}
          seed={groundSeed}
          className="pointer-events-none absolute inset-0 z-[3]"
        />

        {/* Scroll container — flowers and pollen scroll inside natively */}
        <div ref={scrollRef} className="garden-pan absolute inset-0 z-[5]">
          <div
            className="relative shrink-0"
            style={{
              width: contentWidth,
              minWidth: contentWidth,
              height: sceneHeight,
              transform: rubberBandEnabled
                ? `translateX(${-rubberBandOffset}px)`
                : undefined,
            }}
          >
            {/* Pollen sparkles — scroll with the flowers */}
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              <PollenSparkles
                width={contentWidth}
                height={sceneHeight}
                count={pollenCount}
                seed={groundSeed}
              />
            </div>

            {/* Virtualized month columns */}
            {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
              const cluster = clusters[virtualColumn.index];
              if (!cluster) return null;

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
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="pointer-events-none absolute w-[140px] rounded-full bg-white/80 px-2.5 py-1 text-center text-xs font-semibold uppercase tracking-wider text-ink shadow-sm backdrop-blur-sm"
                    style={{
                      left: cluster.centerX - virtualColumn.start - 70,
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
                        zBoost={entry.isFavourited ? 60 : 0}
                        index={index}
                        totalEntries={filtered.length}
                        daysSince={daysSince}
                        isHighlighted={isHighlighted}
                        animateSway={enableSway}
                        onGardenTap={handleGardenTap}
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
              zBoost={highlightedPlot.entry.isFavourited ? 60 : 0}
              index={0}
              totalEntries={filtered.length}
              daysSince={daysSince}
              isHighlighted
              animateSway={enableSway}
              onGardenTap={handleGardenTap}
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

      <FlowerClusterPicker
        candidates={clusterPickerState ?? []}
        onSelect={handleClusterSelect}
        onClose={() => setClusterPickerState(null)}
      />

      <FlowerActionDrawer
        entry={actionDrawerState?.entry ?? null}
        monthKey={actionDrawerState?.monthKey}
        onClose={() => setActionDrawerState(null)}
        onNavigate={(path) => {
          setActionDrawerState(null);
          router.push(path);
        }}
        onFilterMood={(mood) => {
          setGardenFilter({ type: 'mood', mood: mood as import('@bloom/core').Mood });
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
