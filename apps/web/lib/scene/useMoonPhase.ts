'use client';

import { useEffect, useState } from 'react';

import { getMoonPhase } from '@bloom/core/scene';
import type { MoonPhaseState } from '@bloom/core/scene';

export function useMoonPhase(): MoonPhaseState {
  const [moon, setMoon] = useState<MoonPhaseState>(() => getMoonPhase(new Date()));

  useEffect(() => {
    const tick = () => setMoon(getMoonPhase(new Date()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return moon;
}
