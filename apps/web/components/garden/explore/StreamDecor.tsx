'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { streamDecorFor } from '@/lib/garden/explore/scatter';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

import { applyWindSway, type WindUniforms } from './wind-material';

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

/** Shorter, leaning blades than the reeds — tufts overhanging the waterline. */
function bankGrassGeometry() {
  const blade = (x0: number, z0: number, x1: number, z1: number, tipX: number, h: number) => [
    x0, 0, z0, x1, 0, z1, tipX, h, (z0 + z1) / 2,
  ];
  const positions = new Float32Array([
    ...blade(-0.03, 0, 0.03, 0, 0.18, 0.55),
    ...blade(0, -0.03, 0, 0.03, 0.24, 0.45),
    ...blade(0.04, 0.02, 0.09, -0.02, 0.3, 0.35),
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

const BLOSSOM = ['#e8a0c0', '#f4efe4'];
const PEBBLE = ['#8b8578', '#7a7268', '#9a8f7f'];

/**
 * Stream dressing: floating lily pads + a few open blossoms in the pool, a reed fringe hugging the
 * banks, tall cattails a little further out, pebbles sunk into the waterline, and short grass
 * tufts overhanging the edge. Placed deterministically by `streamDecorFor`; lambert pads/cattails/
 * pebbles shade with the phase lights, unlit reeds/grass read as brushstrokes. Reeds, cattails and
 * bank grass sway in the wind (pads/blossoms float, they don't bend; pebbles are stones).
 */
export function StreamDecor({ world, wind }: { world: ExploreWorld; wind: WindUniforms | null }) {
  const built = useMemo(() => {
    if (!world.stream) return null;
    const level = world.stream.level;
    const decor = streamDecorFor(world.stream);

    const padGeo = new THREE.CircleGeometry(0.5, 10, 0.34, Math.PI * 2 - 0.68);
    const reedGeo = reedGeometry();
    const blossomGeo = new THREE.CircleGeometry(0.14, 7);
    const stalkGeo = new THREE.CylinderGeometry(0.015, 0.022, 1.1, 4).translate(0, 0.55, 0);
    const headGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6).translate(0, 1.0, 0);
    const pebbleGeo = new THREE.SphereGeometry(0.5, 6, 4);
    const bankGrassGeo = bankGrassGeometry();

    const geometries = [padGeo, reedGeo, blossomGeo, stalkGeo, headGeo, pebbleGeo, bankGrassGeo];
    const padMat = new THREE.MeshLambertMaterial({ color: '#4c7a44', side: THREE.DoubleSide });
    const reedMat = new THREE.MeshBasicMaterial({ color: '#3c5a38', side: THREE.DoubleSide, toneMapped: false });
    const blossomMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, toneMapped: false });
    const stalkMat = new THREE.MeshLambertMaterial({ color: '#4a6b3e' });
    const headMat = new THREE.MeshLambertMaterial({ color: '#7a5230' });
    const pebbleMat = new THREE.MeshLambertMaterial();
    const bankGrassMat = new THREE.MeshBasicMaterial({ color: '#46693f', side: THREE.DoubleSide, toneMapped: false });
    if (wind) {
      applyWindSway(reedMat, 'reed', wind);
      applyWindSway(stalkMat, 'reed', wind);
      applyWindSway(headMat, 'reed', wind);
      applyWindSway(bankGrassMat, 'grass', wind);
    }
    const materials = [padMat, reedMat, blossomMat, stalkMat, headMat, pebbleMat, bankGrassMat];

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const col = new THREE.Color();

    const padMesh = new THREE.InstancedMesh(padGeo, padMat, decor.pads.length);
    decor.pads.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, p.x));
      m.compose(new THREE.Vector3(p.x, level + 0.03, p.z), q, new THREE.Vector3(p.scale, p.scale, p.scale));
      padMesh.setMatrixAt(i, m);
    });
    padMesh.instanceMatrix.needsUpdate = true;

    const upright = (list: { x: number; z: number; scale: number }[], mesh: THREE.InstancedMesh) => {
      list.forEach((r, i) => {
        q.setFromAxisAngle(up, (r.x + r.z) * 1.7);
        m.compose(
          new THREE.Vector3(r.x, groundHeightAt(r.x, r.z, world.stream), r.z),
          q,
          new THREE.Vector3(r.scale, r.scale, r.scale),
        );
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    const reedMesh = new THREE.InstancedMesh(reedGeo, reedMat, decor.reeds.length);
    upright(decor.reeds, reedMesh);
    const stalkMesh = new THREE.InstancedMesh(stalkGeo, stalkMat, decor.cattails.length);
    upright(decor.cattails, stalkMesh);
    const headMesh = new THREE.InstancedMesh(headGeo, headMat, decor.cattails.length);
    upright(decor.cattails, headMesh);

    const bankGrassMesh = new THREE.InstancedMesh(bankGrassGeo, bankGrassMat, decor.bankGrass.length);
    upright(decor.bankGrass, bankGrassMesh);

    // Pebbles sink a little into the wet bank; flattened spheres with a grey jitter.
    const pebbleMesh = new THREE.InstancedMesh(pebbleGeo, pebbleMat, decor.pebbles.length);
    decor.pebbles.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rotation);
      m.compose(
        new THREE.Vector3(p.x, groundHeightAt(p.x, p.z, world.stream) - 0.03, p.z),
        q,
        new THREE.Vector3(p.scale, p.scale * 0.45, p.scale),
      );
      pebbleMesh.setMatrixAt(i, m);
      pebbleMesh.setColorAt(i, col.set(PEBBLE[i % PEBBLE.length]!));
    });
    pebbleMesh.instanceMatrix.needsUpdate = true;
    if (pebbleMesh.instanceColor) pebbleMesh.instanceColor.needsUpdate = true;

    const blossomMesh = new THREE.InstancedMesh(blossomGeo, blossomMat, decor.blossoms.length);
    decor.blossoms.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, level + 0.05, b.z), flat, new THREE.Vector3(b.scale, b.scale, b.scale));
      blossomMesh.setMatrixAt(i, m);
      blossomMesh.setColorAt(i, col.set(BLOSSOM[b.variant % BLOSSOM.length]!));
    });
    blossomMesh.instanceMatrix.needsUpdate = true;
    if (blossomMesh.instanceColor) blossomMesh.instanceColor.needsUpdate = true;

    return {
      meshes: [padMesh, blossomMesh, reedMesh, stalkMesh, headMesh, pebbleMesh, bankGrassMesh],
      geometries,
      materials,
    };
  }, [world, wind]);

  useEffect(() => {
    if (!built) return;
    return () => {
      built.geometries.forEach((g) => g.dispose());
      built.materials.forEach((mat) => mat.dispose());
      built.meshes.forEach((mesh) => mesh.dispose());
    };
  }, [built]);

  if (!built) return null;
  return (
    <>
      {built.meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
}
