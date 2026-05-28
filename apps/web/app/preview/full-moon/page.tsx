'use client';

import { WeatherPreviewScene } from '@/components/scene/WeatherPreviewScene';
import { FULL_MOON_PREVIEW_SCENE } from '@/lib/scene/preview-scenes';

export default function FullMoonPreviewPage() {
  return <WeatherPreviewScene scene={FULL_MOON_PREVIEW_SCENE} label="Full moon preview" />;
}
