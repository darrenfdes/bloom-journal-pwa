/**
 * Storm lightning timing + brightness envelope for the 3D meadow. Scheduling reuses the 2D
 * meadow's `shouldShowLightning`/`getLightningIntervalMs` so both views flash on the same
 * cadence; the envelope shapes each flash as a sharp strike with a smaller restrike. Pure —
 * the light/fog mutation lives in `components/garden/explore/LightningRig.tsx`.
 */
import {
  getLightningIntervalMs,
  shouldShowLightning,
  type WeatherCategory,
} from '@bloom/core/scene';

/** Colours/boosts the rig applies at full envelope. */
export const LIGHTNING = {
  hemiSky: '#dfe6ff',
  hemiGround: '#aab4d0',
  /** Peak intensity of the flash hemisphere light. */
  hemiBoost: 2.2,
  /** How far the fog colour is pulled toward the flash white at peak. */
  fogLift: 0.55,
} as const;

/** Milliseconds until the next flash, or null when this weather never flashes. */
export function nextFlashDelayMs(
  category: WeatherCategory | undefined,
  rand01: number,
): number | null {
  if (!category || !shouldShowLightning(category)) return null;
  const { min, max } = getLightningIntervalMs(category);
  return min + rand01 * (max - min);
}

/**
 * Flash brightness 0..1 over the seconds since the strike: instant peak decaying fast, a dark
 * beat, a smaller restrike, dead by 0.5 s — the classic double-strike read.
 */
export function flashEnvelope(tSec: number): number {
  if (tSec < 0) return 0;
  if (tSec < 0.12) return 1 - tSec / 0.12;
  if (tSec < 0.18) return 0;
  if (tSec < 0.2) return 0.65 * ((tSec - 0.18) / 0.02);
  if (tSec < 0.42) return 0.65 * (1 - (tSec - 0.2) / 0.22);
  return 0;
}
