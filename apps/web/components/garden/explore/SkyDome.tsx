'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { PHASES, type PhaseKey } from '@/lib/garden/bloom/phases';
import { parseCssLinearGradient, type GradientStop } from '@/lib/garden/explore/sky';

const FADE_SECONDS = 1.5;

function paint(
  canvas: HTMLCanvasElement,
  base: GradientStop[],
  overlay: GradientStop[] | null,
  overlayAlpha: number,
  cloudCover: number,
) {
  const ctx = canvas.getContext('2d')!;
  const drawStops = (stops: GradientStop[], alpha: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    for (const stop of stops) gradient.addColorStop(stop.offset, stop.color);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStops(base, 1);
  if (overlay && overlayAlpha > 0) drawStops(overlay, overlayAlpha);
  // Cloud cover greys the whole sky (matches the 2D meadow's haze veil).
  if (cloudCover > 0) {
    ctx.globalAlpha = 0.45 * cloudCover;
    ctx.fillStyle = '#9aa3ac';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.globalAlpha = 1;
}

/**
 * The sky: an inverted sphere textured with the phase's CSS gradient (1×256 canvas strip).
 * Phase changes crossfade over ~1.5 s like the 2D meadow (snap under reduced motion).
 */
export function SkyDome({
  phase,
  cloudCover,
  reducedMotion,
  center,
}: {
  phase: PhaseKey;
  /** 0..1; greys the sky like the 2D haze veil. */
  cloudCover: number;
  reducedMotion: boolean;
  center: [number, number, number];
}) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 256;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);

  const fade = useRef<{ prev: GradientStop[] | null; target: GradientStop[]; t: number }>({
    prev: null,
    target: parseCssLinearGradient(PHASES[phase].sky),
    t: 1,
  });

  useEffect(() => {
    const next = parseCssLinearGradient(PHASES[phase].sky);
    const f = fade.current;
    if (JSON.stringify(next) === JSON.stringify(f.target)) return;
    f.prev = f.target;
    f.target = next;
    f.t = reducedMotion ? 1 : 0;
    paint(canvas, f.prev ?? next, next, f.t, cloudCover);
    texture.needsUpdate = true;
  }, [phase, reducedMotion, canvas, texture, cloudCover]);

  // Initial paint + repaint when cloud cover shifts.
  useEffect(() => {
    const f = fade.current;
    paint(canvas, f.prev ?? f.target, f.target, f.t, cloudCover);
    texture.needsUpdate = true;
  }, [canvas, texture, cloudCover]);

  useFrame((_, delta) => {
    const f = fade.current;
    if (f.t >= 1) return;
    f.t = Math.min(1, f.t + delta / FADE_SECONDS);
    paint(canvas, f.prev ?? f.target, f.target, f.t, cloudCover);
    texture.needsUpdate = true;
  });

  return (
    <mesh position={center} renderOrder={-2}>
      <sphereGeometry args={[500, 32, 24]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
