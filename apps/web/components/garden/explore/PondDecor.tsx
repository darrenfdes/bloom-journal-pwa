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

const BLOSSOM = ['#e8a0c0', '#f4efe4'];

/**
 * Pond dressing: floating lily pads + a few open blossoms, a reed rim, tall cattails just outside
 * the reeds, and a soft muddy bank ring seating the water in the ground. Placed deterministically
 * per pond; lambert pads/cattails shade with the phase lights, unlit reeds read as brushstrokes.
 */
export function PondDecor({ world }: { world: ExploreWorld }) {
  const built = useMemo(() => {
    const padGeo = new THREE.CircleGeometry(0.5, 10, 0.34, Math.PI * 2 - 0.68);
    const reedGeo = reedGeometry();
    const blossomGeo = new THREE.CircleGeometry(0.14, 7);
    const stalkGeo = new THREE.CylinderGeometry(0.015, 0.022, 1.1, 4).translate(0, 0.55, 0);
    const headGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6).translate(0, 1.0, 0);
    const bankGeo = new THREE.RingGeometry(1, 1.12, 40);

    const geometries = [padGeo, reedGeo, blossomGeo, stalkGeo, headGeo, bankGeo];
    const padMat = new THREE.MeshLambertMaterial({ color: '#4c7a44', side: THREE.DoubleSide });
    const reedMat = new THREE.MeshBasicMaterial({ color: '#3c5a38', side: THREE.DoubleSide, toneMapped: false });
    const blossomMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, toneMapped: false });
    const stalkMat = new THREE.MeshLambertMaterial({ color: '#4a6b3e' });
    const headMat = new THREE.MeshLambertMaterial({ color: '#7a5230' });
    const bankMat = new THREE.MeshLambertMaterial({ color: '#41482f', side: THREE.DoubleSide });
    const materials = [padMat, reedMat, blossomMat, stalkMat, headMat, bankMat];

    const pads: THREE.Vector4[] = [];
    const reeds: THREE.Vector4[] = [];
    const cattails: THREE.Vector4[] = [];
    const blossoms: { x: number; y: number; z: number; s: number; variant: number }[] = [];
    const banks: { x: number; y: number; z: number; r: number }[] = [];
    world.ponds.forEach((pond, i) => {
      const decor = pondDecorFor(pond, i);
      for (const p of decor.pads) pads.push(new THREE.Vector4(p.x, pond.level + 0.03, p.z, p.scale));
      for (const r of decor.reeds) reeds.push(new THREE.Vector4(r.x, 0, r.z, r.scale));
      for (const c of decor.cattails) cattails.push(new THREE.Vector4(c.x, 0, c.z, c.scale));
      for (const b of decor.blossoms)
        blossoms.push({ x: b.x, y: pond.level + 0.05, z: b.z, s: b.scale, variant: b.variant });
      banks.push({ x: pond.x, y: pond.level + 0.01, z: pond.z, r: pond.radius });
    });

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const col = new THREE.Color();

    const padMesh = new THREE.InstancedMesh(padGeo, padMat, pads.length);
    pads.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, p.x));
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.w, p.w, p.w));
      padMesh.setMatrixAt(i, m);
    });
    padMesh.instanceMatrix.needsUpdate = true;

    const upright = (list: THREE.Vector4[], mesh: THREE.InstancedMesh) => {
      list.forEach((r, i) => {
        q.setFromAxisAngle(up, (r.x + r.z) * 1.7);
        m.compose(
          new THREE.Vector3(r.x, groundHeightAt(r.x, r.z, world.ponds), r.z),
          q,
          new THREE.Vector3(r.w, r.w, r.w),
        );
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    const reedMesh = new THREE.InstancedMesh(reedGeo, reedMat, reeds.length);
    upright(reeds, reedMesh);
    const stalkMesh = new THREE.InstancedMesh(stalkGeo, stalkMat, cattails.length);
    upright(cattails, stalkMesh);
    const headMesh = new THREE.InstancedMesh(headGeo, headMat, cattails.length);
    upright(cattails, headMesh);

    const blossomMesh = new THREE.InstancedMesh(blossomGeo, blossomMat, blossoms.length);
    blossoms.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.y, b.z), flat, new THREE.Vector3(b.s, b.s, b.s));
      blossomMesh.setMatrixAt(i, m);
      blossomMesh.setColorAt(i, col.set(BLOSSOM[b.variant % BLOSSOM.length]!));
    });
    blossomMesh.instanceMatrix.needsUpdate = true;
    if (blossomMesh.instanceColor) blossomMesh.instanceColor.needsUpdate = true;

    const bankMesh = new THREE.InstancedMesh(bankGeo, bankMat, banks.length);
    banks.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.y, b.z), flat, new THREE.Vector3(b.r, b.r, b.r));
      bankMesh.setMatrixAt(i, m);
    });
    bankMesh.instanceMatrix.needsUpdate = true;

    return {
      meshes: [bankMesh, padMesh, blossomMesh, reedMesh, stalkMesh, headMesh],
      geometries,
      materials,
    };
  }, [world]);

  useEffect(
    () => () => {
      built.geometries.forEach((g) => g.dispose());
      built.materials.forEach((mat) => mat.dispose());
      built.meshes.forEach((mesh) => mesh.dispose());
    },
    [built],
  );

  return (
    <>
      {built.meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
}
