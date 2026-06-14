/**
 * Web-only meadow proportions and parallax tuning for the rebuilt garden scene.
 *
 * Intentionally independent of core's GARDEN_SKY_HEIGHT_FRAC (0.28), which is
 * shared with mobile and frozen. The web scene places the horizon at 70% of the
 * viewport so the sky dominates — matching the reference (refernce.html) and the
 * design screenshot.
 */

/** Horizon / ground line as a fraction of viewport height (sky fills the top). */
export const GROUND_FRAC = 0.7;

/** Ground line Y in px for a given viewport height. */
export function getGroundY(viewportHeight: number): number {
  return Math.round(viewportHeight * GROUND_FRAC);
}

/**
 * Parallax speed per layer as a fraction of world scroll
 * (0 = pinned to the sky, 1 = travels with the flowers).
 */
export const CLOUD_PARALLAX = 0.08;
export const FAR_HILL_PARALLAX = 0.22;
export const NEAR_HILL_PARALLAX = 0.45;

/** Tiled hill band heights in px, measured up from the ground line. */
export const FAR_HILL_HEIGHT = 150;
export const NEAR_HILL_HEIGHT = 104;

/** Width of one repeating hill tile (the SVG generated for the background). */
export const HILL_TILE_WIDTH = 900;

/**
 * Month-column layout: each month occupies COLUMN_WIDTH, months are separated by
 * COLUMN_GAP, and the world is padded by EDGE_PADDING on both ends.
 */
export const COLUMN_WIDTH = 320;
export const COLUMN_GAP = 20;
export const EDGE_PADDING = 56;
