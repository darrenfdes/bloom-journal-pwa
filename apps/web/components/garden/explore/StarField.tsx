'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { twinkleOpacity } from '@/lib/garden/explore/sky-detail';

const STAR_COUNT = 1200;
const DOME_RADIUS = 470;
const BUCKETS = 3;

/**
 * A fixed, seeded dome of stars whose opacity follows the phase palette (1 at night → 0 by
 * day). Stars are split round-robin into three buckets that twinkle out of phase with each
 * other (skipped under reduced motion) — same seeded stream, so positions never change.
 * Three draw calls; stars sit just inside the sky sphere so fog never touches them.
 */
export function StarField({
  opacity,
  reducedMotion,
  center,
}: {
  opacity: number;
  reducedMotion: boolean;
  center: [number, number, number];
}) {
  const geometries = useMemo(() => {
    const rng = mulberry32(20260706);
    const buckets = Array.from({ length: BUCKETS }, () => [] as number[]);
    for (let i = 0; i < STAR_COUNT; i++) {
      const azimuth = rng() * Math.PI * 2;
      // Bias toward higher elevations so the zenith isn't sparse.
      const elevation = Math.asin(0.08 + rng() * 0.9);
      buckets[i % BUCKETS]!.push(
        Math.cos(elevation) * Math.cos(azimuth) * DOME_RADIUS,
        Math.sin(elevation) * DOME_RADIUS,
        Math.cos(elevation) * Math.sin(azimuth) * DOME_RADIUS,
      );
    }
    return buckets.map((positions) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      return geo;
    });
  }, []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  const materialRefs = useRef<(THREE.PointsMaterial | null)[]>([null, null, null]);

  useFrame(({ clock }) => {
    if (reducedMotion || opacity <= 0) return;
    const t = clock.elapsedTime;
    materialRefs.current.forEach((mat, i) => {
      if (mat) mat.opacity = twinkleOpacity(opacity, i as 0 | 1 | 2, t);
    });
  });

  if (opacity <= 0) return null;
  return (
    <>
      {geometries.map((geometry, i) => (
        <points key={i} geometry={geometry} position={center} renderOrder={-1}>
          <pointsMaterial
            ref={(m) => {
              materialRefs.current[i] = m;
            }}
            size={1.6}
            sizeAttenuation={false}
            color="#eef2ff"
            transparent
            opacity={opacity}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      ))}
    </>
  );
}
