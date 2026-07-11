'use client';

/**
 * Top-level 3D explorable meadow. Assembles the R3F canvas (terrain, lights, sky), owns the
 * player state + look gesture, and layers the DOM HUD on top.
 *
 * TESTING NOTE: never mount this (or R3F's <Canvas>) in vitest/jsdom — the test setup stubs
 * requestAnimationFrame synchronously (infinite recursion) and jsdom has no WebGL. Mock it
 * via next/dynamic like `app/garden/page.test.tsx` does; browser verification only.
 */
import { Canvas } from '@react-three/fiber';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { EntryRecord } from '@bloom/core';
import { getMoonPhase, shouldShowLightning } from '@bloom/core/scene';
import type { WeatherCategory, WeatherState } from '@bloom/core/scene';

import type { WorldEvent } from '@bloom/core/events';

import { moonScaleForEvent, moonTintForEvent } from '@/lib/garden/bloom/event-catalog';
import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import {
  celestialAt,
  PHASE_ORDER,
  PHASES,
  phaseFromHour,
  type PhaseKey,
} from '@/lib/garden/bloom/phases';
import { EYE_HEIGHT } from '@/lib/garden/explore/constants';
import {
  applyLook,
  type MoveInput,
  type PlayerState,
} from '@/lib/garden/explore/movement';
import {
  fogRangeFor,
  groundColorFor,
  hillColorsFor,
  lightingForPhase,
  parseCssLinearGradient,
  starOpacityFor,
  sunDirectionAt,
} from '@/lib/garden/explore/sky';
import { windSpeedFallback } from '@/lib/garden/explore/wind';
import {
  buildExploreWorld,
  monthNeighborsAt,
  type MonthNeighbors,
} from '@/lib/garden/explore/world-layout';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

import { AmbientMotes } from './AmbientMotes';
import { ButterflyField } from './ButterflyField';
import { CelestialSprites } from './CelestialSprites';
import { CloudLayer } from './CloudLayer';
import { ClutterField } from './ClutterField';
import { ExploreHud } from './ExploreHud';
import { HorizonHaze } from './HorizonHaze';
import { ExploreMemoryCard } from './ExploreMemoryCard';
import { FishField } from './FishField';
import { FlowerField } from './FlowerField';
import { FoxRig } from './FoxRig';
import { GrassField } from './GrassField';
import { LightningRig } from './LightningRig';
import { GroundCoverField } from './GroundCoverField';
import { MountainRing } from './MountainRing';
import { RockField } from './RockField';
import { ShootingStars } from './ShootingStars';
import { SkyFlights } from './SkyFlights';
import { StreamBanks } from './StreamBanks';
import { StreamDecor } from './StreamDecor';
import { StreamFoam } from './StreamFoam';
import { StreamWater } from './StreamWater';
import { SkyDome } from './SkyDome';
import { StarField } from './StarField';
import { TerrainMesh } from './TerrainMesh';
import { TreeField } from './TreeField';
import { useFlowerTextures } from './useFlowerTextures';
import { VirtualJoystick } from './VirtualJoystick';
import { WeatherParticles } from './WeatherParticles';
import { WindDriver } from './WindDriver';
import { createWindUniforms } from './wind-material';

const LOOK_SENSITIVITY = 0.0045;
const HINT_FADE_MS = 6000;

const WEATHER_CATEGORIES: WeatherCategory[] = [
  'clear',
  'partly_cloudy',
  'overcast',
  'fog',
  'drizzle',
  'rain',
  'heavy_rain',
  'snow',
  'thunderstorm',
];

/** Representative cloud cover when the category comes from a dev override, 0..1. */
const OVERRIDE_CLOUD: Record<WeatherCategory, number> = {
  clear: 0.05,
  partly_cloudy: 0.4,
  overcast: 0.95,
  fog: 0.9,
  drizzle: 0.8,
  rain: 0.85,
  heavy_rain: 0.95,
  snow: 0.85,
  thunderstorm: 1,
};

export interface ExploreSceneProps {
  entries: EntryRecord[];
  weather: WeatherState | null;
  latitude: number;
  /** Today's headline world event (named moon, supermoon…), or null for an ordinary day. */
  moonEvent?: WorldEvent | null;
}

