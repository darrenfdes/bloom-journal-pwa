'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';

import {
  FAR_HILL_PARALLAX,
  NEAR_HILL_PARALLAX,
} from '@/lib/scene/garden-proportions';

const TAP_THRESHOLD_PX = 8;
const HINT_DRAG_PX = 40;
const MIN_MOMENTUM = 6;
const MOMENTUM_DECAY = 3.0;
const JUMP_DURATION_S = 0.85;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type Jump = { from: number; to: number; t: number; dur: number } | null;

interface Options {
  /** Element that receives pointer/wheel input and defines the viewport. */
  sceneRef: RefObject<HTMLElement | null>;
  /** The world layer translated by -scroll. */
  worldRef: RefObject<HTMLElement | null>;
  /** Hill layers parallaxed via backgroundPositionX. */
  farHillsRef: RefObject<HTMLElement | null>;
  nearHillsRef: RefObject<HTMLElement | null>;
  worldWidth: number;
  viewportWidth: number;
  /** Column left-edges (world X) used to resolve the active month. */
  monthEdges: number[];
  reducedMotion: boolean;
  onActiveIndexChange?: (index: number) => void;
  /**
   * Fires on a pointer-up that did not move past the tap threshold. Receives the
   * pointer-DOWN target — after setPointerCapture the pointer-up target is the
   * scene, so the original element must be remembered from pointerdown.
   */
  onTap?: (downTarget: EventTarget | null) => void;
  /** Fires once when the user first drags/wheels far enough to dismiss the hint. */
  onFirstMove?: () => void;
}

export interface MeadowPan {
  /** Live scroll value (read each frame by canvas FX). */
  scrollRef: RefObject<number>;
  /** Eased pan to a target world X (clamped to [0, maxScroll]). */
  jumpTo: (target: number) => void;
}

export function useMeadowPan({
  sceneRef,
  worldRef,
  farHillsRef,
  nearHillsRef,
  worldWidth,
  viewportWidth,
  monthEdges,
  reducedMotion,
  onActiveIndexChange,
  onTap,
  onFirstMove,
}: Options): MeadowPan {
  const scrollRef = useRef(0);
  const velRef = useRef(0);
  const jumpRef = useRef<Jump>(null);
  const draggingRef = useRef(false);
  const maxScrollRef = useRef(0);
  const activeIndexRef = useRef(-1);
  const firstMoveRef = useRef(false);

  // Keep the latest callbacks/data without re-subscribing the rAF loop.
  const monthEdgesRef = useRef(monthEdges);
  const onActiveIndexChangeRef = useRef(onActiveIndexChange);
  const onTapRef = useRef(onTap);
  const onFirstMoveRef = useRef(onFirstMove);
  const reducedMotionRef = useRef(reducedMotion);
  monthEdgesRef.current = monthEdges;
  onActiveIndexChangeRef.current = onActiveIndexChange;
  onTapRef.current = onTap;
  onFirstMoveRef.current = onFirstMove;
  reducedMotionRef.current = reducedMotion;

  maxScrollRef.current = Math.max(0, worldWidth - viewportWidth);
  scrollRef.current = clamp(scrollRef.current, 0, maxScrollRef.current);

  const jumpTo = useCallback(
    (target: number) => {
      const to = clamp(target, 0, maxScrollRef.current);
      velRef.current = 0;
      if (reducedMotionRef.current) {
        scrollRef.current = to;
        jumpRef.current = null;
        return;
      }
      jumpRef.current = { from: scrollRef.current, to, t: 0, dur: JUMP_DURATION_S };
    },
    []
  );

  // Pointer + wheel input.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let lastX = 0;
    let lastMoveT = 0;
    let moved = 0;
    let pointerId: number | null = null;

    const isSceneUi = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('[data-scene-ui]'));

    const signalFirstMove = () => {
      if (firstMoveRef.current) return;
      firstMoveRef.current = true;
      onFirstMoveRef.current?.();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || isSceneUi(e.target)) return;
      draggingRef.current = true;
      jumpRef.current = null;
      velRef.current = 0;
      moved = 0;
      lastX = e.clientX;
      lastMoveT = performance.now();
      pointerId = e.pointerId;
      try {
        scene.setPointerCapture(e.pointerId);
      } catch {
        /* capture unsupported — drag still works via bubbling */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || pointerId !== e.pointerId) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max(8, now - lastMoveT);
      scrollRef.current = clamp(
        scrollRef.current - dx,
        0,
        maxScrollRef.current
      );
      velRef.current = lerp(velRef.current, -dx / (dt / 1000), 0.4);
      moved += Math.abs(dx);
      lastX = e.clientX;
      lastMoveT = now;
      if (moved > HINT_DRAG_PX) signalFirstMove();
    };

    const endDrag = (e: PointerEvent) => {
      if (!draggingRef.current || pointerId !== e.pointerId) return;
      draggingRef.current = false;
      pointerId = null;
      try {
        scene.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      if (moved < TAP_THRESHOLD_PX) {
        velRef.current = 0;
        onTapRef.current?.(e);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isSceneUi(e.target)) return;
      jumpRef.current = null;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrollRef.current = clamp(
        scrollRef.current + delta,
        0,
        maxScrollRef.current
      );
      signalFirstMove();
    };

    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('pointermove', onPointerMove);
    scene.addEventListener('pointerup', endDrag);
    scene.addEventListener('pointercancel', endDrag);
    scene.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('pointermove', onPointerMove);
      scene.removeEventListener('pointerup', endDrag);
      scene.removeEventListener('pointercancel', endDrag);
      scene.removeEventListener('wheel', onWheel);
    };
  }, [sceneRef]);

  // Single rAF tick: integrate scroll, then write transforms imperatively.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!draggingRef.current) {
        const jump = jumpRef.current;
        if (jump) {
          jump.t += dt;
          const k = easeInOutCubic(Math.min(1, jump.t / jump.dur));
          scrollRef.current = lerp(jump.from, jump.to, k);
          if (jump.t >= jump.dur) jumpRef.current = null;
        } else if (Math.abs(velRef.current) > MIN_MOMENTUM) {
          scrollRef.current = clamp(
            scrollRef.current + velRef.current * dt,
            0,
            maxScrollRef.current
          );
          velRef.current *= Math.exp(-MOMENTUM_DECAY * dt);
          if (
            scrollRef.current <= 0 ||
            scrollRef.current >= maxScrollRef.current
          ) {
            velRef.current = 0;
          }
        }
      }

      const scroll = scrollRef.current;
      const world = worldRef.current;
      if (world) {
        world.style.transform = `translate3d(${(-scroll).toFixed(2)}px,0,0)`;
      }
      const far = farHillsRef.current;
      if (far) {
        far.style.backgroundPositionX = `${(-scroll * FAR_HILL_PARALLAX).toFixed(2)}px`;
      }
      const near = nearHillsRef.current;
      if (near) {
        near.style.backgroundPositionX = `${(-scroll * NEAR_HILL_PARALLAX).toFixed(2)}px`;
      }

      const edges = monthEdgesRef.current;
      if (edges.length) {
        const probe = scroll + viewportWidth * 0.4;
        let idx = 0;
        for (let i = 0; i < edges.length; i++) {
          if (probe >= edges[i]!) idx = i;
        }
        if (idx !== activeIndexRef.current) {
          activeIndexRef.current = idx;
          onActiveIndexChangeRef.current?.(idx);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [worldRef, farHillsRef, nearHillsRef, viewportWidth]);

  return { scrollRef, jumpTo };
}
