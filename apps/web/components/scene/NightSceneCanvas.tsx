'use client';

import { useEffect, useRef, useState } from 'react';

import { createNightSceneState, renderNightScene } from '@bloom/core/scene';
import type { NightSceneState } from '@bloom/core/scene';

type Props = {
  active: boolean;
  showMoon: boolean;
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

export function NightSceneCanvas({ active, showMoon, className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<NightSceneState | null>(null);
  const sizeRef = useRef({ W: 0, H: 0 });
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
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { W, H };
      stateRef.current = createNightSceneState(W, H);
    };

    resize();

    const drawOnce = () => {
      const { W, H } = sizeRef.current;
      const state = stateRef.current;
      if (!state || W <= 0 || H <= 0) return;
      renderNightScene(ctx, W, H, frame, state, { showMoon, animate: false });
    };

    const tick = () => {
      frame += 1;
      const { W, H } = sizeRef.current;
      const state = stateRef.current;
      if (state && W > 0 && H > 0) {
        renderNightScene(ctx, W, H, frame, state, { showMoon, animate: true });
      }
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
  }, [active, showMoon, reducedMotion]);

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
