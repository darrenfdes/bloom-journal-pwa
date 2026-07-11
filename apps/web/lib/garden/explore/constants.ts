/**
 * World-scale constants for the 3D explorable meadow. 1 world unit = 1 metre.
 * The 2D meadow lays months out in 560 px bands; PX_TO_M maps that to 28 m strips.
 */
export const PX_TO_M = 0.05;
export const EYE_HEIGHT = 1.6;
export const WALK_SPEED = 3.9; // m/s (top run speed)
/** Keyboard input scale while Shift is held — a stroll instead of a run. */
export const STROLL_FACTOR = 0.45;
/** How fast the move input ramps toward its target (1/s) — the fox accelerates from a stop. */
export const MOVE_ACCEL_RATE = 5.5;

/** The player fox (Khronos glTF Sample Fox — see public/models/CREDITS.md). */
export const FOX_MODEL_URL = '/models/Fox.glb';
export const FOX_SCALE = 0.012;
/**
 * Extra yaw applied to the model so its snout faces the movement heading. The Khronos Fox's
 * local forward is +Z, but the meadow's forward is −Z, so the model needs a half-turn.
 */
export const FOX_HEADING_OFFSET = Math.PI;
/** Camera look-at height above the ground — roughly the fox's head. */
export const FOX_HEAD_HEIGHT = 0.65;

/** The stream fish (Quaternius low-poly Fish — see public/models/CREDITS.md). */
export const FISH_MODEL_URL = '/models/Fish.glb';
/**
 * Extra yaw applied to the fish model so its nose faces the `fishAt` heading. The Quaternius
 * Fish's local forward is already +Z — the same convention as the pure fish logic.
 */
export const FISH_HEADING_OFFSET = 0;
/** Gait speed thresholds (m/s): below walk-min = idle, above run-min = run. */
export const FOX_GAIT_WALK_MIN = 0.15;
export const FOX_GAIT_RUN_MIN = 2.2;

/** Third-person follow camera: boom length + elevation clamps (radians). */
export const CAM_BOOM = 4.2;
export const CAM_ELEV_BASE = 0.32;
export const CAM_ELEV_MIN = 0.05;
export const CAM_ELEV_MAX = 1.15;
/** The camera never dips closer than this to the terrain. */
export const CAM_MIN_CLEARANCE = 0.4;

/** Exponential damping rates (1/s) for camera follow, fox heading and gait speed. */
export const CAM_DAMP_RATE = 8;
export const HEADING_DAMP_RATE = 10;
export const SPEED_DAMP_RATE = 8;

/** Flowers scatter northward (−z) from the south edge of the band. */
export const FLOWER_Z_NEAR = -2;
export const FLOWER_Z_SPAN = 16;

/** Walkable margin around the month strips. */
export const BOUNDS_MARGIN_X = 12;
export const BOUNDS_NORTH_Z = -26;
export const BOUNDS_SOUTH_Z = 12;

/**
 * The meadow's watercourse — a stream that enters from beyond the north treeline, widens into a
 * swimmable pool south of the flower band, and exits beyond the south edge. `POND_LEVEL` is the
 * water surface; the pool bed is carved deeper (see terrain.ts).
 */
export const POND_Z = 7; // pool centre, south of the flower band
export const POND_LEVEL = -0.15; // water surface height (y)
/** Half-widths (m): a slim creek at the ends, a broad pool in the middle. */
export const STREAM_HALF_WIDTH = 1.4;
export const POOL_HALF_WIDTH = 5.5;
/** Above this half-width the water is "deep" — the fox swims; below it, the fox wades. */
export const WADE_HALF_WIDTH = 3.2;
/** How far past the world bounds the stream's endpoints run, so it reads as coming from off-map. */
export const STREAM_OFFMAP = 10;
/** Terrain eases down to the streambed over this distance past the water's edge. */
export const STREAM_BLEND = 3;
/** The streambed drops this far below the surface — shallow at the creek, deep in the pool. */
export const POOL_BED_MIN_DROP = 0.12;
export const POOL_BED_MAX_DROP = 0.7;
/** Swimming is slower than running, and the floating fox sits this far below the waterline. */
export const SWIM_SPEED_FACTOR = 0.5;
export const FOX_FLOAT_SUBMERSION = 0.2;

export const SPAWN_Z = 5;

/** Billboard texture sizing (px, square). Larger gardens drop a size to cap GPU memory. */
export const FLOWER_TEX_SIZE = 256;
export const FLOWER_TEX_SIZE_SMALL = 192;
export const FLOWER_TEX_SMALL_THRESHOLD = 256;
