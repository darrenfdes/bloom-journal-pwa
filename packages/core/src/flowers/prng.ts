/**
 * Deterministic PRNG for procedural flower geometry.
 *
 * Implementation follows the spec: multiply seed by 2654435761 (Knuth's
 * multiplicative hash constant), then xorshift (<<13, >>>17, <<5), and
 * normalize to [0, 1) via `% 100000 / 100000`. The same seed always
 * yields the same value.
 */
export function xorshiftRand(seed: number): number {
  let x = Math.imul(seed | 0, 2654435761) | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  const n = ((x | 0) >>> 0) % 100000;
  return n / 100000;
}

/** Stateful sequence generator — each call advances the seed deterministically. */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b1) | 0;
    return xorshiftRand(s);
  };
}

export function rngRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function rngInt(rng: () => number, min: number, maxExclusive: number): number {
  return Math.floor(min + rng() * (maxExclusive - min));
}

export function rngPick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}
