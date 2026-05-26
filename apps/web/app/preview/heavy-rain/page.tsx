'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import type { SceneState } from '@bloom/core/scene';

const HEAVY_RAIN_SCENE: SceneState = {
  status: 'ready',
  timePhase: 'day',
  season: 'summer',
  locationName: null,
  weather: {
    category: 'heavy_rain',
    windSpeed: 18,
    cloudCover: 92,
    visibility: 6000,
    precipitation: 8.5,
    temperature: 14,
    coords: { lat: 51.5, lon: -0.1 },
    wmoCode: 65,
  },
};

export default function HeavyRainPreviewPage() {
  return (
    <WeatherPreviewScene
      scene={HEAVY_RAIN_SCENE}
      label="Heavy rain preview"
      demoLightning
    />
  );
}
