'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import { useHorizontalDragPan } from '@/lib/hooks/useHorizontalDragPan';

const SNAP_DURATION_MS = 280;
const RESISTANCE = 0.55;
const MAX_OFFSET_RATIO = 0.35;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function applyResistance(rawOffset: number, maxOffset: number): number {
  const resisted = rawOffset * RESISTANCE;
  return Math.min(maxOffset, Math.max(-maxOffset, resisted));
}

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

type Options = {
  scrollRef: RefObject<HTMLElement | null>;
  viewportWidth: number;
  enabled: boolean;
};

export function useGardenRubberBandPan({
  scrollRef,
  viewportWidth,
  enabled,
}: Options) {
  const noopRef = useRef<HTMLElement | null>(null);
  useHorizontalDragPan(enabled ? noopRef : scrollRef);

  const reducedMotion = usePrefersReducedMotion();
  const [rubberBandOffset, setRubberBandOffset] = useState(0);
  const offsetRef = useRef(0);
  const animRef = useRef(0);

  const setOffset = (value: number) => {
    offsetRef.current = value;
    setRubberBandOffset(value);
  };

  useEffect(() => {
    if (!enabled) {
      setOffset(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const el = scrollRef.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startOffset = 0;
    let pointerId: number | null = null;
    const maxOffset = Math.max(120, viewportWidth * MAX_OFFSET_RATIO);

    const isInteractive = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('[data-garden-interactive]'));
    };

    const snapToZero = () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);

      if (reducedMotion) {
        setOffset(0);
        return;
      }

      const from = offsetRef.current;
      let startTime: number | null = null;

      const step = (now: number) => {
        if (startTime === null) startTime = now;
        const t = Math.min(1, (now - startTime) / SNAP_DURATION_MS);
        setOffset(from * (1 - easeOutCubic(t)));
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          setOffset(0);
          animRef.current = 0;
        }
      };

      animRef.current = requestAnimationFrame(step);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = 0;
      }
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startOffset = offsetRef.current;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || pointerId !== e.pointerId) return;
      const raw = startOffset - (e.clientX - startX);
      setOffset(applyResistance(raw, maxOffset));
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || pointerId !== e.pointerId) return;
      dragging = false;
      pointerId = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      snapToZero();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [enabled, scrollRef, viewportWidth, reducedMotion]);

  return {
    rubberBandOffset: enabled ? rubberBandOffset : 0,
  };
}
