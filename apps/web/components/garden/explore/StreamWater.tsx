'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { mixHex } from '@/lib/garden/explore/sky';
import type { Stream } from '@/lib/garden/explore/stream';

/** Soft horizontal light streaks that read as a moving current once scrolled along the flow. */
function flowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const rx = 18 + Math.random() * 34;
    const ry = 2 + Math.random() * 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
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
 * The stream surface: a ribbon built from the centerline (three rows — left bank, deep centre,
 * right bank) so it reads darker/deeper down the middle and paler at the shallows. A drifting
 * highlight layer scrolls downstream to fake a current, and the whole sheet bobs gently. Terrain
 * carves the bed beneath it (see `groundHeightAt`); both freeze under reduced motion.
 */
export function StreamWater({
  stream,
  skyTint,
  glint,
  reducedMotion,
}: {
  stream: Stream;
  skyTint: string;
  glint: string;
  reducedMotion: boolean;
}) {
  const flow = useMemo(() => flowTexture(), []);
  useEffect(() => () => flow.dispose(), [flow]);

  // Build the ribbon once per stream; recolour cheaply when the phase's sky tint changes.
  const { geometry, baseY, cols } = useMemo(() => {
    const pts = stream.points;
    const n = pts.length;
    const y = stream.level + 0.02;

    // Unit normal at each point (perpendicular to the central-difference tangent, in xz).
    const normals = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      const len = Math.hypot(tx, tz) || 1;
      return { x: tz / len, z: -tx / len };
    });

    // Rows: 0 = left bank, 1 = centre, 2 = right bank. 3 vertices per column.
    const rows = 3;
    const positions = new Float32Array(rows * n * 3);
    const uvs = new Float32Array(rows * n * 2);
    let arc = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) arc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z);
      const hw = pts[i]!.halfWidth;
      const nrm = normals[i]!;
      const set = (row: number, off: number) => {
        const vi = row * n + i;
        positions[vi * 3] = pts[i]!.x + nrm.x * off;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = pts[i]!.z + nrm.z * off;
        uvs[vi * 2] = arc / 6; // repeats every ~6 m along the flow
        uvs[vi * 2 + 1] = row / (rows - 1);
      };
      set(0, -hw);
      set(1, 0);
      set(2, hw);
    }

    const index: number[] = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let i = 0; i < n - 1; i++) {
        const a = r * n + i;
        const b = r * n + i + 1;
        const c = (r + 1) * n + i;
        const d = (r + 1) * n + i + 1;
        index.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(index);
    return { geometry: geo, baseY: y, cols: n };
  }, [stream]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Depth-graded vertex colours: saturated teal-blue down the deep centre, lighter teal at the
  // shallow banks. Weighted toward real water colours (not the pale sky) so it doesn't read as a path.
  const colors = useMemo(() => {
    const deep = mixHex(skyTint, '#0e3a4a', 0.72);
    const shallow = mixHex(skyTint, '#3f8f8a', 0.52);
    const n = cols;
    const arr = new Float32Array(3 * n * 3);
    const c = new THREE.Color();
    for (let row = 0; row < 3; row++) {
      const hex = row === 1 ? deep : shallow;
      for (let i = 0; i < n; i++) {
        c.set(hex);
        const vi = row * n + i;
        arr[vi * 3] = c.r;
        arr[vi * 3 + 1] = c.g;
        arr[vi * 3 + 2] = c.b;
      }
    }
    return arr;
  }, [skyTint, cols]);

  useEffect(() => {
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }, [geometry, colors]);

  const glintRef = useRef<THREE.MeshBasicMaterial>(null);
  const basePos = useMemo(() => (geometry.attributes.position as THREE.BufferAttribute).array.slice(), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reducedMotion) {
      flow.offset.x = -t * 0.05; // drift the highlights downstream
      flow.offset.y = Math.sin(t * 0.2) * 0.02;
      if (glintRef.current) glintRef.current.opacity = 0.14 + 0.06 * Math.sin(t * 0.8);
      // Gentle surface bob.
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePos[i] as number;
        const bz = basePos[i + 2] as number;
        arr[i + 1] = baseY + Math.sin(t * 1.1 + bx * 0.5 + bz * 0.5) * 0.02;
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.015, 0]}>
        <meshBasicMaterial
          ref={glintRef}
          map={flow}
          color={glint}
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
