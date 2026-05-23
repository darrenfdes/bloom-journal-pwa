'use client';

import { type RefObject, useEffect, useState } from 'react';

export type ScrollMetrics = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
};

const EMPTY: ScrollMetrics = { scrollLeft: 0, scrollWidth: 0, clientWidth: 0 };

export function useScrollMetrics(scrollRef: RefObject<HTMLElement | null>): ScrollMetrics {
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;

    const update = () => {
      setMetrics({
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return metrics;
}
