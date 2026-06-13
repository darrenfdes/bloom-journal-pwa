'use client';

import { DeprecatedWeatherPreviewScene } from '@/components/scene/DeprecatedWeatherPreviewScene';
import { FULL_MOON_PREVIEW_SCENE } from '@/lib/scene/preview-scenes.deprecated';

/** @deprecated Old fixed-scenery preview — superseded by the live `/preview` meadow. */
export default function FullMoonPreviewPage() {
  return <DeprecatedWeatherPreviewScene scene={FULL_MOON_PREVIEW_SCENE} label="Full moon preview" />;
}
