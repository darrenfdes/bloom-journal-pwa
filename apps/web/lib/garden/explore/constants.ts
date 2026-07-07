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

/** Ponds sit south of the flower band as landmarks between month regions. */
export const POND_RADIUS = 5;
export const POND_Z = 7;
export const POND_LEVEL = -0.15;

export const SPAWN_Z = 5;

/** Billboard texture sizing (px, square). Larger gardens drop a size to cap GPU memory. */
export const FLOWER_TEX_SIZE = 256;
export const FLOWER_TEX_SIZE_SMALL = 192;
export const FLOWER_TEX_SMALL_THRESHOLD = 256;
