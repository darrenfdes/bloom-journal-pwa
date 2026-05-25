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

const BASE_CLOUDS: Omit<WeatherCloudSpec, 'startX' | 'endX' | 'delay'>[] = [
  { y: 40, scale: 1.1, opacity: 0.72, duration: 95_000 },
  { y: 78, scale: 0.85, opacity: 0.68, duration: 130_000 },
  { y: 115, scale: 0.95, opacity: 0.7, duration: 165_000 },
  { y: 148, scale: 0.7, opacity: 0.62, duration: 110_000 },
];

/** Spread clouds across the sky width so they do not stack on the left edge. */
function layoutCloud(
  rng: SeededRNG,
  width: number,
  endX: number,
  base: Omit<WeatherCloudSpec, 'startX' | 'endX' | 'delay'>
): WeatherCloudSpec {
  const minX = -CLOUD_SVG_WIDTH - 60;
  const maxX = width * 0.82;
  const startX = Math.round(rng.range(minX, maxX));

  return {
    ...base,
    y: Math.round(rng.range(28, 158)),
    startX,
    endX,
    delay: 0,
  };
}

/** Drifting clouds — always at least the base set; extra density from cloud cover (0–100). */
export function getWeatherClouds(cloudCover: number, width: number): WeatherCloudSpec[] {
  const extraCount = cloudCover > 55 ? Math.min(2, Math.round((cloudCover - 55) / 25)) : 0;
  const coverBoost = 0.85 + (cloudCover / 100) * 0.2;
  const baseOpacity = 0.55 * coverBoost;

  const endX = width + CLOUD_SVG_WIDTH;

  const clouds: WeatherCloudSpec[] = BASE_CLOUDS.map((base, i) => {
    const cloudRng = new SeededRNG(CLOUD_LAYOUT_SEED + (i + 1) * 9973);
    return layoutCloud(cloudRng, width, endX, {
      ...base,
      opacity: base.opacity * coverBoost,
    });
  });

  const rng = new SeededRNG(CLOUD_LAYOUT_SEED + 42);

  for (let i = 0; i < extraCount; i++) {
    clouds.push(
      layoutCloud(rng, width, endX, {
        y: 90,
        scale: rng.range(0.75, 1.05),
        opacity: baseOpacity * rng.range(0.9, 1.05),
        duration: Math.round(rng.range(100_000, 175_000)),
      })
    );
  }

  return clouds;
}
