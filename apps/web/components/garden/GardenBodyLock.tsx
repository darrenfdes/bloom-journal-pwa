'use client';

import { useEffect } from 'react';

/** Prevent page-level scrollbars on the immersive garden route. */
export function GardenBodyLock() {
  useEffect(() => {
    document.documentElement.classList.add('garden-route');
    return () => document.documentElement.classList.remove('garden-route');
  }, []);
  return null;
}
