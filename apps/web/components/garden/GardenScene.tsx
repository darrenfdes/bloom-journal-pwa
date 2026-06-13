'use client';

import { useReducedMotion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FlowerActionDrawer } from '@/components/garden/FlowerActionDrawer';
import { MeadowFlower } from '@/components/garden/MeadowFlower';
import { MeadowTimeline } from '@/components/garden/MeadowTimeline';
import { MemoryReplayCard } from '@/components/garden/MemoryReplayCard';
import { PhaseWeatherToolbar } from '@/components/garden/PhaseWeatherToolbar';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { SwayingGrassCanvas } from '@/components/garden/SwayingGrassCanvas';
import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { JournalPanel } from '@/components/scene/JournalPanel';
import { NightSceneCanvas } from '@/components/scene/NightSceneCanvas';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { WeatherParticles } from '@/components/scene/WeatherParticles';

import { useElementSize } from '@/lib/hooks/useElementSize';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { buildMeadowLayout } from '@/lib/garden/meadow-layout';
import { useMeadowPan } from '@/lib/garden/useMeadowPan';
import { COLUMN_WIDTH } from '@/lib/scene/garden-proportions';
import {
  applySceneOverride,
  DEFAULT_OVERRIDE,
  type SceneOverride,
} from '@/lib/scene/scene-override';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { applyGardenFilter } from '@bloom/core/garden/filters';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import { getGardenGroundY } from '@bloom/core/garden/layout';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import {
  findMemoryReplay,
  formatMemoryReplayDismissKey,
  formatMemoryReplayLine,
  isMemoryReplayDismissed,
  type MemoryReplayDismiss,
} from '@bloom/core/garden/memory-replay';
import { daysSinceLastEntry, isGardenWilted } from '@bloom/core/garden/wilt';
import { getSeason } from '@bloom/core/theme/seasons';
import { isNightPhase, shouldShowMoonDisc } from '@bloom/core/scene';
import type { EntryRecord, GardenMeta, Mood } from '@bloom/core';
import {
  readMemoryReplayDismiss,
  writeMemoryReplayDismiss,
} from '@/lib/memory-replay/dismiss';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  meta: GardenMeta;
  entries: EntryRecord[];
};

const SWAY_ENTRY_LIMIT = 24;

