import {
  getGardenGroundLineY,
  getGardenHillTop,
  getGardenSkyHeight,
} from './scene-layout';

/** Pixels rolling hills overlap into the sky band. */
export const GARDEN_HILL_SKY_OVERLAP = 12;

/** Original night-canvas mountain Y fractions (full-viewport reference). */
export const MOUNTAIN_REF_MIN = 0.19;
export const MOUNTAIN_REF_MAX = 0.55;

export type GardenHorizonLayout = {
  /** Bottom of the fixed sky band in screen/canvas coordinates. */
  horizonY: number;
  /** Hill SVG top offset inside the pan (meadow horizon minus overlap). */
  hillTopInPan: number;
  /** Opaque meadow fill starts here (flower ground line). */
  meadowFillTop: number;
  /** Map reference mountain fraction → Y within the sky band. */
  mountainY: (refFrac: number) => number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Sky band height for fixed atmosphere: chrome offset + meadow sky fraction.
 */
export function computeSkyBandHeight(panTopOffset: number, sceneHeight: number): number {
  return panTopOffset + getGardenSkyHeight(sceneHeight);
}

/**
 * Shared horizon geometry for night atmosphere + rolling hills.
 *
 * @param sceneHeight — pan viewport height
 * @param skyBandHeight — fixed sky layer height (includes header offset on web)
 */
export function getGardenHorizonLayout(
  sceneHeight: number,
  skyBandHeight: number,
  hillSkyOverlap = GARDEN_HILL_SKY_OVERLAP
): GardenHorizonLayout {
  const hillTopInPan = getGardenHillTop(sceneHeight) - hillSkyOverlap;
  const meadowFillTop = getGardenGroundLineY(sceneHeight);
  const horizonY = skyBandHeight;
  const yPeak = skyBandHeight * 0.12;
  /** Align mountain bases with the meadow hill line (pan horizon minus overlap). */
  const yBase = skyBandHeight - hillSkyOverlap;

  const mountainY = (refFrac: number): number => {
    const t = clamp(
      (refFrac - MOUNTAIN_REF_MIN) / (MOUNTAIN_REF_MAX - MOUNTAIN_REF_MIN),
      0,
      1
    );
    return yPeak + t * (yBase - yPeak);
  };

  return { horizonY, hillTopInPan, meadowFillTop, mountainY };
}
