'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

import { radialTexture } from './textures';

/**
 * One camera-yaw-billboarded quad per journal entry, textured with its rasterized SVG flower.
 * The 100×140 flower viewBox bottom-aligns inside the square texture (`xMidYMax meet`), so a
 * quad whose bottom edge sits on the terrain plants the stem exactly on the ground.
 *
 * Billboarding is Y-axis-only (cylindrical): full camera-facing sprites tilt oddly when the
 * walker looks down at a flower. Sway reuses each entry's deterministic 2D sway/delay params.
 */
export function FlowerField({
  world,
  textures,
  brightness,
  reducedMotion,
  onSelect,
}: {
  world: ExploreWorld;
  textures: Map<string, THREE.CanvasTexture>;
  brightness: number;
  reducedMotion: boolean;
  onSelect: (entryId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const quad = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useEffect(() => () => quad.dispose(), [quad]);

  const tint = useMemo(() => new THREE.Color(brightness, brightness, brightness), [brightness]);

  // Shared soft-blob textures: a ground shadow under every flower, a warm halo behind
  // favourites (the 2D meadow's favourite glow).
  const shadowTexture = useMemo(() => radialTexture('rgba(20,30,25,.5)', 'rgba(20,30,25,0)'), []);
  const haloTexture = useMemo(
    () => radialTexture('rgba(255,233,176,.8)', 'rgba(255,233,176,0)'),
    [],
  );
  useEffect(
    () => () => {
      shadowTexture.dispose();
      haloTexture.dispose();
    },
    [shadowTexture, haloTexture],
  );

  useFrame(({ camera, clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const yaw = camera.rotation.y;
    const t = clock.elapsedTime;
    for (const child of group.children) {
      child.rotation.y = yaw;
      if (!reducedMotion) {
        const { sway, delay } = child.userData as { sway: number; delay: number };
        child.rotation.z = 0.02 * Math.sin((t / sway) * Math.PI * 2 + delay);
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {world.flowers.map((f) => {
          const tex = textures.get(f.entry.id);
          if (!tex) return null;
          const ground = groundHeightAt(f.x, f.z, world.stream);
          return (
            <mesh
              key={f.entry.id}
              position={[f.x, ground + f.height / 2 + 0.02, f.z]}
              scale={[f.height, f.height, 1]}
              geometry={quad}
              userData={{ entryId: f.entry.id, sway: f.entry.sway, delay: f.entry.delay }}
              onClick={(e) => {
                e.stopPropagation();
                // R3F tracks pointer travel between down/up; only stationary taps open.
                if (e.delta <= 8) onSelect(f.entry.id);
              }}
            >
              <meshBasicMaterial
                map={tex}
                transparent
                alphaTest={0.35}
                color={tint}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
      {world.flowers.map((f) => {
        if (!textures.has(f.entry.id)) return null;
        const ground = groundHeightAt(f.x, f.z, world.stream);
        return (
          <group key={`fx-${f.entry.id}`}>
            <mesh
              position={[f.x, ground + 0.012, f.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[f.height * 0.55, f.height * 0.34, 1]}
              geometry={quad}
            >
              <meshBasicMaterial
                map={shadowTexture}
                transparent
                opacity={0.5 * brightness}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {f.entry.isFavourited && (
              <sprite position={[f.x, ground + f.height * 0.62, f.z]} scale={[f.height, f.height, 1]}>
                <spriteMaterial
                  map={haloTexture}
                  transparent
                  opacity={0.32}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </sprite>
            )}
          </group>
        );
      })}
    </>
  );
}
