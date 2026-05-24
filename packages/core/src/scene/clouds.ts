import { SeededRNG } from '../flowers/seeded-rng';

const CLOUD_SVG_WIDTH = 120;

export type WeatherCloudSpec = {
  /** Off-screen start (negative px from the left edge). */
  startX: number;
  /** Exit past the right edge (viewport width + cloud width). */
  endX: number;
  y: number;
  scale: number;
  opacity: number;
  /** Full left-to-right crossing time — higher = slower. */
  duration: number;
  delay: number;
};

const CLOUD_LAYOUT_SEED = 0xc10d5;

const BASE_CLOUDS: Omit<WeatherCloudSpec, 'startX' | 'endX'>[] = [
  { y: 40, scale: 1.1, opacity: 0.72, duration: 95_000, delay: 0 },
  { y: 78, scale: 0.85, opacity: 0.68, duration: 130_000, delay: 18_000 },
  { y: 115, scale: 0.95, opacity: 0.7, duration: 165_000, delay: 36_000 },
  { y: 148, scale: 0.7, opacity: 0.62, duration: 110_000, delay: 52_000 },
];

const BASE_START_X = [-60, -200, -130, -280];

/** Drifting clouds — always at least the base set; extra density from cloud cover (0–100). */
export function getWeatherClouds(cloudCover: number, width: number): WeatherCloudSpec[] {
  const rng = new SeededRNG(CLOUD_LAYOUT_SEED);
  const extraCount = cloudCover > 55 ? Math.min(2, Math.round((cloudCover - 55) / 25)) : 0;
  const coverBoost = 0.85 + (cloudCover / 100) * 0.2;
  const baseOpacity = 0.55 * coverBoost;

  const endX = width + CLOUD_SVG_WIDTH;

  const clouds: WeatherCloudSpec[] = BASE_CLOUDS.map((base, i) => ({
    ...base,
    startX: BASE_START_X[i] ?? -150,
    endX,
    opacity: base.opacity * coverBoost,
  }));

  for (let i = 0; i < extraCount; i++) {
    clouds.push({
      startX: Math.round(rng.range(-320, -80)),
      endX,
      y: rng.range(50, 130),
      scale: rng.range(0.75, 1.05),
      opacity: baseOpacity * rng.range(0.9, 1.05),
      duration: Math.round(rng.range(100_000, 175_000)),
      delay: Math.round(rng.range(8_000, 40_000)),
    });
  }

  return clouds;
}
