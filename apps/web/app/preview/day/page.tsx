'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { DAY_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function DayPreviewPage() {
  return (
    <DeprecatedWeatherPreviewScene
      scene={DAY_PREVIEW_SCENE}
      label="Day preview"
      demoLightning={false}
    />
  );
}
