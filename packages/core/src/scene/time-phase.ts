import type { TimePhase } from './types';

export function getTimePhase(hours: number): TimePhase {
  if (hours >= 0 && hours <= 3) return 'deep_night';
  if (hours >= 4 && hours <= 5) return 'pre_dawn';
  if (hours >= 6 && hours <= 8) return 'dawn';
  if (hours >= 9 && hours <= 16) return 'day';
  if (hours >= 17 && hours <= 18) return 'golden_hour';
  if (hours >= 19 && hours <= 20) return 'dusk';
  return 'night';
}
