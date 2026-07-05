'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';

const STAR_COUNT = 1200;
const DOME_RADIUS = 470;

/**
 * A fixed, seeded dome of stars whose opacity follows the phase palette (1 at night → 0 by
 * day). One draw call; stars sit just inside the sky sphere so fog never touches them.
 */
export function StarField({
  opacity,
  center,
}: {
  opacity: number;
  center: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const rng = mulberry32(20260706);
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const azimuth = rng() * Math.PI * 2;
      // Bias toward higher elevations so the zenith isn't sparse.
      const elevation = Math.asin(0.08 + rng() * 0.9);
      positions[i * 3] = Math.cos(elevation) * Math.cos(azimuth) * DOME_RADIUS;
      positions[i * 3 + 1] = Math.sin(elevation) * DOME_RADIUS;
      positions[i * 3 + 2] = Math.cos(elevation) * Math.sin(azimuth) * DOME_RADIUS;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  if (opacity <= 0) return null;
  return (
    <points geometry={geometry} position={center} renderOrder={-1}>
      <pointsMaterial
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
  );
}
