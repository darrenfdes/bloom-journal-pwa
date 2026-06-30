import type { WeatherCategory } from './types';

export function wmoToCategory(code: number): WeatherCategory {
  if (code >= 0 && code <= 1) return 'clear';
  if (code === 2) return 'partly_cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 64) return 'rain';
  if (code >= 65 && code <= 67) return 'heavy_rain';
  if (code >= 71 && code <= 77) return 'snow'; // snow fall + snow grains
  if (code >= 80 && code <= 82) return 'rain'; // rain showers
  if (code === 85 || code === 86) return 'snow'; // snow showers
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'clear';
}

const WEATHER_LABELS: Record<WeatherCategory, string> = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavy_rain: 'Heavy rain',
  snow: 'Snow',
  thunderstorm: 'Thunderstorm',
};

export function weatherCategoryLabel(category: WeatherCategory): string {
  return WEATHER_LABELS[category];
}

export function wmoCodeLabel(code: number): string {
  return weatherCategoryLabel(wmoToCategory(code));
}
