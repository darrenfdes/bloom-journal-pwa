import { useEffect, useState } from 'react';

import { getMoonPhase, type MoonPhaseState } from '@bloom/core/scene';

export function useMoonPhase(): MoonPhaseState {
  const [moon, setMoon] = useState<MoonPhaseState>(() => getMoonPhase(new Date()));

  useEffect(() => {
    const tick = () => setMoon(getMoonPhase(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return moon;
}
