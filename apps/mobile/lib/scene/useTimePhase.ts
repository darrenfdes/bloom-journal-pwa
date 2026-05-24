import { useEffect, useState } from 'react';

import { getTimePhase, type TimePhase } from '@bloom/core';

export function useTimePhase(): TimePhase {
  const [phase, setPhase] = useState<TimePhase>(() =>
    getTimePhase(new Date().getHours())
  );

  useEffect(() => {
    const tick = () => setPhase(getTimePhase(new Date().getHours()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return phase;
}
