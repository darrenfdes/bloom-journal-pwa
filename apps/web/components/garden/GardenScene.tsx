'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, useRef, useState } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { TimelineScrubber } from '@/components/garden/TimelineScrubber';
import { MOODS } from '@/lib/constants/moods';
import { applyGardenFilter } from '@bloom/core/garden/filters';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import { computeGardenLayout, getMonthClusters } from '@bloom/core/garden/layout';
import { isAnniversaryBlossom } from '@bloom/core/garden/anniversary';
import { daysSinceLastEntry, isGardenWilted } from '@bloom/core/garden/wilt';
import type { EntryRecord, GardenMeta, Mood } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  meta: GardenMeta;
  entries: EntryRecord[];
};

function flowerSizeForEntry(entry: EntryRecord): number {
  if (entry.isFavourited) return 156;
  if (isAnniversaryBlossom(entry.createdAt)) return 148;
  return 140;
}

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function GardenScene({ meta, entries }: Props) {
  const router = useRouter();
  const filter = useBloomStore((s) => s.gardenFilter);
  const setGardenFilter = useBloomStore((s) => s.setGardenFilter);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filterMenu, setFilterMenu] = useState<{
    entryId: string;
    mood: Mood | null;
    monthKey: string;
  } | null>(null);
  const [width, setWidth] = useState(390);

  React.useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const filtered = useMemo(() => applyGardenFilter(entries, filter), [entries, filter]);
  const bounds = useMemo(() => ({ width, height: 2400 }), [width]);

  const layout = useMemo(() => computeGardenLayout(filtered, bounds), [filtered, bounds]);
  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => a.position.z - b.position.z),
    [layout]
  );
  const clusters = useMemo(() => getMonthClusters(filtered, bounds), [filtered, bounds]);

  const daysSince = daysSinceLastEntry(meta.lastEntryAt);
  const wilted = isGardenWilted(meta.lastEntryAt);

  const gardenMonth = meta.lastEntryAt
    ? new Date(meta.lastEntryAt).getMonth() + 1
    : new Date().getMonth() + 1;
  const groundSeed = meta.id.charCodeAt(0) + meta.id.charCodeAt(meta.id.length - 1);
  const groundVariant = computeGroundVariant(gardenMonth, groundSeed);

  const contentHeight = Math.max(
    700,
    ...sortedLayout.map((p) => p.position.y + 140),
    500
  );

  const clusterLabels = useMemo(() => {
    const labels: { monthKey: string; label: string; x: number; y: number }[] = [];
    const seen = new Set<string>();
    for (const c of clusters) {
      if (seen.has(c.monthKey)) continue;
      seen.add(c.monthKey);
      labels.push({
        monthKey: c.monthKey,
        label: c.label,
        x: c.centerX,
        y: c.groundY,
      });
    }
    return labels;
  }, [clusters]);

  const openFilterMenu = (entry: EntryRecord, monthKey: string, shiftKey: boolean) => {
    if (shiftKey) {
      setFilterMenu({ entryId: entry.id, mood: entry.mood, monthKey });
    } else if (entry.mood) {
      setGardenFilter({ type: 'mood', mood: entry.mood });
    }
  };

  return (
    <SeasonBackground
      month={gardenMonth}
      groundVariant={groundVariant}
      groundSeed={groundSeed}
      width={width}
      height={contentHeight}
    >
      <header className="relative z-10 flex items-center justify-between px-5 pt-4">
        <h1 className="font-display text-3xl font-semibold text-ink drop-shadow-sm">Your Garden</h1>
        <Link href="/settings" className="text-sm font-medium text-ink-soft hover:text-ink">
          Settings
        </Link>
      </header>

      {filter.type !== 'all' ? (
        <button
          type="button"
          className="relative z-10 mx-auto mt-2 rounded-full bg-white/65 px-3.5 py-1.5 text-sm text-ink-soft"
          onClick={() => setGardenFilter({ type: 'all' })}
        >
          Filter active · tap to show all
        </button>
      ) : null}

      {wilted ? (
        <p className="relative z-10 mt-1 text-center text-sm italic text-ink-muted">
          Your garden misses you — write to refresh it
        </p>
      ) : null}

      <TimelineScrubber
        clusters={clusters}
        onJump={(y) => scrollRef.current?.scrollTo({ top: y, behavior: 'smooth' })}
      />

      <div
        ref={scrollRef}
        className="relative z-[1] mt-2 overflow-y-auto"
        style={{ height: 'calc(100dvh - 10rem)' }}
      >
        <div className="relative" style={{ width, height: contentHeight }}>
          {clusters.map((c) => {
            const clusterMonth = new Date(`${c.monthKey}-01`).getMonth() + 1;
            const clusterSeed =
              c.monthKey.charCodeAt(0) * 31 + c.monthKey.charCodeAt(c.monthKey.length - 1);
            const clusterGround = computeGroundVariant(clusterMonth, clusterSeed);
            const clusterGroundY = c.groundY + 100;

            return (
              <React.Fragment key={`ground-${c.monthKey}`}>
                <GroundTexture
                  width={width}
                  height={180}
                  groundY={clusterGroundY}
                  variant={clusterGround}
                  seed={clusterSeed}
                />
                <GrassLayer
                  width={width}
                  height={180}
                  groundY={clusterGroundY}
                  month={clusterMonth}
                  seed={clusterSeed}
                  density={28}
                  groundVariant={clusterGround}
                />
              </React.Fragment>
            );
          })}

          {clusterLabels.map((c) => (
            <p
              key={`label-${c.monthKey}`}
              className="pointer-events-none absolute w-[120px] text-center text-xs font-semibold uppercase tracking-wider text-ink-soft"
              style={{ left: c.x - 60, top: c.y }}
            >
              {c.label}
            </p>
          ))}

          {sortedLayout.map(({ entry, position }, index) => {
            const flowerSize = flowerSizeForEntry(entry);
            const plotHeight = flowerSize * 1.15;

            return (
              <button
                key={entry.id}
                type="button"
                className="absolute flex flex-col items-center justify-end border-0 bg-transparent p-0"
                style={{
                  left: position.x - flowerSize / 2,
                  top: position.y - plotHeight,
                  width: flowerSize,
                  height: plotHeight,
                  zIndex: position.z,
                  transform: `rotate(${position.rotation}deg) scale(${position.scale})`,
                }}
                onClick={(e) => {
                  if (e.shiftKey) {
                    openFilterMenu(entry, formatMonth(entry.createdAt), true);
                    return;
                  }
                  router.push(`/entry/${entry.id}`);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setFilterMenu({
                    entryId: entry.id,
                    mood: entry.mood,
                    monthKey: formatMonth(entry.createdAt),
                  });
                }}
                title={entry.title ?? 'Memory'}
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
                  <span className="mt-0.5 text-[9px] italic text-ink-muted">✦ anniversary</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-3xl text-cream shadow-lg"
        onClick={() => router.push('/write')}
        aria-label="New entry"
      >
        +
      </button>

      {filterMenu ? (
        <div className="fixed bottom-24 left-5 right-5 z-30 rounded-2xl border border-parchment bg-cream p-4 shadow-lg">
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
            Right-click or Shift+click a flower for filters
          </p>
        </div>
      ) : null}
    </SeasonBackground>
  );
}
