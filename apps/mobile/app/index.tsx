import { Redirect } from 'expo-router';

import { useBloomStore } from '@/stores/useBloomStore';

export default function IndexScreen() {
  const ready = useBloomStore((s) => s.ready);
  const meta = useBloomStore((s) => s.gardenMeta);

  if (!ready) return null;

  if (!meta?.hasPlantedFirst) {
    return <Redirect href="/write" />;
  }

  return <Redirect href="/garden" />;
}
