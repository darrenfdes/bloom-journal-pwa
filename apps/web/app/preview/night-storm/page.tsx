'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { NIGHT_STORM_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function NightStormPreviewPage() {
  return <WeatherPreviewScene scene={NIGHT_STORM_PREVIEW_SCENE} label="Night storm" demoLightning />;
}
