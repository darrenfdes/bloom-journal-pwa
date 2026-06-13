'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { DAWN_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function DawnPreviewPage() {
  return (
    <DeprecatedWeatherPreviewScene
      scene={DAWN_PREVIEW_SCENE}
      label="Dawn preview"
      demoLightning={false}
    />
  );
}
