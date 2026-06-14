'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { GardenPanIndicator } from '@/components/garden/GardenPanIndicator';
import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { SwayingGrassCanvas } from '@/components/garden/SwayingGrassCanvas';
import { NightSceneCanvas } from '@/components/scene/NightSceneCanvas';
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
import { isNightPhase, shouldShowMoonDisc, type SceneState } from '@bloom/core/scene';

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

/**
 * @deprecated Superseded by the live `BloomMeadow` (see `/preview` and `/garden`). The fixed
 * "scenery" weather scenes are kept for reference only and are no longer linked from the app.
 * Do not build new features on this renderer.
 */
export function DeprecatedWeatherPreviewScene({ scene, label, demoLightning = true }: Props) {
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

  const nightCanvasActive = scene.status === 'ready' && isNightPhase(scene.timePhase);
  const nightShowMoon = shouldShowMoonDisc({
    timePhase: scene.timePhase,
    weatherCategory: scene.weather?.category,
    moon: scene.moon,
  });
  const moonLatitude = scene.weather?.coords.lat ?? 0;

  return (
    <ScenePreviewProvider scene={scene}>
      <SeasonBackground
        month={activeTile.month}
        groundVariant={activeTile.groundVariant}
        groundSeed={activeTile.groundSeed}
        width={width}
        viewportHeight={sceneHeight > 0 ? sceneHeight : windowHeight}
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
            groundY={groundY}
            month={activeTile.month}
            groundVariant={activeTile.groundVariant}
            groundSeed={activeTile.groundSeed}
            sceneSeason={scene.season}
            sceneReady={scene.status === 'ready'}
            nightMode={nightCanvasActive}
            getTileGround={(tileIndex) => previewMonths[tileIndex] ?? null}
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
            scrollLeft={scrollLeft}
            tileWidth={width}
            viewportHeight={sceneHeight}
            seed={PREVIEW_GROUND_SEED}
            className="pointer-events-none absolute inset-0 z-[3]"
          />

          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            {tileIndices.map((tileIndex) => {
              const tile = previewMonths[tileIndex];
              if (!tile) return null;

              // Tile i covers world [i*w, (i+1)*w); screen x = world − scroll
              const x = tileIndex * width - scrollLeft;
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
                  <div
                    className="pointer-events-none absolute left-1/2 w-[160px] -translate-x-1/2 text-center"
                    style={{ top: groundY + 4 }}
                  >
                    <p
                      className="font-display text-base uppercase leading-tight"
                      style={{
                        color: 'rgba(255, 250, 238, 0.92)',
                        letterSpacing: '0.32em',
                        textShadow: '0 1px 10px rgba(16, 28, 18, 0.55)',
                        marginRight: '-0.32em',
                      }}
                    >
                      {tile.label.split(' ')[0]}
                    </p>
                    <p
                      className="font-display italic"
                      style={{
                        fontSize: 11,
                        color: 'rgba(255, 250, 238, 0.6)',
                        letterSpacing: '0.18em',
                        textShadow: '0 1px 8px rgba(16, 28, 18, 0.5)',
                        marginRight: '-0.18em',
                      }}
                    >
                      {tile.label.split(' ')[1]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            ref={scrollRef}
            className="garden-pan absolute inset-0 z-[5]"
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
