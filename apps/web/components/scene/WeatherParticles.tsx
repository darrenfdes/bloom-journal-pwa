'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  getRainParticleCount,
  shouldShowAutumnLeaves,
  shouldShowPetals,
} from '@bloom/core/scene';
import type { SceneState, WeatherCategory } from '@bloom/core/scene';

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

function RainParticles({ category }: { category: WeatherCategory }) {
  const count = getRainParticleCount(category);
  const drops = useMemo(() => {
    const rand = seededRandom(category.charCodeAt(0) + count);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      delay: rand() * 0.8,
      duration: 0.4 + rand() * 0.4,
      height: 15 + rand() * 10,
    }));
  }, [category, count]);

  return (
    <>
      {drops.map((d) => (
        <span
          key={d.id}
          className={styles.rainDrop}
          style={{
            left: `${d.left}%`,
            height: d.height,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
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

function PetalParticles() {
  const petals = useMemo(() => {
    const rand = seededRandom(99);
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      top: 10 + rand() * 60,
      delay: rand() * 8,
      duration: 10 + rand() * 6,
      color: rand() > 0.5 ? '#f8bbd0' : '#fff',
      size: 6 + rand() * 4,
    }));
  }, []);

  return (
    <>
      {petals.map((p) => (
        <span
          key={p.id}
          className={styles.petal}
          style={{
            top: `${p.top}%`,
            width: p.size,
            height: p.size * 0.7,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
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

function LightningFlash() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 4000 + Math.random() * 8000;
      timeoutId = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, []);

  if (!flash) return null;
  return <div className={styles.lightningFlash} aria-hidden />;
}

export function WeatherParticles({ scene }: Props) {
  if (scene.status !== 'ready' || !scene.weather) return null;

  const { category, windSpeed, visibility } = scene.weather;
  const showRain =
    category === 'drizzle' || category === 'rain' || category === 'heavy_rain';
  const showPetals = shouldShowPetals(scene.season, category, windSpeed);
  const showLeaves = shouldShowAutumnLeaves(scene.season);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 5 }}
      aria-hidden
    >
      {showRain ? <RainParticles category={category} /> : null}
      {category === 'snow' ? <SnowParticles /> : null}
      {category === 'fog' ? <FogParticles visibility={visibility} /> : null}
      {category === 'thunderstorm' ? <LightningFlash /> : null}
      {showPetals ? <PetalParticles /> : null}
      {showLeaves ? <LeafParticles /> : null}
    </div>
  );
}
