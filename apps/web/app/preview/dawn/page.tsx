'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { DAWN_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function DawnPreviewPage() {
  return (
    <WeatherPreviewScene
      scene={DAWN_PREVIEW_SCENE}
      label="Dawn preview"
      demoLightning={false}
    />
  );
}
