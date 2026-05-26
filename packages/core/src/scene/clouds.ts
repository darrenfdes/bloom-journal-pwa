import { SeededRNG } from '../flowers/seeded-rng';
import { isPrecipitatingCategory, isStormyCategory } from './weather-effects';
import type { WeatherCategory } from './types';

const CLOUD_SVG_WIDTH = 160;

export type CloudVariant = 'fair' | 'storm';

export type WeatherCloudSpec = {
  startX: number;
  endX: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  variant: CloudVariant;
  /** Slow ceiling bank — minimal horizontal drift */
  static?: boolean;
};

const CLOUD_LAYOUT_SEED = 0xc10d5;

const BASE_CLOUDS: Omit<WeatherCloudSpec, 'startX' | 'endX' | 'delay' | 'variant'>[] = [
  { y: 40, scale: 1.1, opacity: 0.72, duration: 95_000 },
  { y: 78, scale: 0.85, opacity: 0.68, duration: 130_000 },
  { y: 115, scale: 0.95, opacity: 0.7, duration: 165_000 },
  { y: 148, scale: 0.7, opacity: 0.62, duration: 110_000 },
];

function layoutCloud(
  rng: SeededRNG,
  width: number,
  endX: number,
  base: Omit<WeatherCloudSpec, 'startX' | 'endX' | 'delay' | 'variant'>,
  variant: CloudVariant,
  yRange: [number, number] = [28, 158]
): WeatherCloudSpec {
  const minX = -CLOUD_SVG_WIDTH - 60;
  const maxX = width * 0.82;
  const startX = Math.round(rng.range(minX, maxX));

  return {
    ...base,
    y: Math.round(rng.range(yRange[0], yRange[1])),
    startX,
    endX,
    delay: 0,
    variant,
  };
}

function stormCeilingClouds(width: number): WeatherCloudSpec[] {
  const endX = width + CLOUD_SVG_WIDTH;
  const specs: Omit<WeatherCloudSpec, 'startX' | 'endX' | 'delay'>[] = [
    { y: 8, scale: 1.85, opacity: 0.88, duration: 380_000, variant: 'storm', static: true },
    { y: 28, scale: 1.65, opacity: 0.82, duration: 420_000, variant: 'storm', static: true },
    { y: 18, scale: 1.75, opacity: 0.85, duration: 360_000, variant: 'storm', static: true },
    { y: 42, scale: 1.55, opacity: 0.78, duration: 400_000, variant: 'storm', static: true },
  ];

  return specs.map((base, i) => {
    const cloudRng = new SeededRNG(CLOUD_LAYOUT_SEED + 9001 + i * 777);
    const minX = -CLOUD_SVG_WIDTH * base.scale;
    const maxX = width * 0.7;
    return {
      ...base,
      startX: Math.round(cloudRng.range(minX, maxX)),
      endX,
      delay: 0,
    };
  });
}

/** Drifting clouds — density from cloud cover; storm variant when rainy. */
export function getWeatherClouds(
  cloudCover: number,
  width: number,
  category?: WeatherCategory
): WeatherCloudSpec[] {
  const stormy = isStormyCategory(category);
  const precipitating = category != null && isPrecipitatingCategory(category);

  const extraCount = stormy
    ? 5 + Math.min(1, Math.round((cloudCover - 60) / 30))
    : cloudCover > 55
      ? Math.min(2, Math.round((cloudCover - 55) / 25))
      : precipitating && category === 'drizzle'
        ? 2
        : 0;

  const coverBoost = stormy
    ? 0.92 + (cloudCover / 100) * 0.12
    : 0.85 + (cloudCover / 100) * 0.2;
  const baseOpacity = (stormy ? 0.72 : precipitating ? 0.48 : 0.55) * coverBoost;
  const variant: CloudVariant = stormy ? 'storm' : 'fair';
  const durationMul = stormy ? 1.35 : 1;

  const endX = width + CLOUD_SVG_WIDTH;
  const yRange: [number, number] = stormy ? [20, 120] : [28, 158];

  const clouds: WeatherCloudSpec[] = BASE_CLOUDS.map((base, i) => {
    const cloudRng = new SeededRNG(CLOUD_LAYOUT_SEED + (i + 1) * 9973);
    return layoutCloud(
      cloudRng,
      width,
      endX,
      {
        ...base,
        opacity: base.opacity * coverBoost,
        duration: Math.round(base.duration * durationMul),
      },
      variant,
      yRange
    );
  });

  const rng = new SeededRNG(CLOUD_LAYOUT_SEED + 42);

  for (let i = 0; i < extraCount; i++) {
    clouds.push(
      layoutCloud(
        rng,
        width,
        endX,
        {
          y: stormy ? 55 : 90,
          scale: rng.range(stormy ? 1.0 : 0.75, stormy ? 1.35 : 1.05),
          opacity: baseOpacity * rng.range(0.9, 1.08),
          duration: Math.round(rng.range(stormy ? 140_000 : 100_000, stormy ? 220_000 : 175_000)),
        },
        variant,
        yRange
      )
    );
  }

  if (stormy) {
    return [...stormCeilingClouds(width), ...clouds];
  }

  return clouds;
}
