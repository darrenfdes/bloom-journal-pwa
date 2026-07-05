import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WeatherState } from '@bloom/core/scene';

import {
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_TTL_MS,
  readCachedCoords,
  readCachedWeather,
  writeCachedWeather,
} from './weather-cache';

const rainy: WeatherState = {
  category: 'rain',
  windSpeed: 12,
  cloudCover: 90,
  visibility: 6000,
  precipitation: 2.4,
  temperature: 16,
  coords: { lat: 51.5, lon: -0.12 },
  wmoCode: 61,
};

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('weather cache', () => {
  it('round-trips the last written weather', () => {
    writeCachedWeather(rainy, 1_000);

    expect(readCachedWeather(1_000)).toEqual(rainy);
  });

  it('returns null once the entry is older than the TTL', () => {
    writeCachedWeather(rainy, 1_000);

    expect(readCachedWeather(1_000 + WEATHER_CACHE_TTL_MS - 1)).toEqual(rainy);
    expect(readCachedWeather(1_000 + WEATHER_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('still serves coords from an entry too old for weather', () => {
    writeCachedWeather(rainy, 1_000);

    expect(readCachedWeather(1_000 + WEATHER_CACHE_TTL_MS * 10)).toBeNull();
    expect(readCachedCoords()).toEqual(rainy.coords);
  });

  it('returns null weather and coords when nothing is cached', () => {
    expect(readCachedWeather()).toBeNull();
    expect(readCachedCoords()).toBeNull();
  });

  it('treats corrupt JSON as an empty cache', () => {
    window.localStorage.setItem(WEATHER_CACHE_KEY, '{not json');

    expect(readCachedWeather()).toBeNull();
    expect(readCachedCoords()).toBeNull();
  });

  it('swallows storage write errors (private mode / quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => writeCachedWeather(rainy)).not.toThrow();
  });
});
