'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  generatePetalDriftSpecs,
  generateRicklerRainRows,
  getLightningIntervalMs,
  isPrecipitatingCategory,
  shouldShowAutumnLeaves,
  shouldShowLightning,
  shouldShowPetals,
} from '@bloom/core/scene';
import type { RicklerRainDropSpec, SceneState, WeatherCategory } from '@bloom/core/scene';

import styles from './SceneFx.module.css';

type Props = {
  scene: SceneState;
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useLightningFlash(category: WeatherCategory, reducedMotion: boolean) {
  const [flash, setFlash] = useState(false);
  const [boltX, setBoltX] = useState(50);

  useEffect(() => {
    if (!shouldShowLightning(category) || reducedMotion) {
      setFlash(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const { min, max } = getLightningIntervalMs(category);

    const schedule = () => {
      const delay = min + Math.random() * (max - min);
      timeoutId = setTimeout(() => {
        setBoltX(8 + Math.random() * 84);
        setFlash(true);
        setTimeout(() => setFlash(false), 180);
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [category, reducedMotion]);

  return { flash, boltX };
}

function RicklerDrop({ drop, side }: { drop: RicklerRainDropSpec; side: 'left' | 'right' }) {
  const timing = {
    animationDelay: `${drop.delaySec}s`,
    animationDuration: `${drop.durationSec}s`,
  };

  return (
    <div
      className={styles.ricklerDrop}
      style={{
        ...(side === 'left'
          ? { left: `${drop.horizontalPct}%` }
          : { right: `${drop.horizontalPct}%` }),
        bottom: `${drop.bottomPct}%`,
        ...timing,
      }}
    >
      <div className={styles.ricklerStem} style={timing} />
      <div className={styles.ricklerSplat} style={timing} />
    </div>
  );
}

function RainParticles({
  category,
  reducedMotion,
}: {
  category: WeatherCategory;
  reducedMotion: boolean;
}) {
  const rows = useMemo(() => generateRicklerRainRows(category), [category]);

  if (reducedMotion) {
    return (
      <div className={styles.rainStaticOverlay} style={{ opacity: 0.25 }} aria-hidden />
    );
  }

  return (
    <>
      <div className={styles.rainFrontRow} aria-hidden>
        {rows.front.map((drop) => (
          <RicklerDrop key={drop.id} drop={drop} side="left" />
        ))}
      </div>
      <div className={styles.rainBackRow} aria-hidden>
        {rows.back.map((drop) => (
          <RicklerDrop key={drop.id} drop={drop} side="right" />
        ))}
      </div>
    </>
  );
}

function LightningLayer({
  category,
  reducedMotion,
}: {
  category: WeatherCategory;
  reducedMotion: boolean;
}) {
  const { flash, boltX } = useLightningFlash(category, reducedMotion);

  if (!flash || reducedMotion) return null;

  return (
    <>
      <div className={styles.lightningFlash} aria-hidden />
      <div className={styles.lightningTint} aria-hidden />
      <div className={styles.lightningBolt} style={{ left: `${boltX}%` }} aria-hidden />
    </>
  );
}

function SnowParticles() {
  const flakes = useMemo(() => {
    const rand = seededRandom(7);
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      size: 3 + rand() * 3,
      delay: rand() * 5,
      duration: 2 + rand() * 3,
    }));
  }, []);

  return (
    <>
      {flakes.map((f) => (
        <span
          key={f.id}
          className={styles.snowFlake}
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        />
      ))}
    </>
  );
}

function FogParticles({ visibility }: { visibility: number }) {
  const opacity = Math.min(1, Math.max(0.2, 1 - visibility / 10000));
  const blobs = [
    { left: '5%', width: '45%', height: '28%' },
    { left: '35%', width: '50%', height: '32%' },
    { left: '60%', width: '38%', height: '26%' },
    { left: '20%', width: '42%', height: '30%' },
  ];

  return (
    <>
      {blobs.map((b, i) => (
        <div
          key={i}
          className={styles.fogBlob}
          style={{
            left: b.left,
            bottom: '5%',
            width: b.width,
            height: b.height,
            opacity,
            animationDelay: `${i * 3}s`,
          }}
        />
      ))}
    </>
  );
}

function PetalParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const petals = useMemo(() => generatePetalDriftSpecs(), []);

  if (reducedMotion) return null;

  return (
    <>
      {petals.map((p) => (
        <span
          key={p.id}
          className={styles.petal}
          style={{
            top: `${p.topPct}%`,
            width: p.size,
            height: p.size * 0.7,
            background: p.color,
            animationDelay: `${p.delaySec}s`,
            animationDuration: `${p.durationSec}s`,
          }}
        />
      ))}
    </>
  );
}

function LeafParticles() {
  const leaves = useMemo(() => {
    const rand = seededRandom(55);
    const colors = ['#bf360c', '#e64a19', '#ff7043'];
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      delay: rand() * 5,
      duration: 3 + rand() * 3,
      color: colors[i % colors.length]!,
      size: 10 + rand() * 6,
    }));
  }, []);

  return (
    <>
      {leaves.map((l) => (
        <span
          key={l.id}
          className={styles.leaf}
          style={{
            left: `${l.left}%`,
            width: l.size,
            height: l.size * 0.65,
            background: l.color,
            animationDelay: `${l.delay}s`,
            animationDuration: `${l.duration}s`,
          }}
        />
      ))}
    </>
  );
}

export function WeatherParticles({ scene }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  if (scene.status !== 'ready' || !scene.weather) return null;

  const { category, windSpeed, visibility } = scene.weather;
  const showRain = isPrecipitatingCategory(category);
  const showPetals = shouldShowPetals(scene.season, category, windSpeed);
  const showLeaves = shouldShowAutumnLeaves(scene.season);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 12 }}
      aria-hidden
    >
      {showRain ? <RainParticles category={category} reducedMotion={reducedMotion} /> : null}
      {category === 'snow' ? <SnowParticles /> : null}
      {category === 'fog' ? <FogParticles visibility={visibility} /> : null}
      {shouldShowLightning(category) ? (
        <LightningLayer category={category} reducedMotion={reducedMotion} />
      ) : null}
      {showPetals ? <PetalParticles reducedMotion={reducedMotion} /> : null}
      {showLeaves ? <LeafParticles /> : null}
    </div>
  );
}
