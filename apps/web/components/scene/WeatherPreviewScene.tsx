'use client';

import { useMemo, useRef } from 'react';

import { GrassLayer } from '@/components/garden/GrassLayer';
import { GroundTexture } from '@/components/garden/GroundTexture';
import { RepeatingSeasonGround } from '@/components/garden/RepeatingSeasonGround';
import { SeasonBackground } from '@/components/garden/SeasonBackground';
import { AmbientOverlay } from '@/components/scene/AmbientOverlay';
import { SkyTimePhaseLayer } from '@/components/scene/SkyTimePhaseLayer';
import { WeatherParticles } from '@/components/scene/WeatherParticles';
import { useElementSize } from '@/lib/hooks/useElementSize';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { ScenePreviewProvider } from '@/lib/scene/SceneContext';
import { computeGroundVariant } from '@bloom/core/garden/ground';
import { getGardenGroundY } from '@bloom/core/garden/layout';
import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import type { SceneState } from '@bloom/core/scene';

type Props = {
  scene: SceneState;
  label?: string;
  /** Faster lightning flashes for preview pages (4–8s). */
  demoLightning?: boolean;
};

export function WeatherPreviewScene({ scene, label, demoLightning = true }: Props) {
  const panRef = useRef<HTMLDivElement>(null);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { width: panWidth, height: panHeight } = useElementSize(panRef);

  const width = panWidth > 0 ? panWidth : windowWidth;
  const sceneHeight = panHeight > 0 ? panHeight : windowHeight;
  const bounds = useMemo(() => ({ width, height: sceneHeight }), [width, sceneHeight]);
  const groundY = useMemo(() => getGardenGroundY(bounds), [bounds]);
  const skyBandHeight = getGardenSkyHeight(sceneHeight > 0 ? sceneHeight : windowHeight);

  const month = new Date().getMonth() + 1;
  const groundSeed = 4242;
  const groundVariant = computeGroundVariant(month, groundSeed);

  return (
    <ScenePreviewProvider scene={scene}>
      <SeasonBackground
        month={month}
        groundVariant={groundVariant}
        groundSeed={groundSeed}
        width={width}
        viewportHeight={sceneHeight > 0 ? sceneHeight : windowHeight}
        skyBandHeight={skyBandHeight}
        skyOverlays={<SkyTimePhaseLayer scene={scene} />}
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
            scrollLeft={0}
            tileWidth={width}
            viewportHeight={sceneHeight}
            month={month}
            groundVariant={groundVariant}
            groundSeed={groundSeed}
            sceneSeason={scene.season}
            sceneReady={scene.status === 'ready'}
          />

          <div className="pointer-events-none absolute inset-0">
            <GroundTexture
              width={width}
              height={180}
              groundY={groundY + 4}
              variant={groundVariant}
              seed={groundSeed}
            />
            <GrassLayer
              width={width}
              height={180}
              groundY={groundY + 4}
              month={month}
              seed={groundSeed}
              density={24}
              groundVariant={groundVariant}
            />
          </div>
        </div>

        <WeatherParticles scene={scene} demoLightning={demoLightning} />
        <AmbientOverlay scene={scene} />
      </SeasonBackground>
    </ScenePreviewProvider>
  );
}
