'use client';

import { useEffect, useState } from 'react';

type WindowSize = { width: number; height: number };

export function useWindowSize(debounceMs = 150): WindowSize {
  const [size, setSize] = useState<WindowSize>({ width: 390, height: 800 });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(update, debounceMs);
    };

    update();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', onResize);
    };
  }, [debounceMs]);

  return size;
}
