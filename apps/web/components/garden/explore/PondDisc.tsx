'use client';

import * as THREE from 'three';

import type { Pond } from '@/lib/garden/explore/world-layout';

/**
 * Still water: a flat sky-tinted disc per pond — the illustration-style stand-in for a
 * reflection (unlit, so it stays luminous like the 2D palette). The terrain already flattens
 * to the pond bed beneath it (see `groundHeightAt`).
 */
export function PondDisc({ ponds, skyTint }: { ponds: Pond[]; skyTint: string }) {
  return (
    <>
      {ponds.map((pond) => (
        <mesh
          key={`${pond.x}:${pond.z}`}
          position={[pond.x, pond.level + 0.02, pond.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[pond.radius, 40]} />
          <meshBasicMaterial color={skyTint} transparent opacity={0.92} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
