'use client';

import { useEffect, useState } from 'react';

import { getTimePhase } from '@bloom/core/scene';
import type { TimePhase } from '@bloom/core/scene';

export function useTimePhase(): TimePhase {
  const [phase, setPhase] = useState<TimePhase>(() =>
    getTimePhase(new Date().getHours())
  );

  useEffect(() => {
    const tick = () => setPhase(getTimePhase(new Date().getHours()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return phase;
}
