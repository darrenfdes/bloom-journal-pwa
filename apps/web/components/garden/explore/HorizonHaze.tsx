'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import { horizonHazeFor } from '@/lib/garden/explore/sky-detail';

const RADIUS = 235;
const HEIGHT = 40;

/**
 * A ground-hugging atmosphere band just outside the mountain rings: opaque haze at the base
 * fading to clear sky, so ridge silhouettes and star bottoms melt into the horizon instead of
 * ending on a hard line. Repainted on phase/cover changes like the sky dome.
 */
export function HorizonHaze({
  phase,
  cloudCover,
  center,
}: {
  phase: PhaseKey;
  cloudCover: number;
  center: [number, number, number];
}) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 64;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const { color, opacity } = horizonHazeFor(phase, cloudCover);

  useEffect(() => {
    const c = texture.image as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const g = ctx.createLinearGradient(0, c.height, 0, 0);
    g.addColorStop(0, color);
    g.addColorStop(0.45, `${color}99`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    texture.needsUpdate = true;
  }, [texture, color]);

  return (
    <mesh position={[center[0], HEIGHT / 2 - 4, center[2]]} renderOrder={-1}>
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, 48, 1, true]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
