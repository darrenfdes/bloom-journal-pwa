'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { GOLDEN_HOUR_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function GoldenHourPreviewPage() {
  return (
    <DeprecatedWeatherPreviewScene
      scene={GOLDEN_HOUR_PREVIEW_SCENE}
      label="Golden hour preview"
      demoLightning={false}
    />
  );
}