export function ExploreScene({
  entries,
  weather,
  latitude,
  moonEvent = null,
}: ExploreSceneProps) {
  const router = useRouter();
  const params = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();

  const world = useMemo(() => buildExploreWorld(buildMeadowLayout(entries)), [entries]);
  const { textures, progress } = useFlowerTextures(world.flowers);

  // Player state lives in a ref — it changes every frame and must not re-render React.
  const playerRef = useRef<PlayerState>(null as unknown as PlayerState);
  if (playerRef.current === null) {
    playerRef.current = { x: world.spawn.x, z: world.spawn.z, yaw: world.spawn.yaw, pitch: 0 };
  }
  const joystickRef = useRef<MoveInput>({ forward: 0, strafe: 0 });

  // Live clock, same cadence as the 2D meadow.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Dev-only overrides (?phase=night&weather=rain) for deterministic screenshots — mirrors
  // the /preview philosophy; inert in production builds.
  const isDev = process.env.NODE_ENV !== 'production';
  const devPhase = isDev ? (params.get('phase') as PhaseKey | null) : null;
  const devWeather = isDev ? (params.get('weather') as WeatherCategory | null) : null;
  const phase: PhaseKey =
    devPhase && PHASE_ORDER.includes(devPhase) ? devPhase : phaseFromHour(now.getHours());
  const category: WeatherCategory | undefined =
    devWeather && WEATHER_CATEGORIES.includes(devWeather)
      ? devWeather
      : weather?.category;
  const cloudCover =
    devWeather && WEATHER_CATEGORIES.includes(devWeather)
      ? OVERRIDE_CLOUD[devWeather]
      : Math.min(1, Math.max(0, (weather?.cloudCover ?? 0) / 100));

  const lighting = useMemo(
    () => lightingForPhase(phase, cloudCover, category),
    [phase, cloudCover, category],
  );
  const fog = fogRangeFor(category);
  const skyStops = useMemo(() => parseCssLinearGradient(PHASES[phase].sky), [phase]);

  // Live wind speed (km/h), or a representative value when the category is a dev override so
  // sway/rain-slant respond to `?weather=` too. One shared uniforms object drives every swaying
  // material; null under reduced motion → vegetation stays fully static.
  const windSpeed =
    devWeather && WEATHER_CATEGORIES.includes(devWeather)
      ? windSpeedFallback(devWeather)
      : (weather?.windSpeed ?? 0);
  const wind = useMemo(
    () => (reducedMotion ? null : createWindUniforms()),
    [reducedMotion],
  );

  // Sun (or moon at night) drives the one directional light. A dev phase override pins the
  // body to its phase keyframe so screenshots don't depend on the wall clock.
  const celestial = devPhase ? PHASES[phase] : celestialAt(now);
  const sunDir = sunDirectionAt(celestial.sun);
  const moonDir = sunDirectionAt(celestial.moon);
  const moonlit = lighting.sunIntensity <= 0.01;
  const lightDir = moonlit ? moonDir : sunDir;
  const lightColor = moonlit ? '#c7d3ec' : lighting.sunColor;
  const lightIntensity = moonlit ? lighting.moonIntensity : lighting.sunIntensity;
  const moonState = useMemo(() => getMoonPhase(now), [now]);
  // Named-moon looks self-neutralize: tint is null unless today is a named full moon, and the
  // scale is 1 unless the event carries a lunar distance (supermoon/micromoon).
  const moonTint = useMemo(() => (moonEvent ? moonTintForEvent(moonEvent) : null), [moonEvent]);
  const moonScale = useMemo(() => (moonEvent ? moonScaleForEvent(moonEvent) : 1), [moonEvent]);
  const worldCenter: [number, number, number] = [world.widthM / 2, 0, -7];

  // Wayfinding: which month the fox is walking through (plus its neighbours for the pill's
  // direction hints). The player ref mutates without re-rendering, so poll it — and keep the
  // same object reference while the month is unchanged so React can bail out of re-rendering.
  const [month, setMonth] = useState<MonthNeighbors | null>(() =>
    monthNeighborsAt(playerRef.current.x, world),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setMonth((prevVal) => {
        const nextVal = monthNeighborsAt(playerRef.current.x, world);
        return prevVal && nextVal && prevVal.current === nextVal.current ? prevVal : nextVal;
      });
    }, 300);
    return () => window.clearInterval(id);
  }, [world]);

  // The tapped flower's memory card (null = closed).
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const activeEntry = useMemo(
    () => world.flowers.find((f) => f.entry.id === activeEntryId)?.entry ?? null,
    [world, activeEntryId],
  );

  // Look gesture on the canvas wrapper (the HUD is a sibling, so buttons stay clickable).
  // No pointer capture — capturing would retarget events away from the R3F canvas and
  // break tap-to-open raycasting; the wrapper is full-viewport so moves keep flowing.
  const lookRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookRef.current) return;
    lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const look = lookRef.current;
    if (!look || look.id !== e.pointerId) return;
    playerRef.current = applyLook(
      playerRef.current,
      e.clientX - look.x,
      e.clientY - look.y,
      LOOK_SENSITIVITY,
    );
    look.x = e.clientX;
    look.y = e.clientY;
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookRef.current?.id === e.pointerId) lookRef.current = null;
  };

  // Control hint fades out after a few seconds.
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setHintVisible(false), HINT_FADE_MS);
    return () => window.clearTimeout(id);
  }, []);
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const hint = hintVisible
    ? coarsePointer
      ? 'walk with the stick · tap a flower to open'
      : 'WASD to run · shift to stroll · drag to look · click a flower'
    : null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      >
        <Canvas
          flat
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{
            fov: 70,
            near: 0.1,
            far: 600,
            position: [world.spawn.x, EYE_HEIGHT, world.spawn.z],
          }}
        >
          <color attach="background" args={[skyStops[1]?.color ?? '#9bc4e6']} />
          <fog attach="fog" args={[lighting.fogColor, fog.near, fog.far]} />
          <hemisphereLight
            args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]}
          />
          <directionalLight
            color={lightColor}
            intensity={lightIntensity}
            position={[lightDir.x * 150, lightDir.y * 150, lightDir.z * 150]}
          />
          <SkyDome
            phase={phase}
            cloudCover={cloudCover}
            reducedMotion={reducedMotion}
            center={worldCenter}
          />
          <CelestialSprites
            phase={phase}
            cloudCover={cloudCover}
            sunDir={sunDir}
            moonDir={moonDir}
            sunOpacity={PHASES[phase].sun.o}
            moonOpacity={PHASES[phase].moon.o}
            sunCore={PHASES[phase].sun.core}
            moonState={moonState}
            latitude={latitude}
            center={worldCenter}
            moonTint={moonTint}
            moonScale={moonScale}
          />
          <StarField
            opacity={starOpacityFor(phase)}
            reducedMotion={reducedMotion}
            center={worldCenter}
          />
          {!reducedMotion && (
            <ShootingStars
              phase={phase}
              cloudCover={cloudCover}
              category={category}
              center={worldCenter}
              forceShoot={isDev && params.get('shoot') === '1'}
            />
          )}
          <CloudLayer
            phase={phase}
            cloudCover={cloudCover}
            reducedMotion={reducedMotion}
            center={worldCenter}
          />
          <HorizonHaze phase={phase} cloudCover={cloudCover} center={worldCenter} />
          <MountainRing colors={hillColorsFor(phase, category)} center={worldCenter} />
          <TerrainMesh world={world} color={groundColorFor(phase, category)} />
          <GrassField world={world} color={groundColorFor(phase, category)} wind={wind} />
          <TreeField world={world} phase={phase} wind={wind} />
          <RockField world={world} />
          <GroundCoverField world={world} wind={wind} />
          <ClutterField world={world} />
          {wind && <WindDriver uniforms={wind} category={category} windSpeed={windSpeed} />}
          {world.stream && (
            <>
              <StreamWater
                stream={world.stream}
                skyTint={skyStops[skyStops.length - 1]?.color ?? '#bedaee'}
                glint={lighting.sunColor}
                reducedMotion={reducedMotion}
              />
              <StreamBanks
                stream={world.stream}
                skyTint={skyStops[skyStops.length - 1]?.color ?? '#bedaee'}
              />
              <StreamFoam
                stream={world.stream}
                skyTint={skyStops[skyStops.length - 1]?.color ?? '#bedaee'}
                reducedMotion={reducedMotion}
              />
              <FishField stream={world.stream} reducedMotion={reducedMotion} />
            </>
          )}
          <StreamDecor world={world} wind={wind} />
          <FlowerField
            world={world}
            textures={textures}
            brightness={lighting.flowerBrightness}
            reducedMotion={reducedMotion}
            onSelect={setActiveEntryId}
          />
          {!reducedMotion && (
            <ButterflyField world={world} phase={phase} category={category} />
          )}
          {!reducedMotion && (
            <SkyFlights
              phase={phase}
              category={category}
              playerRef={playerRef}
              forceFlight={
                isDev && (params.get('flight') === 'ducks' || params.get('flight') === 'bird')
                  ? (params.get('flight') as 'ducks' | 'bird')
                  : null
              }
            />
          )}
          <WeatherParticles
            category={category}
            windSpeed={windSpeed}
            reducedMotion={reducedMotion}
          />
          <AmbientMotes phase={phase} category={category} reducedMotion={reducedMotion} />
          {!reducedMotion && category && shouldShowLightning(category) && (
            <LightningRig
              category={category}
              fogColor={lighting.fogColor}
              fastForDev={isDev && params.get('flash') === '1'}
            />
          )}
          <FoxRig
            world={world}
            playerRef={playerRef}
            joystickRef={joystickRef}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </div>
      {coarsePointer && <VirtualJoystick inputRef={joystickRef} />}
      {activeEntry && (
        <ExploreMemoryCard entry={activeEntry} onClose={() => setActiveEntryId(null)} />
      )}
      <ExploreHud
        onBack={() => router.push('/garden')}
        hint={hint}
        progress={progress}
        coarsePointer={coarsePointer}
        month={month}
      />
    </div>
  );
}
