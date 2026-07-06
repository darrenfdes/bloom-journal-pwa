'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { Pond } from '@/lib/garden/explore/world-layout';

/** A drifting soft-highlight texture that reads as water shimmer. */
function shimmerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const rx = 12 + Math.random() * 26;
    const ry = 3 + Math.random() * 6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Still water: a flat sky-tinted disc per pond, topped by a slowly drifting shimmer layer that
 * catches the phase's key-light colour. The terrain already flattens to the pond bed beneath it
 * (see `groundHeightAt`). Shimmer freezes under reduced motion.
 */
export function PondDisc({
  ponds,
  skyTint,
  glint,
  reducedMotion,
}: {
  ponds: Pond[];
  skyTint: string;
  glint: string;
  reducedMotion: boolean;
}) {
  const shimmer = useMemo(() => shimmerTexture(), []);
  useEffect(() => () => shimmer.dispose(), [shimmer]);
  const matsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reducedMotion) {
      shimmer.offset.x = t * 0.015;
      shimmer.offset.y = t * 0.006;
    }
    matsRef.current.forEach((mat, i) => {
      if (mat) mat.opacity = reducedMotion ? 0.18 : 0.16 + 0.08 * Math.sin(t * 0.7 + i);
    });
  });

  return (
    <>
      {ponds.map((pond, i) => (
        <group key={`${pond.x}:${pond.z}`}>
          <mesh position={[pond.x, pond.level + 0.02, pond.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[pond.radius, 40]} />
            <meshBasicMaterial color={skyTint} transparent opacity={0.92} toneMapped={false} />
          </mesh>
          <mesh position={[pond.x, pond.level + 0.04, pond.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[pond.radius * 0.98, 40]} />
            <meshBasicMaterial
              ref={(m) => {
                matsRef.current[i] = m;
              }}
              map={shimmer}
              color={glint}
              transparent
              opacity={0.2}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
