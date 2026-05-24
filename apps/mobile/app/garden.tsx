import React from 'react';

import { GardenScene } from '@/components/garden/GardenScene';
import { SceneProvider } from '@/lib/scene/SceneContext';
import { useBloomStore } from '@/stores/useBloomStore';

export default function GardenScreen() {
  const meta = useBloomStore((s) => s.gardenMeta);
  const entries = useBloomStore((s) => s.entries);

  if (!meta) return null;

  return (
    <SceneProvider>
      <GardenScene meta={meta} entries={entries} />
    </SceneProvider>
  );
}
