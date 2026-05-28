'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createNightSceneState,
  renderNightAtmosphere,
  renderNightFireflies,
  renderNightScene,
} from '@bloom/core/scene';
import type { NightSceneState } from '@bloom/core/scene';

type Props = {
  active: boolean;
  showMoon?: boolean;
  /** atmosphere = fixed sky behind pan; fireflies = meadow FX in pan */
  layer?: 'full' | 'atmosphere' | 'fireflies';
  /** Fixed sky band height (atmosphere layer). */
  bandHeight?: number;
  /** Pan viewport height — fireflies and mountain layout. */
  sceneHeight?: number;
  className?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function NightSceneCanvas({
  active,
  showMoon = true,
  layer = 'full',
  bandHeight,
  sceneHeight,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<NightSceneState | null>(null);
  const sizeRef = useRef({ W: 0, H: 0, sceneHeight: 0 });
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let frame = 0;

    const resize = () => {
      const W = wrapper.clientWidth;
      const H = wrapper.clientHeight;
      if (W <= 0 || H <= 0) return;
      const panH = sceneHeight ?? H;
      const skyH = layer === 'fireflies' ? H : (bandHeight ?? H);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { W, H, sceneHeight: panH };
      stateRef.current = createNightSceneState(W, skyH, panH);
    };

    resize();

    const draw = (animate: boolean) => {
      const { W, H, sceneHeight: panH } = sizeRef.current;
      const state = stateRef.current;
      if (!state || W <= 0 || H <= 0) return;
      const skyH = bandHeight ?? H;
      const opts = { showMoon, animate, sceneHeight: panH };
      if (layer === 'atmosphere') {
        renderNightAtmosphere(ctx, W, skyH, frame, state, opts);
      } else if (layer === 'fireflies') {
        renderNightFireflies(ctx, W, H, frame, state, opts);
      } else {
        renderNightScene(ctx, W, skyH, frame, state, opts);
      }
    };

    const drawOnce = () => draw(false);

    const tick = () => {
      frame += 1;
      draw(true);
      raf = requestAnimationFrame(tick);
    };

    if (reducedMotion) {
      drawOnce();
    } else {
      raf = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion) drawOnce();
    });
    ro.observe(wrapper);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, showMoon, layer, bandHeight, sceneHeight, reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden
      style={{
        opacity: active ? 1 : 0,
        transition: 'opacity 1.2s ease',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
