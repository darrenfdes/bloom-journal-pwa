'use client';

/**
 * Realistic fireworks on a full-viewport 2D canvas.
 *
 * Physics model (per frame, ~60fps target):
 *   - Rocket: rises with upward velocity, gravity drains it; at apex (vy ~ 0) it bursts.
 *   - Spark: radial velocity from the burst, then `vy += gravity`, `v *= drag`, alpha
 *     decays over its life. Coloured trails come from the motion-blur fade: each frame we
 *     paint a low-alpha translucent rect over the whole canvas, so old sparks streak and
 *     decay instead of being cleared — the classic cheap, good-looking firework trail.
 *
 * Conventions match the rest of the scene:
 *   - DPR-scaled backing store so it stays crisp (see NightSceneCanvas).
 *   - prefers-reduced-motion → a single static burst, no rAF loop (see CometVisual).
 *   - Hard particle cap + array compaction each frame (see CometVisual's pool cap).
 *
 * Mounted inside the sky layer (zIndex 0) as a pointerEvents:none overlay, so it flies
 * above the clouds/hills but behind the UI chrome.
 */

import { useEffect, useRef } from 'react';

// ---- tunables ----
const GRAVITY = 0.09;        // px/frame² added to spark vy — gentle, realistic arc
const DRAG = 0.985;          // velocity retained per frame — air resistance
const MAX_SPARKS = 1400;     // hard cap; bursts beyond this are skipped
const ROCKET_GRAVITY = 0.04; // rockets rise almost ballistically
const BURST_VY_TRIGGER = 0.6;// when |vy| drops below this, the rocket bursts

// Classic firework palettes (warm gold + festive reds/greens/blues). Each burst picks one.
const PALETTES: ReadonlyArray<ReadonlyArray<[number, number, number]>> = [
  [[255, 224, 130], [255, 200, 80], [255, 245, 200]],          // gold
  [[255, 110, 90], [255, 70, 60], [255, 190, 160]],            // red
  [[120, 230, 150], [80, 200, 110], [200, 255, 210]],          // green
  [[120, 180, 255], [90, 140, 255], [200, 220, 255]],          // blue
  [[255, 255, 255], [220, 230, 255], [255, 240, 220]],         // white/silver
  [[255, 150, 220], [255, 100, 180], [255, 200, 235]],         // pink/magenta
];

interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number;   // remaining frames
  max: number;    // life at spawn — drives alpha falloff
  r: number; g: number; b: number;
  size: number;
}

interface Rocket {
  x: number; y: number;
  vx: number; vy: number;   // vy negative (rising)
  fuse: number;             // frames until forced burst (apex is the usual trigger)
  palette: ReadonlyArray<[number, number, number]>;
  finaleLeft: number;       // extra bursts queued for a multi-break finale (0 = single)
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function burst(sx: number, sy: number, palette: ReadonlyArray<[number, number, number]>, sparks: Spark[]): void {
  // Shell size scales with count; a "chrysanthemum" of ~90–150 sparks reads as a full bloom.
  const count = Math.floor(rand(90, 150));
  if (sparks.length + count > MAX_SPARKS) return;
  // Spherical distribution (even on the rim) via random direction + sqrt radius jitter.
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    // Square-root sampling keeps density even across the disc, not clumped at the centre.
    const speed = rand(1.4, 5.2) * (Math.random() < 0.25 ? 1.4 : 1); // a few fast "stars"
    const [r, g, b] = palette[Math.floor(Math.random() * palette.length)]!;
    sparks.push({
      x: sx, y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.floor(rand(48, 92)),
      max: 92,
      r, g, b,
      size: rand(1.4, 2.6),
    });
  }
}

export function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ctx = context; // narrowed once so inner closures keep the non-null type

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Start each (re)size from a clean black sky so resized edges don't smear old trails.
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, W, H);
    };
    resize();

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];

    const launch = (x?: number) => {
      // Rockets launch from the bottom, drift slightly, and burst in the upper third.
      const lx = x ?? rand(W * 0.15, W * 0.85);
      const apexY = rand(H * 0.12, H * 0.42);            // burst height
      const riseDist = H - apexY;
      // Solve launch vy so gravity (per frame) brings vy ~ 0 around apexY.
      // v² = u² − 2·a·d  →  u = sqrt(2·a·d)
      const vy0 = -Math.sqrt(2 * ROCKET_GRAVITY * riseDist);
      rockets.push({
        x: lx, y: H,
        vx: rand(-0.4, 0.4),
        vy: vy0,
        fuse: Math.ceil(riseDist / Math.max(0.4, Math.abs(vy0))) + 12, // safety: burst ~at apex even if math drifts
        palette: PALETTES[Math.floor(Math.random() * PALETTES.length)]!,
        finaleLeft: Math.random() < 0.3 ? Math.floor(rand(1, 3)) : 0,   // ~30% are multi-break finales
      });
    };

    if (prefersReduced) {
      // Reduced motion: one still burst high-centre, no loop.
      burst(W * 0.5, H * 0.28, PALETTES[0]!, sparks);
      drawFrame(true);
      return;
    }

    let raf = 0;
    let nextLaunchAt = performance.now() + 400; // small delay before the first shell
    let last = performance.now();

    function drawFrame(staticFrame = false) {
      // Fully clear each frame so sparks render crisp with no trailing streaks. clearRect
      // keeps the canvas transparent, so the real sky and meadow show through behind them.
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);

      // Lighter blend makes overlapping sparks glow additively, like real fireworks.
      ctx.globalCompositeOperation = 'lighter';

      // Update + draw rockets (rising ember trails).
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rk = rockets[i]!;
        rk.vy += ROCKET_GRAVITY;
        rk.x += rk.vx;
        rk.y += rk.vy;
        rk.fuse--;

        // Ember head of the rising rocket.
        const a = 0.9;
        ctx.fillStyle = `rgba(255,235,180,${a})`;
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (rk.vy >= -BURST_VY_TRIGGER || rk.fuse <= 0) {
          burst(rk.x, rk.y, rk.palette, sparks);
          // Multi-break finale: a couple of quick follow-up bursts nearby.
          if (rk.finaleLeft > 0) {
            for (let f = 0; f < rk.finaleLeft; f++) {
              burst(
                rk.x + rand(-30, 30),
                rk.y + rand(-20, 20),
                rk.palette,
                sparks,
              );
            }
          }
          rockets.splice(i, 1);
        }
      }

      // Update + draw sparks, compacting dead ones out of the array.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]!;
        s.vy += GRAVITY;
        s.vx *= DRAG;
        s.vy *= DRAG;
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
        if (s.life <= 0 || s.y > H + 20) {
          sparks.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, s.life / s.max);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (staticFrame) return;

      // Schedule the next shell.
      const now = performance.now();
      if (now >= nextLaunchAt && sparks.length < MAX_SPARKS * 0.7) {
        launch();
        nextLaunchAt = now + rand(1500, 3500);
      }
    }

    const tick = () => {
      // Frame-rate-independent-ish: cap dt so a stuttered frame doesn't catapult sparks.
      const now = performance.now();
      const dt = Math.min(40, now - last);
      last = now;
      // Run 1 sub-step per ~16ms elapsed; bounded so tab-switch spikes can't spiral.
      const steps = Math.max(1, Math.min(3, Math.round(dt / 16)));
      for (let i = 0; i < steps; i++) drawFrame();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
