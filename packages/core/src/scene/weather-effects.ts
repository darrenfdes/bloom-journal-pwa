import type { WeatherCategory } from './types';

export type RainDepth = 'near' | 'far';

export function isPrecipitatingCategory(category?: WeatherCategory): boolean {
  return (
    category === 'drizzle' ||
    category === 'rain' ||
    category === 'heavy_rain' ||
    category === 'thunderstorm'
  );
}

export function isStormyCategory(category?: WeatherCategory): boolean {
  return category === 'rain' || category === 'heavy_rain' || category === 'thunderstorm';
}

export function shouldShowLightning(category: WeatherCategory): boolean {
  return category === 'thunderstorm' || category === 'heavy_rain';
}

/** Random delay range (ms) between lightning flashes. */
export function getLightningIntervalMs(category: WeatherCategory): { min: number; max: number } {
  switch (category) {
    case 'thunderstorm':
      return { min: 12000, max: 30000 };
    case 'heavy_rain':
      return { min: 36000, max: 60000 };
    default:
      return { min: 0, max: 0 };
  }
}

/** Wind-driven rain streak slant in degrees (positive = rightward lean). */
export function getRainWindSlantDeg(windSpeed: number): number {
  const base = 12;
  const extra = Math.min(8, windSpeed * 0.35);
  return base + extra;
}

export function getRainLayerOpacity(category: WeatherCategory): { sheet: number; drop: number } {
  switch (category) {
    case 'drizzle':
      return { sheet: 0.08, drop: 0.5 };
    case 'rain':
      return { sheet: 0.15, drop: 0.7 };
    case 'heavy_rain':
      return { sheet: 0.25, drop: 0.85 };
    case 'thunderstorm':
      return { sheet: 0.3, drop: 0.9 };
    default:
      return { sheet: 0, drop: 0 };
  }
}

/** Full-screen fall duration (seconds) — far layer is slower (CodePen back-row). */
export function getRainDropDurationSec(
  category: WeatherCategory,
  depth: RainDepth
): { min: number; max: number } {
  const near = depth === 'near';
  switch (category) {
    case 'drizzle':
      return near ? { min: 1.4, max: 2.0 } : { min: 2.0, max: 2.8 };
    case 'rain':
      return near ? { min: 1.0, max: 1.5 } : { min: 1.5, max: 2.2 };
    case 'heavy_rain':
      return near ? { min: 0.75, max: 1.1 } : { min: 1.1, max: 1.6 };
    case 'thunderstorm':
      return near ? { min: 0.65, max: 1.0 } : { min: 1.0, max: 1.5 };
    default:
      return { min: 1.2, max: 1.8 };
  }
}

/** Background rain haze sheet loop duration (seconds). */
export function getRainSheetDriftSec(category: WeatherCategory): number {
  switch (category) {
    case 'drizzle':
      return 4.5;
    case 'rain':
      return 3.5;
    case 'heavy_rain':
      return 3;
    case 'thunderstorm':
      return 2.5;
    default:
      return 3;
  }
}
