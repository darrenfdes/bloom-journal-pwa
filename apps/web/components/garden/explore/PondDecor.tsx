'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { groundHeightAt } from '@/lib/garden/explore/terrain';
import { pondDecorFor } from '@/lib/garden/explore/scatter';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/** A few tall thin reed blades, crossed like the grass tufts but darker and taller. */
function reedGeometry() {
  const blade = (x0: number, z0: number, x1: number, z1: number, h: number) => [
    x0, 0, z0, x1, 0, z1, (x0 + x1) / 2, h, (z0 + z1) / 2,
  ];
  const positions = new Float32Array([
    ...blade(-0.03, 0, 0.03, 0, 1.15),
    ...blade(0, -0.03, 0, 0.03, 1.0),
    ...blade(0.05, 0.02, 0.1, -0.02, 0.85),
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

/**
 * Pond dressing: flat lily pads floating on the water and a ring of reeds around the rim,
 * placed deterministically per pond. Lambert so they shade with the phase lights.
 */
export function PondDecor({ world }: { world: ExploreWorld }) {
  const meshes = useMemo(() => {
    const padGeo = new THREE.CircleGeometry(0.5, 10, 0.34, Math.PI * 2 - 0.68);
    const reedGeo = reedGeometry();
    const padMat = new THREE.MeshLambertMaterial({ color: '#4c7a44', side: THREE.DoubleSide });
    const reedMat = new THREE.MeshBasicMaterial({ color: '#3c5a38', side: THREE.DoubleSide, toneMapped: false });

    const pads: THREE.Vector4[] = [];
    const reeds: THREE.Vector4[] = [];
    world.ponds.forEach((pond, i) => {
      const decor = pondDecorFor(pond, i);
      for (const p of decor.pads) pads.push(new THREE.Vector4(p.x, pond.level + 0.03, p.z, p.scale));
      for (const r of decor.reeds) reeds.push(new THREE.Vector4(r.x, 0, r.z, r.scale));
    });

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    const padMesh = new THREE.InstancedMesh(padGeo, padMat, pads.length);
    pads.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, p.x));
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.w, p.w, p.w));
      padMesh.setMatrixAt(i, m);
    });
    padMesh.instanceMatrix.needsUpdate = true;

    const reedMesh = new THREE.InstancedMesh(reedGeo, reedMat, reeds.length);
    reeds.forEach((r, i) => {
      q.setFromAxisAngle(up, (r.x + r.z) * 1.7);
      m.compose(
        new THREE.Vector3(r.x, groundHeightAt(r.x, r.z, world.ponds), r.z),
        q,
        new THREE.Vector3(r.w, r.w, r.w),
      );
      reedMesh.setMatrixAt(i, m);
    });
    reedMesh.instanceMatrix.needsUpdate = true;

    return { padMesh, reedMesh, padGeo, reedGeo, padMat, reedMat };
  }, [world]);

  useEffect(
    () => () => {
      meshes.padGeo.dispose();
      meshes.reedGeo.dispose();
      meshes.padMat.dispose();
      meshes.reedMat.dispose();
      meshes.padMesh.dispose();
      meshes.reedMesh.dispose();
    },
    [meshes],
  );

  return (
    <>
      <primitive object={meshes.padMesh} />
      <primitive object={meshes.reedMesh} />
    </>
  );
}
