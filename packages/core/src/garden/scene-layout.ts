/** Share of pan height used for sky — meadow occupies the remaining ~72%. */
export const GARDEN_SKY_HEIGHT_FRAC = 0.28;

/**
 * Flower stem-base Y within the meadow band (0 = sky/meadow line, 1 = pan bottom).
 * Tuned so stems sit on the front hill slope above the grass layer.
 */
export const GARDEN_GROUND_LINE_IN_MEADOW_FRAC = 0.55;

export function getGardenSkyHeight(viewportHeight: number): number {
  return viewportHeight * GARDEN_SKY_HEIGHT_FRAC;
}

export function getGardenMeadowHeight(viewportHeight: number): number {
  return viewportHeight - getGardenSkyHeight(viewportHeight);
}

/** Top offset for tiling hill SVG segments (bottom of sky / top of meadow). */
export function getGardenHillTop(viewportHeight: number): number {
  return getGardenSkyHeight(viewportHeight);
}

/** Hill tile SVG height — fills the meadow band to the pan bottom. */
export function getGardenHillSvgHeight(viewportHeight: number): number {
  return getGardenMeadowHeight(viewportHeight);
}

/** Shared horizon Y for flowers, grass, and ground texture. */
export function getGardenGroundLineY(viewportHeight: number): number {
  const meadowTop = getGardenSkyHeight(viewportHeight);
  const meadowHeight = getGardenMeadowHeight(viewportHeight);
  return meadowTop + meadowHeight * GARDEN_GROUND_LINE_IN_MEADOW_FRAC;
}
