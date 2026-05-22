import React from 'react';

import { GardenScene } from '@/components/garden/GardenScene';
import { useBloomStore } from '@/stores/useBloomStore';

export default function GardenScreen() {
  const meta = useBloomStore((s) => s.gardenMeta);
  const entries = useBloomStore((s) => s.entries);

  if (!meta) return null;

  return <GardenScene meta={meta} entries={entries} />;
}
