'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { DAY_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function DayPreviewPage() {
  return (
    <WeatherPreviewScene
      scene={DAY_PREVIEW_SCENE}
      label="Day preview"
      demoLightning={false}
    />
  );
}
