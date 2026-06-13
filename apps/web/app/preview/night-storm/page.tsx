'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { NIGHT_STORM_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function NightStormPreviewPage() {
  return <DeprecatedWeatherPreviewScene scene={NIGHT_STORM_PREVIEW_SCENE} label="Night storm" demoLightning />;
}
