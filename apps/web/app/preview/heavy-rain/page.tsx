'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { HEAVY_RAIN_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function HeavyRainPreviewPage() {
  return (
    <WeatherPreviewScene
      scene={HEAVY_RAIN_PREVIEW_SCENE}
      label="Heavy rain preview"
      demoLightning
    />
  );
}
