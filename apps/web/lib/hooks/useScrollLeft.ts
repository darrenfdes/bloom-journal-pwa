'use client';

import { type RefObject, useEffect, useState } from 'react';

export function useScrollLeft(scrollRef: RefObject<HTMLElement | null>): number {
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrollLeft(el.scrollLeft);
      });
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return scrollLeft;
}