function monthGroundFromKey(monthKey: string) {
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
  const liveScene = useSceneContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion() ?? false;

  const filter = useBloomStore((s) => s.gardenFilter);
  const setGardenFilter = useBloomStore((s) => s.setGardenFilter);
  const highlightEntryId = useBloomStore((s) => s.highlightEntryId);
  const setHighlightEntryId = useBloomStore((s) => s.setHighlightEntryId);
  const journalOpen = useBloomStore((s) => s.quickWriteOpen);
  const setJournalOpen = useBloomStore((s) => s.setQuickWriteOpen);

  const [override, setOverride] = useState<SceneOverride>(DEFAULT_OVERRIDE);
  const scene = useMemo(() => applySceneOverride(liveScene, override), [liveScene, override]);

  const sceneRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { width: measuredWidth, height: measuredHeight } = useElementSize(sceneRef);
  const width = measuredWidth > 0 ? measuredWidth : windowWidth;
  const height = measuredHeight > 0 ? measuredHeight : windowHeight;

  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const layout = useMemo(() => buildMeadowLayout(filtered, height), [filtered, height]);
  const monthEdges = useMemo(() => layout.months.map((m) => m.x0), [layout]);
  const entryMonthKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const month of layout.months) {
      for (const f of month.flowers) map.set(f.entry.id, month.key);
    }
    return map;
  }, [layout]);

  const bounds = useMemo(() => ({ width, height }), [width, height]);
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const skyBandHeight = useMemo(() => getGardenSkyHeight(height), [height]);
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [hintGone, setHintGone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(layout.months.length - 1);

  const activeMonth = layout.months[activeIndex];
  const activeSceneMonth = useMemo(() => {
    if (!activeMonth) return new Date().getMonth() + 1;
    return Number(activeMonth.key.split('-')[1]);
  }, [activeMonth]);
  const activeGroundVariant = useMemo(() => {
    if (!activeMonth) {
      return computeGroundVariant(new Date().getMonth() + 1, groundSeed);
    }
    const monthNum = Number(activeMonth.key.split('-')[1]);
    const monthSeed =
      activeMonth.key.charCodeAt(0) * 31 +
      activeMonth.key.charCodeAt(activeMonth.key.length - 1);
    return computeGroundVariant(monthNum, monthSeed);
  }, [activeMonth, groundSeed]);

  const nightCanvasActive = scene.status === 'ready' && isNightPhase(scene.timePhase);
  const nightShowMoon = shouldShowMoonDisc({
    timePhase: scene.timePhase,
    weatherCategory: scene.weather?.category,
    moon: scene.moon,
  });
  const moonLatitude = scene.weather?.coords.lat ?? 0;

  // ----- highlight (deep-link / store) -----
  const bloomParam = searchParams.get('bloom');
  const highlightId = bloomParam ?? highlightEntryId;
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  // ----- memory replay card -----
  const [memoryDismiss, setMemoryDismiss] = useState<MemoryReplayDismiss | null>(null);
  const [memoryDismissReady, setMemoryDismissReady] = useState(false);
  const memoryMatch = useMemo(() => findMemoryReplay(entries), [entries]);
  const memoryLine = useMemo(
    () => (memoryMatch ? formatMemoryReplayLine(memoryMatch.entry, memoryMatch.yearsAgo) : null),
    [memoryMatch]
  );
  const showMemoryCard =
    memoryDismissReady &&
    memoryMatch != null &&
    memoryLine != null &&
    !isMemoryReplayDismissed(memoryDismiss, memoryMatch);

  useEffect(() => {
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

  // ----- action drawer -----
  const [actionDrawerState, setActionDrawerState] = useState<{
    entry: EntryRecord;
    monthKey: string;
  } | null>(null);

  const getTileGround = useCallback(
    (tileIndex: number) => {
      if (width <= 0 || layout.months.length === 0) return null;
      const tileCenterX = tileIndex * width + width / 2;
      const month =
        layout.months.find((m) => tileCenterX >= m.x0 && tileCenterX < m.x0 + COLUMN_WIDTH) ??
        layout.months[activeIndex];
      if (!month) return null;
      return monthGroundFromKey(month.key);
    },
    [layout.months, width, activeIndex]
  );

  // ----- pan -----
  const onTap = useCallback(
    (downTarget: EventTarget | null) => {
      const target = downTarget as Element | null;
      const el = target?.closest?.('[data-flower-id]');
      const id = el?.getAttribute('data-flower-id');
      if (!id) {
        setActionDrawerState(null);
        return;
      }
      const entry = entries.find((x) => x.id === id);
      if (entry) {
        setActionDrawerState({ entry, monthKey: entryMonthKey.get(id) ?? '' });
      }
    },
    [entries, entryMonthKey]
  );

  const onFirstMove = useCallback(() => setHintGone(true), []);

  const { scrollRef, jumpTo } = useMeadowPan({
    sceneRef,
    worldRef,
    worldWidth: layout.worldWidth,
    viewportWidth: width,
    monthEdges,
    reducedMotion,
    onActiveIndexChange: setActiveIndex,
    onTap,
    onFirstMove,
    onScrollChange: setScrollLeft,
  });

  const jumpToMonth = useCallback(
    (index: number) => {
      const month = layout.months[index];
      if (month) jumpTo(month.centerX - width / 2);
    },
    [layout, width, jumpTo]
  );

  // Start pinned to the most recent month (right edge).
  const initialisedRef = useRef(false);
  useLayoutEffect(() => {
    if (initialisedRef.current || width <= 0 || layout.worldWidth <= 0) return;
    initialisedRef.current = true;
    const initial = Math.max(0, layout.worldWidth - width);
    scrollRef.current = initial;
    setScrollLeft(initial);
  }, [width, layout.worldWidth, scrollRef]);

  // Deep-link / store highlight → center the bloom.
  useEffect(() => {
    if (!highlightId || width <= 0) return;
    let placedX: number | null = null;
    for (const month of layout.months) {
      const f = month.flowers.find((p) => p.entry.id === highlightId);
      if (f) {
        placedX = f.x;
        break;
      }
    }
    if (placedX == null) return;
    setActiveHighlightId(highlightId);
    setHighlightEntryId(highlightId);
    jumpTo(placedX - width / 2);

    const clear = setTimeout(() => {
      setActiveHighlightId(null);
      setHighlightEntryId(null);
      if (bloomParam) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('bloom');
        const qs = params.toString();
        router.replace(qs ? `/garden?${qs}` : '/garden', { scroll: false });
      }
    }, 3000);
    return () => clearTimeout(clear);
  }, [highlightId, width, layout, jumpTo, bloomParam, router, searchParams, setHighlightEntryId]);

  const animateSway = filtered.length <= SWAY_ENTRY_LIMIT && !reducedMotion;

  return (
    <SeasonBackground
      month={activeSceneMonth}
      groundVariant={activeGroundVariant}
      groundSeed={groundSeed}
      width={width}
      viewportHeight={height}
      skyBandHeight={skyBandHeight}
      scrollLeft={scrollLeft}
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
      <div
        ref={sceneRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: 'none', cursor: 'grab' }}
      >
        <RepeatingSeasonGround
          scrollLeft={scrollLeft}
          tileWidth={width}
          viewportHeight={height}
          groundY={groundY}
          month={activeSceneMonth}
          groundVariant={activeGroundVariant}
          groundSeed={groundSeed}
          sceneSeason={scene.season}
          sceneReady={scene.status === 'ready'}
          nightMode={nightCanvasActive}
          getTileGround={getTileGround}
        />

        {nightCanvasActive ? (
          <NightSceneCanvas
            active
            layer="fireflies"
            showMoon={false}
            sceneHeight={height}
            className="pointer-events-none absolute inset-0 z-[2]"
          />
        ) : null}

        <SwayingGrassCanvas
          scrollLeft={scrollLeft}
          tileWidth={width}
          viewportHeight={height}
          seed={groundSeed}
          className="pointer-events-none absolute inset-0 z-[3]"
        />

        {/* World — translated as one transform by the pan tick */}
        <div ref={worldRef} className="pointer-events-none absolute inset-0 z-[6] will-change-transform">
          {layout.months.map((month) => (
            <React.Fragment key={month.key}>
              <div
                className="pointer-events-none absolute -translate-x-1/2 text-center"
                style={{ left: month.centerX, top: groundY + 84, width: COLUMN_WIDTH }}
              >
                <p
                  className="font-display text-base uppercase leading-tight"
                  style={{
                    color: 'rgba(255,250,238,0.92)',
                    letterSpacing: '0.32em',
                    textShadow: '0 1px 10px rgba(16,28,18,0.55)',
                  }}
                >
                  {month.labelMonth}
                </p>
                <p
                  className="font-display italic"
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,250,238,0.6)',
                    letterSpacing: '0.18em',
                    textShadow: '0 1px 8px rgba(16,28,18,0.5)',
                  }}
                >
                  {month.labelYear}
                </p>
              </div>

              {month.flowers.map((placed, index) => (
                <MeadowFlower
                  key={placed.entry.id}
                  placed={placed}
                  scene={scene}
                  index={index}
                  totalEntries={filtered.length}
                  daysSince={daysSince}
                  animateSway={animateSway}
                  highlighted={activeHighlightId === placed.entry.id}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <WeatherParticles scene={scene} />
      <AmbientOverlay scene={scene} />

      {/* Chrome */}
      <header
        data-scene-ui
        className="pointer-events-none absolute left-5 top-[calc(0.9rem+var(--safe-top))] z-20"
      >
        <h1 className="font-display text-3xl font-semibold leading-none text-white drop-shadow">
          Bloom
        </h1>
        <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/70">
          A living journal · {filtered.length} memories
        </p>
      </header>

      <PhaseWeatherToolbar
        override={override}
        onChange={setOverride}
        liveTimePhase={liveScene.timePhase}
      />

      <div
        data-scene-ui
        className="absolute left-1/2 top-[calc(4.5rem+var(--safe-top))] z-20 flex w-full -translate-x-1/2 flex-col items-center gap-2 px-4"
      >
        {filter.type !== 'all' ? (
          <button
            type="button"
            className="rounded-full bg-black/30 px-3.5 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md"
            onClick={() => setGardenFilter({ type: 'all' })}
          >
            Filter active · tap to show all
          </button>
        ) : null}

        {wilted ? (
          <p className="font-display text-sm italic text-white/75 drop-shadow">
            Your garden misses you — write to refresh it
          </p>
        ) : null}

        {showMemoryCard && memoryLine ? (
          <MemoryReplayCard
            title={memoryMatch?.entry.title ?? null}
            line={memoryLine}
            onOpen={openMemoryEntry}
            onDismiss={dismissMemoryCard}
          />
        ) : null}
      </div>

      <p
        className={`pointer-events-none absolute bottom-[calc(8rem+var(--safe-bottom))] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-[0.08em] text-white/60 transition-opacity duration-700 ${
          hintGone ? 'opacity-0' : 'opacity-100'
        }`}
      >
        drag to wander · tap a bloom to remember
      </p>

      <MeadowTimeline months={layout.months} activeIndex={activeIndex} onJump={jumpToMonth} />

      <JournalPanel scene={scene} open={journalOpen} onClose={() => setJournalOpen(false)} />

      <FlowerActionDrawer
        entry={actionDrawerState?.entry ?? null}
        monthKey={actionDrawerState?.monthKey}
        onClose={() => setActionDrawerState(null)}
        onNavigate={(path) => {
          setActionDrawerState(null);
          router.push(path);
        }}
        onFilterMood={(mood) => {
          setGardenFilter({ type: 'mood', mood: mood as Mood });
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
