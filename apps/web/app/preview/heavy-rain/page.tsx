'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { HEAVY_RAIN_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function HeavyRainPreviewPage() {
  return (
    <DeprecatedWeatherPreviewScene
      scene={HEAVY_RAIN_PREVIEW_SCENE}
      label="Heavy rain preview"
      demoLightning
    />
  );
}
