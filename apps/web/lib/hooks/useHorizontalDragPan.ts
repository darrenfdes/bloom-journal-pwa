'use client';

import { type RefObject, useEffect } from 'react';

/**
 * Pointer-drag panning for a horizontally scrollable container.
 * Skips elements marked with data-garden-interactive (flowers, scrubber chips).
 */
export function useHorizontalDragPan(scrollRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let pointerId: number | null = null;

    const isInteractive = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('[data-garden-interactive]'));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      dragging = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || pointerId !== e.pointerId) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
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
    };
  }, [scrollRef]);
}
