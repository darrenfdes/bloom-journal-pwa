'use client';

import { useEffect } from 'react';

export function PwaLifecycle() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
