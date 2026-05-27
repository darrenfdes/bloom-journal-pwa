'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { GOLDEN_HOUR_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function GoldenHourPreviewPage() {
  return (
    <WeatherPreviewScene
      scene={GOLDEN_HOUR_PREVIEW_SCENE}
      label="Golden hour preview"
      demoLightning={false}
    />
  );
}
