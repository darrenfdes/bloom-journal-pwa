'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { useGeolocation } from '@/lib/scene/useGeolocation';
import { useWeather } from '@/lib/scene/useWeather';
import { useBloomStore } from '@/stores/useBloomStore';

// three.js is heavy — load it only when the user actually enters the 3D meadow, exactly like
// GardenContent lazy-loads BloomMeadow. WebGL is client-only, hence ssr: false.
const ExploreScene = dynamic(
  () => import('@/components/garden/explore/ExploreScene').then((m) => m.ExploreScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Growing your meadow…</p>
      </div>
    ),
  },
);

export function ExploreContent() {
  const ready = useBloomStore((s) => s.ready);
  const entries = useBloomStore((s) => s.entries);

  // Same live-weather source as /garden: coords (geolocation → fallback) then Open-Meteo.
  const geo = useGeolocation();
  const weather = useWeather(geo.coords);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Growing your meadow…</p>
      </div>
    );
  }

  if (!entries.some((e) => !e.isDeleted)) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-ink-muted">
          Your meadow is still bare — plant a memory first, then come wander.
        </p>
        <Link href="/garden" className="underline underline-offset-4">
          Back to the garden
        </Link>
      </div>
    );
  }

  return <ExploreScene entries={entries} weather={weather} latitude={geo.coords.lat} />;
}
