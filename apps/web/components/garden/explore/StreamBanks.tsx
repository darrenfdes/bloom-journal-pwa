'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mixHex } from '@/lib/garden/explore/sky';
import { resampleStream, type Stream } from '@/lib/garden/explore/stream';
import { groundHeightAt } from '@/lib/garden/explore/terrain';

/** Ring extent past the waterline: damp mud at the inner edge fading out over the outer. */
const INNER_OFF = 0.05;
const OUTER_OFF = 0.85;
/** How far (m) the bank may dip below the water level before the mud fades away entirely. */
const SUBMERGE_FADE = 0.25;

/**
 * A narrow wet-mud transition ring hugging both waterlines: two thin strips draped over the bank,
 * dark damp earth at the water's edge fading to nothing where the grass takes over. Where the
 * carved bank plunges under the surface the mud fades out too (an unfaded ring would drape down
 * the slope as a visible film through the water). Fades via RGBA vertex colours so it blends into
 * any phase's ground without knowing its colour. Static — kept deliberately dark and narrow so it
 * never reads as a path.
 */
export function StreamBanks({ stream, skyTint }: { stream: Stream; skyTint: string }) {
  const { geometry, grounds } = useMemo(() => {
    const pts = resampleStream(stream, 1.5);
    const n = pts.length;

    // Unit normal at each point (perpendicular to the central-difference tangent, in xz).
    const normals = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      return { x: tz / len, z: -tx / len };
    });

    // Rows per side: inner (at the waterline) and outer (faded out). Sides: -1 left, +1 right.
    const positions = new Float32Array(2 * 2 * n * 3);
    const groundYs = new Float32Array(2 * 2 * n);
    let v = 0;
    for (const side of [-1, 1]) {
      for (const off of [INNER_OFF, OUTER_OFF]) {
        for (let i = 0; i < n; i++) {
          const p = pts[i]!;
          const nrm = normals[i]!;
          const x = p.x + nrm.x * side * (p.halfWidth + off);
          const z = p.z + nrm.z * side * (p.halfWidth + off);
          const ground = groundHeightAt(x, z, stream);
          groundYs[v] = ground;
          positions[v * 3] = x;
          // Never below the water surface, so the ring crowns the waterline instead of draping
          // down the carved slope.
          positions[v * 3 + 1] = Math.max(ground, stream.level) + 0.012;
          positions[v * 3 + 2] = z;
          v++;
        }
      }
    }

    const index: number[] = [];
    for (let side = 0; side < 2; side++) {
      const inner = side * 2 * n;
      const outer = inner + n;
      for (let i = 0; i < n - 1; i++) {
        index.push(inner + i, outer + i, inner + i + 1, inner + i + 1, outer + i, outer + i + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(index);
    return { geometry: geo, grounds: groundYs };
  }, [stream]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // RGBA vertex colours: damp mud at α≈0.55 on the inner rows fading to 0 on the outer, and
  // fading out again wherever the bank is submerged.
  useEffect(() => {
    const mud = new THREE.Color(mixHex(skyTint, '#4a3c2e', 0.8));
    const n = grounds.length / 4;
    const arr = new Float32Array(4 * n * 4);
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row < 2; row++) {
        const rowAlpha = row === 0 ? 0.55 : 0;
        for (let i = 0; i < n; i++) {
          const vi = (side * 2 + row) * n + i;
          const submerged = Math.max(0, stream.level - grounds[vi]!);
          const alpha = rowAlpha * Math.max(0, 1 - submerged / SUBMERGE_FADE);
          arr[vi * 4] = mud.r;
          arr[vi * 4 + 1] = mud.g;
          arr[vi * 4 + 2] = mud.b;
          arr[vi * 4 + 3] = alpha;
        }
      }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(arr, 4));
    (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }, [geometry, grounds, skyTint, stream.level]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
