/**
 * Deterministic helpers ported verbatim from the Bloom Meadow reference artifact
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`, spec §4). Kept self-contained
 * so two renders of the same entry produce pixel-identical flowers.
 */

/** FNV-1a 32-bit string hash → unsigned 32-bit seed. */
export const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Mulberry32 seeded PRNG → returns a function producing floats in [0, 1). */
export const mulberry32 = (a: number): (() => number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const hex2rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** Linear interpolate between two hex colors → `rgb(...)` string. */
export const lerpColor = (a: string, b: string, t: number): string => {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i]! - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
