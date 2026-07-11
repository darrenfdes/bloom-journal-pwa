'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { POOL_HALF_WIDTH, STREAM_HALF_WIDTH } from '@/lib/garden/explore/constants';
import { mixHex } from '@/lib/garden/explore/sky';
import { resampleStream, type Stream } from '@/lib/garden/explore/stream';

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

/** Scattered pin-prick glints; scrolled fast and shimmered for sun/moon sparkle on the surface. */
function sparkleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 0.5 + Math.random() * 1.1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.5, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ribbon rows as fractions of the local half-width: bank → mid → centre → mid → bank.
const ROW_OFFSETS = [-1, -0.55, 0, 0.55, 1] as const;
const COLUMN_SPACING = 1.5;

/**
 * The stream surface: a ribbon built from a dense resample of the centerline (five rows across the
 * channel) so it reads darker/deeper down the middle and paler at the shallows — and shallower
 * overall where the channel narrows. A drifting highlight layer scrolls downstream to fake a
 * current, a sparkle layer glints, and travelling ripples run the sheet. Terrain carves the bed
 * beneath it (see `groundHeightAt`); everything freezes under reduced motion.
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
  const sparkle = useMemo(() => sparkleTexture(), []);
  useEffect(
    () => () => {
      flow.dispose();
      sparkle.dispose();
    },
    [flow, sparkle],
  );

  // Build the ribbon once per stream; recolour cheaply when the phase's sky tint changes.
  const { geometry, baseY, columns, arcs } = useMemo(() => {
    const pts = resampleStream(stream, COLUMN_SPACING);
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

    const rows = ROW_OFFSETS.length;
    const positions = new Float32Array(rows * n * 3);
    const uvs = new Float32Array(rows * n * 2);
    const arcAt: number[] = [];
    let arc = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) arc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z);
      arcAt[i] = arc;
      const hw = pts[i]!.halfWidth;
      const nrm = normals[i]!;
      for (let r = 0; r < rows; r++) {
        const vi = r * n + i;
        const off = ROW_OFFSETS[r]! * hw;
        positions[vi * 3] = pts[i]!.x + nrm.x * off;
        positions[vi * 3 + 1] = y;
        positions[vi * 3 + 2] = pts[i]!.z + nrm.z * off;
        uvs[vi * 2] = arc / 6; // repeats every ~6 m along the flow
        uvs[vi * 2 + 1] = r / (rows - 1);
      }
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
    return { geometry: geo, baseY: y, columns: pts, arcs: arcAt };
  }, [stream]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Depth-graded vertex colours: saturated teal-blue down the deep centre, lighter teal at the
  // shallow banks, and shallower overall where the channel narrows. Weighted toward real water
  // colours (not the pale sky) so it doesn't read as a path.
  const colors = useMemo(() => {
    const deep = mixHex(skyTint, '#0e3a4a', 0.78);
    const shallow = mixHex(skyTint, '#3f8f8a', 0.58);
    const rows = ROW_OFFSETS.length;
    const n = columns.length;
    const arr = new Float32Array(rows * n * 3);
    const c = new THREE.Color();
    for (let r = 0; r < rows; r++) {
      // 1 at the centre row, 0 at the banks; the exponent widens the deep zone so the middle of
      // the channel stays saturated teal instead of a thin dark stripe.
      const centre = (1 - Math.abs(ROW_OFFSETS[r]!)) ** 0.6;
      for (let i = 0; i < n; i++) {
        // Narrow creek reads shallow, broad pool reads deep.
        const wide =
          (columns[i]!.halfWidth - STREAM_HALF_WIDTH) / (POOL_HALF_WIDTH - STREAM_HALF_WIDTH);
        const depth = centre * Math.min(1, Math.max(0.35, wide));
        c.set(mixHex(shallow, deep, depth));
        const vi = r * n + i;
        arr[vi * 3] = c.r;
        arr[vi * 3 + 1] = c.g;
        arr[vi * 3 + 2] = c.b;
      }
    }
    return arr;
  }, [skyTint, columns]);

  useEffect(() => {
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }, [geometry, colors]);

  const glintRef = useRef<THREE.MeshBasicMaterial>(null);
  const sparkleRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!reducedMotion) {
      flow.offset.x = -t * 0.05; // drift the highlights downstream
      flow.offset.y = Math.sin(t * 0.2) * 0.02;
      sparkle.offset.x = -t * 0.12;
      if (glintRef.current) glintRef.current.opacity = 0.14 + 0.06 * Math.sin(t * 0.8);
      if (sparkleRef.current) sparkleRef.current.opacity = 0.06 + 0.06 * Math.sin(t * 2.3);
      // Two summed sines phased by arc position, so the ripples travel downstream.
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const rows = ROW_OFFSETS.length;
      const n = columns.length;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < n; i++) {
          const a = arcs[i]!;
          arr[(r * n + i) * 3 + 1] =
            baseY +
            Math.sin(t * 1.4 - a * 0.9 + r * 0.7) * 0.012 +
            Math.sin(t * 0.9 - a * 0.35) * 0.008;
        }
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* depthWrite off so the fish (drawn after, see FishField renderOrder) stay visible under
          the surface instead of being depth-culled by the sheet. */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
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
      <mesh geometry={geometry} position={[0, 0.03, 0]}>
        <meshBasicMaterial
          ref={sparkleRef}
          map={sparkle}
          color={glint}
          transparent
          opacity={0.08}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
