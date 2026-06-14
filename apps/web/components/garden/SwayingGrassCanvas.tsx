'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createSwayingGrassState,
  renderSwayingGrass,
  type SwayingGrassState,
} from '@bloom/core/garden/swaying-grass-canvas';

type Props = {
  scrollLeft: number;
  tileWidth: number;
  viewportHeight: number;
  wrapperOffset?: number;
  seed?: number;
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

export function SwayingGrassCanvas({
  scrollLeft,
  tileWidth,
  viewportHeight,
  wrapperOffset = 0,
  seed = 1337,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateByTileRef = useRef<Map<number, SwayingGrassState>>(new Map());
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || tileWidth <= 0 || viewportHeight <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let frame = 0;

    const resize = () => {
      const W = wrapper.clientWidth;
      const H = viewportHeight;
      if (W <= 0 || H <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const getTileState = (tileIndex: number) => {
      let state = stateByTileRef.current.get(tileIndex);
      if (!state) {
        state = createSwayingGrassState(tileWidth, viewportHeight, seed + tileIndex * 997);
        stateByTileRef.current.set(tileIndex, state);
      }
      return state;
    };

    const drawFrame = (animate: boolean) => {
      const W = wrapper.clientWidth;
      const H = viewportHeight;
      if (W <= 0 || H <= 0) return;

      ctx.clearRect(0, 0, W, H);
      const startIndex = Math.floor(scrollLeft / tileWidth) - 1;
      const endIndex = Math.ceil((scrollLeft + W) / tileWidth) + 1;

      for (let tileIndex = startIndex; tileIndex <= endIndex; tileIndex += 1) {
        // Tile i covers world [i*w, (i+1)*w); screen x = world − scroll
        const tileLeft = tileIndex * tileWidth - scrollLeft + wrapperOffset;
        if (tileLeft + tileWidth < 0 || tileLeft > W) continue;

        ctx.save();
        ctx.translate(tileLeft, 0);
        const state = getTileState(tileIndex);
        renderSwayingGrass(ctx, tileWidth, H, frame, state, { animate });
        ctx.restore();
      }
    };

    resize();

    const drawOnce = () => drawFrame(false);

    const tick = () => {
      frame += 1;
      drawFrame(true);
      raf = requestAnimationFrame(tick);
    };

    if (reducedMotion) {
      drawOnce();
    } else {
      raf = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => {
      resize();
      stateByTileRef.current.clear();
      if (reducedMotion) drawOnce();
    });
    ro.observe(wrapper);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [scrollLeft, tileWidth, viewportHeight, wrapperOffset, seed, reducedMotion]);

  if (tileWidth <= 0 || viewportHeight <= 0) return null;

  return (
    <div
      ref={wrapperRef}
      className={className}
      aria-hidden
      style={{ width: '100%', height: viewportHeight, pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
