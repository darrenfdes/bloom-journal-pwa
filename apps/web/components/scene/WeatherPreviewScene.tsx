'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { GardenPanIndicator } from '@/components/garden/GardenPanIndicator';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { CelestialLayer } from '@/components/scene/CelestialLayer';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { WeatherParticles } from '@/components/scene/WeatherParticles';
import { useElementSize } from '@/lib/hooks/useElementSize';
import { useHorizontalDragPan } from '@/lib/hooks/useHorizontalDragPan';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { ScenePreviewProvider } from '@/lib/scene/SceneContext';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import { getGardenGroundY } from '@bloom/core/garden/layout';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSeason } from '@bloom/core/theme/seasons';
import type { SceneState } from '@bloom/core/scene';

/** Viewport-width tiles along the preview timeline (drag to pan). */
const PREVIEW_TIMELINE_TILES = 16;
const PREVIEW_GROUND_SEED = 4242;
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
});

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

type Props = {
  scene: SceneState;
  label?: string;
  /** Faster lightning flashes for preview pages (4–8s). */
  demoLightning?: boolean;
};

export function WeatherPreviewScene({ scene, label, demoLightning = true }: Props) {
  const panRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef(false);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { width: panWidth, height: panHeight } = useElementSize(panRef);
  const [scrollLeft, setScrollLeft] = useState(0);
  useHorizontalDragPan(scrollRef);

  const width = panWidth > 0 ? panWidth : windowWidth;
  const sceneHeight = panHeight > 0 ? panHeight : windowHeight;
  const bounds = useMemo(() => ({ width, height: sceneHeight }), [width, sceneHeight]);
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const skyBandHeight = getGardenSkyHeight(sceneHeight > 0 ? sceneHeight : windowHeight);
  const contentWidth = width > 0 ? width * PREVIEW_TIMELINE_TILES : 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const dominant = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (dominant === 0) return;
      e.preventDefault();
      el.scrollLeft += dominant;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const previewMonths = useMemo(() => {
    const latest = new Date();
    const start = addMonths(latest, 1 - PREVIEW_TIMELINE_TILES);

    return Array.from({ length: PREVIEW_TIMELINE_TILES }, (_, index) => {
      const date = addMonths(start, index);
      const month = date.getMonth() + 1;
      const groundSeed = PREVIEW_GROUND_SEED + date.getFullYear() * 100 + month;

      return {
        month,
        label: MONTH_LABEL_FORMATTER.format(date),
        groundSeed,
        groundVariant: computeGroundVariant(month, groundSeed),
        season: getSeason(month),
      };
    });
  }, []);

  const activeTileIndex =
    width > 0
      ? Math.min(
          PREVIEW_TIMELINE_TILES - 1,
          Math.max(0, Math.round(scrollLeft / width))
        )
      : PREVIEW_TIMELINE_TILES - 1;
  const activeTile = previewMonths[activeTileIndex] ?? previewMonths[PREVIEW_TIMELINE_TILES - 1]!;

  const tileOffset = width > 0 ? scrollLeft % width : 0;
  const tileStart = width > 0 ? Math.floor(scrollLeft / width) - 1 : 0;
  const tileEnd =
    width > 0 ? Math.ceil((scrollLeft + width) / width) + 1 : tileStart + 3;
  const tileIndices = useMemo(() => {
    const list: number[] = [];
    for (let i = tileStart; i <= tileEnd; i += 1) {
      list.push(i);
    }
    return list;
  }, [tileStart, tileEnd]);

  useLayoutEffect(() => {
    if (initialFocusRef.current || !scrollRef.current || contentWidth <= width || width <= 0) {
      return;
    }

    const initial = Math.floor((contentWidth - width) / 2);
    scrollRef.current.scrollLeft = initial;
    setScrollLeft(initial);
    initialFocusRef.current = true;
  }, [contentWidth, width]);

  return (
    <ScenePreviewProvider scene={scene}>
      <SeasonBackground
        month={activeTile.month}
        groundVariant={activeTile.groundVariant}
        groundSeed={activeTile.groundSeed}
        width={width}
        viewportHeight={sceneHeight > 0 ? sceneHeight : windowHeight}
        skyBandHeight={skyBandHeight}
        skyOverlays={
          <>
            <SkyTimePhaseLayer scene={scene} />
            <CelestialLayer scene={scene} width={width} skyHeight={skyBandHeight} />
          </>
        }
      >
        {label ? (
          <div className="pointer-events-none absolute left-3 top-[calc(0.75rem+var(--safe-top))] z-30">
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
              {label}
            </span>
          </div>
        ) : null}

        <div ref={panRef} className="relative min-h-0 flex-1">
          <RepeatingSeasonGround
            scrollLeft={scrollLeft}
            tileWidth={width}
            viewportHeight={sceneHeight}
            month={activeTile.month}
            groundVariant={activeTile.groundVariant}
            groundSeed={activeTile.groundSeed}
            sceneSeason={scene.season}
            sceneReady={scene.status === 'ready'}
            getTileGround={(tileIndex) => previewMonths[tileIndex] ?? null}
          />

          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            {tileIndices.map((tileIndex) => {
              const tile = previewMonths[tileIndex];
              if (!tile) return null;

              const x = tileIndex * width - tileOffset;
              return (
                <div
                  key={tileIndex}
                  className="absolute top-0"
                  style={{ left: x, width, height: sceneHeight }}
                >
                  <GroundTexture
                    width={width}
                    height={180}
                    groundY={groundY + 4}
                    variant={tile.groundVariant}
                    seed={tile.groundSeed}
                  />
                  <GrassLayer
                    width={width}
                    height={180}
                    groundY={groundY + 4}
                    month={tile.month}
                    seed={tile.groundSeed}
                    density={24}
                    groundVariant={tile.groundVariant}
                  />
                  <p
                    className="pointer-events-none absolute left-1/2 w-[140px] -translate-x-1/2 rounded-full bg-white/80 px-2.5 py-1 text-center text-xs font-semibold uppercase tracking-wider text-ink shadow-sm backdrop-blur-sm"
                    style={{ top: groundY + 4 }}
                  >
                    {tile.label}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            ref={scrollRef}
            className="garden-pan absolute inset-0 z-[2]"
            onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
          >
            <div
              className="relative shrink-0"
              style={{
                width: contentWidth,
                minWidth: contentWidth,
                height: sceneHeight,
              }}
            />
          </div>

          <GardenPanIndicator
            scrollLeft={scrollLeft}
            scrollWidth={contentWidth}
            clientWidth={width}
            onScrollTo={(scrollX) => {
              scrollRef.current?.scrollTo({ left: scrollX, behavior: 'smooth' });
            }}
          />
        </div>

        <WeatherParticles scene={scene} demoLightning={demoLightning} />
        <AmbientOverlay scene={scene} />
      </SeasonBackground>
    </ScenePreviewProvider>
  );
}
