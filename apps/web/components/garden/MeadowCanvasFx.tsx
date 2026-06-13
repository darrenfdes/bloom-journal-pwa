'use client';

import React, { type RefObject, useEffect, useRef } from 'react';

import { CLOUD_PARALLAX } from '@/lib/scene/garden-proportions';
import { getGrassColor } from '@/lib/scene/meadow-palette';
import { isSunPhase } from '@bloom/core/scene';
import type { SceneState, TimePhase } from '@bloom/core/scene';

/** Target star brightness per phase (0 = none, 1 = full). */
const STAR_BY_PHASE: Record<TimePhase, number> = {
  deep_night: 1,
  pre_dawn: 0.55,
  dawn: 0.1,
  day: 0,
  golden_hour: 0,
  dusk: 0.3,
  night: 0.9,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Cheap value noise (reference n1) — stable per integer index. */
function n1(i: number): number {
  i |= 0;
  i = (i << 13) ^ i;
  return ((i * (i * i * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
}

type Star = { fx: number; fy: number; r: number; tw: number; ph: number };
type Cloud = { x: number; y: number; sp: number; w: number; h: number; blobs: [number, number, number][] };
type Firefly = { x: number; y: number; a: number; s: number; ph: number; pul: number };
type Pollen = { x: number; y: number; s: number; ph: number };

type Props = {
  scene: SceneState;
  scrollRef: RefObject<number>;
  groundY: number;
  width: number;
  height: number;
  reducedMotion: boolean;
};

/**
 * Canvas atmosphere driven by one rAF loop. Two stacked canvases: a sky layer
 * (stars + drifting clouds, painted behind the hills) and a ground layer
 * (swaying grass + fireflies + pollen, painted over the world). Cloud and grass
 * positions read the live pan scroll for parallax.
 */
export function MeadowCanvasFx({ scene, scrollRef, groundY, width, height, reducedMotion }: Props) {
  const skyCanvasRef = useRef<HTMLCanvasElement>(null);
  const groundCanvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable scene snapshot read inside the rAF loop without re-subscribing.
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const dimsRef = useRef({ width, height, groundY });
  dimsRef.current = { width, height, groundY };
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  // Size both canvases for the device pixel ratio.
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const canvas of [skyCanvasRef.current, groundCanvasRef.current]) {
      if (!canvas) continue;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [width, height]);

  useEffect(() => {
    const sky = skyCanvasRef.current?.getContext('2d');
    const ground = groundCanvasRef.current?.getContext('2d');
    if (!sky || !ground) return;

    const stars: Star[] = [];
    const starRng = mulberry32(424242);
    for (let i = 0; i < 150; i++) {
      stars.push({
        fx: starRng(),
        fy: starRng() * 0.66,
        r: 0.5 + starRng() * 1.1,
        tw: 0.5 + starRng() * 1.6,
        ph: starRng() * 6.283,
      });
    }

    const clouds: Cloud[] = [];
    for (let i = 0; i < 6; i++) {
      const r = mulberry32(1000 + i * 77);
      const w = 110 + r() * 130;
      const h = 26 + r() * 16;
      const blobs: [number, number, number][] = [];
      const k = 3 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) {
        const bw = h * (0.9 + r() * 1.2);
        blobs.push([w * 0.12 + r() * w * 0.55, h * 0.45 - bw * 0.55, bw]);
      }
      clouds.push({ x: r() * width * 1.6, y: 16 + r() * (groundY * 0.32), sp: 3.5 + r() * 6, w, h, blobs });
    }

    const fireflies: Firefly[] = [];
    const pollen: Pollen[] = [];
    const initParticles = () => {
      fireflies.length = 0;
      pollen.length = 0;
      const { width: w, groundY: gy } = dimsRef.current;
      for (let i = 0; i < 16; i++) {
        fireflies.push({
          x: Math.random() * w,
          y: gy - 20 + Math.random() * 60,
          a: Math.random() * 6.283,
          s: 12 + Math.random() * 16,
          ph: Math.random() * 6.283,
          pul: 0.7 + Math.random() * 0.9,
        });
      }
      for (let i = 0; i < 22; i++) {
        pollen.push({ x: Math.random() * w, y: gy - Math.random() * 180, s: 6 + Math.random() * 10, ph: Math.random() * 6.283 });
      }
    };
    initParticles();

    let starAlpha = 0;
    let sunAmt = 0;
    const grassCur = hexToRgb(getGrassColor(sceneRef.current.season, sceneRef.current.timePhase));
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { width: w, height: h, groundY: gy } = dimsRef.current;
      const s = sceneRef.current;
      const scroll = scrollRef.current ?? 0;
      const reduced = reducedRef.current;

      const starTarget = STAR_BY_PHASE[s.timePhase];
      const sunTarget = isSunPhase(s.timePhase) ? 1 : 0;
      starAlpha += (starTarget - starAlpha) * Math.min(1, dt * 2.2);
      sunAmt += (sunTarget - sunAmt) * Math.min(1, dt * 2.2);
      const grassTarget = hexToRgb(getGrassColor(s.season, s.timePhase));
      for (let i = 0; i < 3; i++) {
        const cur = grassCur[i] ?? 0;
        const tgt = grassTarget[i] ?? 0;
        grassCur[i] = cur + (tgt - cur) * Math.min(1, dt * 2.2);
      }

      // ---- sky canvas: stars + clouds ----
      sky.clearRect(0, 0, w, h);
      if (starAlpha > 0.02) {
        sky.fillStyle = '#f5f2e2';
        for (const st of stars) {
          const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * st.tw + st.ph);
          sky.globalAlpha = starAlpha * tw;
          sky.beginPath();
          sky.arc(st.fx * w, st.fy * gy, st.r, 0, 6.283);
          sky.fill();
        }
        sky.globalAlpha = 1;
      }
      const cloudAlpha = 0.18 + 0.5 * (1 - starAlpha) * (sunAmt > 0.05 ? 1 : 0.55);
      sky.fillStyle = '#ffffff';
      for (const c of clouds) {
        if (!reduced) c.x += c.sp * dt;
        const span = w + c.w * 2;
        let wx = (c.x - scroll * CLOUD_PARALLAX) % span;
        if (wx < 0) wx += span;
        const ox = wx - c.w;
        sky.globalAlpha = cloudAlpha;
        sky.beginPath();
        sky.ellipse(ox + c.w / 2, c.y + c.h * 0.45, c.w / 2, c.h / 2, 0, 0, 6.283);
        sky.fill();
        for (const [bx, by, bw] of c.blobs) {
          sky.beginPath();
          sky.ellipse(ox + bx, c.y + by + bw / 2, bw / 2, bw / 2, 0, 0, 6.283);
          sky.fill();
        }
      }
      sky.globalAlpha = 1;

      // ---- ground canvas: grass + fireflies + pollen ----
      ground.clearRect(0, 0, w, h);
      ground.lineWidth = 1.7;
      ground.lineCap = 'round';
      const t = now * 0.001;
      for (let sx = -8; sx < w + 8; sx += 6) {
        const wxi = Math.floor((sx + scroll) / 6);
        const a = n1(wxi);
        const b = n1(wxi * 7 + 13);
        const c = n1(wxi * 3 + 5);
        const rooty = gy + 8 + b * 58;
        const hgt = 12 + a * 20 + (rooty - gy) * 0.12;
        const amp = reduced ? 0 : 1.6 + c * 2.6;
        const sw = Math.sin(t * (0.9 + a * 0.7) + wxi * 0.7) * amp;
        const sh = 0.78 + c * 0.34;
        ground.strokeStyle = `rgba(${Math.round(grassCur[0] * sh)},${Math.round(grassCur[1] * sh)},${Math.round(grassCur[2] * sh)},0.95)`;
        ground.beginPath();
        ground.moveTo(sx, rooty);
        ground.quadraticCurveTo(sx + sw * 0.35, rooty - hgt * 0.6, sx + sw, rooty - hgt);
        ground.stroke();
      }

      if (!reduced && starAlpha > 0.25) {
        ground.save();
        ground.shadowColor = '#ffe9a0';
        ground.shadowBlur = 9;
        ground.fillStyle = '#ffeaa0';
        for (const f of fireflies) {
          f.a += Math.sin(now * 0.0007 + f.ph) * 0.9 * dt;
          f.x += Math.cos(f.a) * f.s * dt;
          f.y += Math.sin(f.a) * f.s * dt * 0.5;
          if (f.x < -10) f.x = w + 10;
          if (f.x > w + 10) f.x = -10;
          if (f.y < gy - 110) f.y = gy - 110;
          if (f.y > gy + 58) f.y = gy + 58;
          ground.globalAlpha = starAlpha * (0.25 + 0.75 * Math.max(0, Math.sin(now * 0.002 * f.pul + f.ph)));
          ground.beginPath();
          ground.arc(f.x, f.y, 1.8, 0, 6.283);
          ground.fill();
        }
        ground.restore();
        ground.globalAlpha = 1;
      }

      if (!reduced && sunAmt > 0.15) {
        ground.fillStyle = '#fff4c8';
        for (const p of pollen) {
          p.x -= p.s * dt;
          p.y -= p.s * 0.35 * dt;
          const wob = Math.sin(now * 0.0012 + p.ph) * 8;
          if (p.x < -10) {
            p.x = w + 10;
            p.y = gy - Math.random() * 180;
          }
          if (p.y < gy - 220) p.y = gy + 10;
          ground.globalAlpha = sunAmt * (0.18 + 0.22 * Math.abs(Math.sin(now * 0.0016 + p.ph)));
          ground.beginPath();
          ground.arc(p.x + wob, p.y, 1.4, 0, 6.283);
          ground.fill();
        }
        ground.globalAlpha = 1;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollRef, width, height, groundY]);

  return (
    <>
      <canvas
        ref={skyCanvasRef}
        className="pointer-events-none absolute inset-0 z-0"
        style={{ width, height }}
        aria-hidden
      />
      <canvas
        ref={groundCanvasRef}
        className="pointer-events-none absolute inset-0 z-[7]"
        style={{ width, height }}
        aria-hidden
      />
    </>
  );
}

/** Local mulberry32 (reference) — stable star/cloud fields independent of seed RNG. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
