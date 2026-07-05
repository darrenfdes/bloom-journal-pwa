/**
 * Deterministic gentle terrain undulation for the explorable meadow, shared by the terrain
 * mesh, flower placement, and the walking camera so nothing ever floats or sinks.
 *
 * Pure logic — no three.js, no React.
 */
import type { Pond } from './world-layout';

/** Blend distance (m) over which terrain eases down to a pond's water level. */
const POND_BLEND = 3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function groundHeightAt(x: number, z: number, ponds: readonly Pond[] = []): number {
  // Three fixed sines (wavelengths ~45/22/18 m, total amplitude ≤ 0.5 m) — no RNG, so the
  // ground is identical everywhere it's sampled.
  let h =
    0.22 * Math.sin(x * 0.14 + 1.3) +
    0.16 * Math.sin(z * 0.28 + 4.1) +
    0.12 * Math.sin((x + z) * 0.35 + 2.2);

  for (const pond of ponds) {
    const d = Math.hypot(x - pond.x, z - pond.z);
    const t = clamp01((d - pond.radius) / POND_BLEND);
    const s = t * t * (3 - 2 * t); // smoothstep: 0 inside the pond → 1 past the blend ring
    h = pond.level + (h - pond.level) * s;
  }
  return h;
}
