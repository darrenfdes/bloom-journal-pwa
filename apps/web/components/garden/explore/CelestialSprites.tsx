'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { applyMoonPhaseShadow, type MoonPhaseState } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import { haloLayersFor } from '@/lib/garden/explore/sky-detail';

import { radialTexture } from './textures';

/**
 * Sun and moon as camera-facing sprites, positioned from the same continuous celestial
 * interpolation the 2D meadow uses, with soft additive halos behind each (largest at the
 * warm low dawn/golden sun, muted by cloud cover). The moon disc is shaded with the real
 * lunar-phase shadow (erased to transparency so the sky shows through), latitude-flipped
 * like 2D.
 */
export function CelestialSprites({
  phase,
  cloudCover,
  sunDir,
  moonDir,
  sunOpacity,
  moonOpacity,
  sunCore,
  moonState,
  latitude,
  center,
}: {
  phase: PhaseKey;
  cloudCover: number;
  sunDir: { x: number; y: number; z: number };
  moonDir: { x: number; y: number; z: number };
  sunOpacity: number;
  moonOpacity: number;
  sunCore: string;
  moonState: MoonPhaseState;
  latitude: number;
  center: [number, number, number];
}) {
  const sunTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, sunCore);
    g.addColorStop(0.28, sunCore);
    g.addColorStop(0.45, `${sunCore}66`);
    g.addColorStop(1, `${sunCore}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [sunCore]);

  const moonTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const r = 56;
    // Cream disc with a soft limb, then a few faint craters like the 2D moon.
    const g = ctx.createRadialGradient(58, 58, 8, 64, 64, r);
    g.addColorStop(0, '#fbf7ea');
    g.addColorStop(0.8, '#efe9d4');
    g.addColorStop(1, '#e2dcc4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,174,150,.35)';
    for (const [cx, cy, cr] of [
      [48, 52, 7],
      [76, 72, 9],
      [60, 86, 5],
      [84, 44, 4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Erase the unlit region to transparency so the sky gradient shows through.
    ctx.globalCompositeOperation = 'destination-out';
    applyMoonPhaseShadow(ctx, 64, 64, r, moonState, latitude, '#000');
    ctx.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [moonState, latitude]);

  const haloTexture = useMemo(() => radialTexture(`${sunCore}cc`, `${sunCore}00`), [sunCore]);
  const moonHaloTexture = useMemo(() => radialTexture('#dfe6f5cc', '#dfe6f500'), []);

  useEffect(
    () => () => {
      sunTexture.dispose();
    },
    [sunTexture],
  );
  useEffect(
    () => () => {
      moonTexture.dispose();
    },
    [moonTexture],
  );
  useEffect(
    () => () => {
      haloTexture.dispose();
    },
    [haloTexture],
  );
  useEffect(() => () => moonHaloTexture.dispose(), [moonHaloTexture]);

  const halos = haloLayersFor(phase);
  const haloMute = 1 - 0.7 * Math.min(1, Math.max(0, cloudCover));

  const DIST = 460;
  return (
    <group position={center}>
      {sunOpacity > 0 && (
        <>
          {halos.map(({ scaleMul, opacity }, i) => (
            <sprite
              key={`halo-${i}`}
              position={[sunDir.x * DIST, sunDir.y * DIST, sunDir.z * DIST]}
              scale={[90 * scaleMul, 90 * scaleMul, 1]}
              renderOrder={-2}
            >
              <spriteMaterial
                map={haloTexture}
                transparent
                opacity={opacity * sunOpacity * haloMute}
                blending={THREE.AdditiveBlending}
                fog={false}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          ))}
          <sprite
            position={[sunDir.x * DIST, sunDir.y * DIST, sunDir.z * DIST]}
            scale={[90, 90, 1]}
            renderOrder={-1}
          >
            <spriteMaterial
              map={sunTexture}
              transparent
              opacity={sunOpacity}
              fog={false}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        </>
      )}
      {moonOpacity > 0 && (
        <sprite
          position={[moonDir.x * DIST, moonDir.y * DIST, moonDir.z * DIST]}
          scale={[70, 70, 1]}
          renderOrder={-2}
        >
          <spriteMaterial
            map={moonHaloTexture}
            transparent
            opacity={0.15 * moonOpacity * haloMute}
            blending={THREE.AdditiveBlending}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      {moonOpacity > 0 && (
        <sprite
          position={[moonDir.x * DIST, moonDir.y * DIST, moonDir.z * DIST]}
          scale={[26, 26, 1]}
          renderOrder={-1}
        >
          <spriteMaterial
            map={moonTexture}
            transparent
            opacity={moonOpacity}
            fog={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  );
}
