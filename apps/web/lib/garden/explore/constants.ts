/**
 * World-scale constants for the 3D explorable meadow. 1 world unit = 1 metre.
 * The 2D meadow lays months out in 560 px bands; PX_TO_M maps that to 28 m strips.
 */
export const PX_TO_M = 0.05;
export const EYE_HEIGHT = 1.6;
export const WALK_SPEED = 3; // m/s

/** Flowers scatter northward (−z) from the south edge of the band. */
export const FLOWER_Z_NEAR = -2;
export const FLOWER_Z_SPAN = 16;

/** Walkable margin around the month strips. */
export const BOUNDS_MARGIN_X = 12;
export const BOUNDS_NORTH_Z = -26;
export const BOUNDS_SOUTH_Z = 12;

/** Ponds sit south of the flower band as landmarks between month regions. */
export const POND_RADIUS = 5;
export const POND_Z = 7;
export const POND_LEVEL = -0.15;

export const SPAWN_Z = 5;

/** Billboard texture sizing (px, square). Larger gardens drop a size to cap GPU memory. */
export const FLOWER_TEX_SIZE = 256;
export const FLOWER_TEX_SIZE_SMALL = 192;
export const FLOWER_TEX_SMALL_THRESHOLD = 256;
