'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import type { PhaseKey } from '@/lib/garden/bloom/phases';
import {
  buildCloudField,
  CLOUD_FIELD_SEED,
  CLOUD_MAX,
  cloudOpacityFor,
  cloudTintFor,
  driftedAzimuth,
  visibleCloudCount,
} from '@/lib/garden/explore/sky-detail';

const DOME_RADIUS = 440;

/** Paint one soft multi-blob cloud puff onto a canvas, seeded per variant. */
function puffTexture(variant: number): THREE.CanvasTexture {
  const rng = mulberry32(97511 + variant * 131);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const blobs = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < blobs; i++) {
    const bx = 26 + rng() * 76;
    const by = 52 + rng() * 30;
    const br = 16 + rng() * 22;
    const g = ctx.createRadialGradient(bx, by, 1, bx, by, br);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(0.6, 'rgba(255,255,255,.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Drifting cloud puffs on the sky dome. Count scales with live cloud cover (a few even on
 * clear days), tint follows the phase, drift pauses under reduced motion. ≤16 sprites.
 */
export function CloudLayer({
  phase,
  cloudCover,
  reducedMotion,
  center,
}: {
  phase: PhaseKey;
  cloudCover: number;
  reducedMotion: boolean;
  center: [number, number, number];
}) {
  const specs = useMemo(() => buildCloudField(CLOUD_FIELD_SEED, CLOUD_MAX), []);
  const textures = useMemo(() => [puffTexture(0), puffTexture(1), puffTexture(2)], []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  const groupRef = useRef<THREE.Group>(null);
  const tint = useMemo(() => cloudTintFor(phase), [phase]);
  const visible = visibleCloudCount(cloudCover);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group || reducedMotion) return;
    const t = clock.elapsedTime;
    group.children.forEach((child, i) => {
      const spec = specs[i]!;
      const az = driftedAzimuth(spec.azimuth, spec.drift, t);
      const cosE = Math.cos(spec.elevation);
      child.position.set(
        Math.cos(az) * cosE * DOME_RADIUS,
        Math.sin(spec.elevation) * DOME_RADIUS,
        Math.sin(az) * cosE * DOME_RADIUS,
      );
    });
  });

  return (
    <group ref={groupRef} position={center}>
      {specs.map((spec, i) => {
        const cosE = Math.cos(spec.elevation);
        return (
          <sprite
            key={i}
            visible={i < visible}
            position={[
              Math.cos(spec.azimuth) * cosE * DOME_RADIUS,
              Math.sin(spec.elevation) * DOME_RADIUS,
              Math.sin(spec.azimuth) * cosE * DOME_RADIUS,
            ]}
            scale={[spec.scale * spec.stretch, spec.scale, 1]}
            renderOrder={-1}
          >
            <spriteMaterial
              map={textures[spec.variant]}
              color={tint}
              transparent
              opacity={cloudOpacityFor(cloudCover, spec.baseOpacity)}
              fog={false}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        );
      })}
    </group>
  );
}
