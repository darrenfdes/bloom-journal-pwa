'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/**
 * The meadow ground: a segmented plane displaced by the same `groundHeightAt` the camera and
 * flowers sample, so nothing floats. One draw call.
 */
export function TerrainMesh({ world, color }: { world: ExploreWorld; color: string }) {
  const geometry = useMemo(() => {
    const width = world.widthM + 120;
    const depth = 90;
    // ~1.5 m quads, capped so huge gardens don't explode the vertex count.
    const segX = Math.min(420, Math.ceil(width / 1.5));
    const segZ = Math.ceil(depth / 1.5);
    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(world.widthM / 2, 0, -7);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeightAt(pos.getX(i), pos.getZ(i), world.stream));
    }
    geo.computeVertexNormals();
    return geo;
  }, [world]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial color={color} />
    </mesh>
  );
}
