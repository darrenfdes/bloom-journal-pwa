import { SeededRNG } from '../flowers/seeded-rng';

export type WeatherCloudSpec = {
  /** Horizontal position as fraction of viewport width (0–1). */
  x: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
};

const CLOUD_LAYOUT_SEED = 0xc10d5;

const BASE_CLOUDS: Omit<WeatherCloudSpec, 'x'>[] = [
  { y: 40, scale: 1.1, opacity: 0.72, duration: 120_000, delay: 0, drift: 48 },
  { y: 78, scale: 0.85, opacity: 0.68, duration: 140_000, delay: 8_000, drift: 40 },
  { y: 115, scale: 0.95, opacity: 0.7, duration: 160_000, delay: 15_000, drift: 52 },
  { y: 148, scale: 0.7, opacity: 0.62, duration: 130_000, delay: 22_000, drift: 36 },
];

/** Drifting clouds — always at least the base set; extra density from cloud cover (0–100). */
export function getWeatherClouds(cloudCover: number, width: number): WeatherCloudSpec[] {
  const rng = new SeededRNG(CLOUD_LAYOUT_SEED);
  const extraCount = cloudCover > 55 ? Math.min(2, Math.round((cloudCover - 55) / 25)) : 0;
  const coverBoost = 0.85 + (cloudCover / 100) * 0.2;
  const baseOpacity = 0.55 * coverBoost;

  const clouds: WeatherCloudSpec[] = BASE_CLOUDS.map((base, i) => ({
    ...base,
    x: width * [0.05, 0.4, 0.58, 0.15][i]!,
    opacity: base.opacity * coverBoost,
  }));

  for (let i = 0; i < extraCount; i++) {
    clouds.push({
      x: rng.range(0.2, 0.75) * width,
      y: rng.range(50, 130),
      scale: rng.range(0.75, 1.05),
      opacity: baseOpacity * rng.range(0.9, 1.05),
      duration: Math.round(rng.range(110_000, 150_000)),
      delay: Math.round(rng.range(4_000, 18_000)),
      drift: Math.round(rng.range(32, 50)),
    });
  }

  return clouds;
}
