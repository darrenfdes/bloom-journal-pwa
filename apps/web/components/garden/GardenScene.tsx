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
import { MeadowCanvasFx } from '@/components/garden/MeadowCanvasFx';
import { MeadowFlower } from '@/components/garden/MeadowFlower';
import { MeadowHills } from '@/components/garden/MeadowHills';
import { MeadowSky } from '@/components/garden/MeadowSky';
import { MeadowTimeline } from '@/components/garden/MeadowTimeline';
import { MemoryReplayCard } from '@/components/garden/MemoryReplayCard';
import { PhaseWeatherToolbar } from '@/components/garden/PhaseWeatherToolbar';
import { JournalPanel } from '@/components/scene/JournalPanel';
import { WeatherParticles } from '@/components/scene/WeatherParticles';

import { useElementSize } from '@/lib/hooks/useElementSize';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { buildMeadowLayout } from '@/lib/garden/meadow-layout';
import { useMeadowPan } from '@/lib/garden/useMeadowPan';
import { GRAIN_DATA_URI } from '@/lib/scene/atmosphere';
import { COLUMN_WIDTH, getGroundY } from '@/lib/scene/garden-proportions';
import { getAmbientTint, getGroundColors } from '@/lib/scene/meadow-palette';
import {
  applySceneOverride,
  DEFAULT_OVERRIDE,
  type SceneOverride,
} from '@/lib/scene/scene-override';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { applyGardenFilter } from '@bloom/core/garden/filters';
import {
  findMemoryReplay,
  formatMemoryReplayDismissKey,
  formatMemoryReplayLine,
  isMemoryReplayDismissed,
  type MemoryReplayDismiss,
} from '@bloom/core/garden/memory-replay';
import { daysSinceLastEntry, isGardenWilted } from '@bloom/core/garden/wilt';
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
  const farHillsRef = useRef<HTMLDivElement>(null);
  const nearHillsRef = useRef<HTMLDivElement>(null);

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

  const groundY = getGroundY(height);
  const [groundLow, groundHigh] = getGroundColors(scene.season, scene.timePhase);
  const ambientTint = getAmbientTint(scene.timePhase);
  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const [hintGone, setHintGone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(layout.months.length - 1);

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

  // ----- pan -----
  const onTap = useCallback(
    (e: PointerEvent) => {
      const target = e.target as Element | null;
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
    farHillsRef,
    nearHillsRef,
    worldWidth: layout.worldWidth,
    viewportWidth: width,
    monthEdges,
    reducedMotion,
    onActiveIndexChange: setActiveIndex,
    onTap,
    onFirstMove,
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
    scrollRef.current = Math.max(0, layout.worldWidth - width);
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
    <div
      ref={sceneRef}
      className="relative h-full w-full select-none overflow-hidden"
      style={{ touchAction: 'none', cursor: 'grab', background: groundLow }}
    >
      <MeadowSky scene={scene} />

      <MeadowCanvasFx
        scene={scene}
        scrollRef={scrollRef}
        groundY={groundY}
        width={width}
        height={height}
        reducedMotion={reducedMotion}
      />

      <MeadowHills
        scene={scene}
        groundY={groundY}
        farHillsRef={farHillsRef}
        nearHillsRef={nearHillsRef}
      />

      {/* Ground band */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-[2]"
        style={{
          top: groundY,
          bottom: 0,
          background: `linear-gradient(${groundHigh} 0, ${groundHigh} 16%, ${groundLow})`,
        }}
        aria-hidden
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

      {/* Weather precipitation + ambient grade + vignette + grain */}
      <WeatherParticles scene={scene} />
      <div className="pointer-events-none absolute inset-0 z-[8]" style={{ background: ambientTint }} aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[8]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 58%, rgba(18,22,40,0.17) 100%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[9]"
        aria-hidden
        style={{
          backgroundImage: GRAIN_DATA_URI,
          backgroundSize: '180px 180px',
          mixBlendMode: 'soft-light',
          opacity: 0.35,
        }}
      />

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
    </div>
  );
}
