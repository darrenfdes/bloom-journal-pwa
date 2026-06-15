'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { sceneEffectsForDay, useDayEvents } from '@bloom/core/events';
import type { EventsUserContext } from '@bloom/core/events';

import { gardenIsAccessible } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { isShootingStarSpecialDay } from '@/lib/garden/bloom/shooting-star';
import { useGeolocation } from '@/lib/scene/useGeolocation';
import { useWeather } from '@/lib/scene/useWeather';
import { useBloomStore } from '@/stores/useBloomStore';

const BloomMeadow = dynamic(
  () => import('@/components/garden/bloom/BloomMeadow').then((m) => m.BloomMeadow),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading garden…</p>
      </div>
    ),
  }
);

export function GardenContent() {
  const router = useRouter();
  const ready = useBloomStore((s) => s.ready);
  const meta = useBloomStore((s) => s.gardenMeta);
  const entries = useBloomStore((s) => s.entries);

  // Realtime weather for the live garden: resolve coords (geolocation → fallback) then poll
  // Open-Meteo. The meadow maps the category to its sky/weather effects.
  const geo = useGeolocation();
  const weather = useWeather(geo.coords);

  // Whether today is a "special" day that should send a shooting star across the garden.
  const [specialStar, setSpecialStar] = useState(false);
  const [birthday, setBirthday] = useState('0001-01-01');
  useEffect(() => {
    let cancelled = false;
    void getOrCreateSettings()
      .then((s) => {
        if (cancelled) return;
        setSpecialStar(
          isShootingStarSpecialDay(new Date(), {
            birthday: s.birthday,
            useBirthday: s.useBirthdayForStars,
          })
        );
        if (s.birthday) setBirthday(s.birthday);
      })
      .catch(() => {
        /* settings unavailable → treat today as an ordinary day */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const eventsUser = useMemo(
    (): EventsUserContext => ({
      birthday,
      appInstallDate: meta?.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    }),
    [birthday, meta?.createdAt],
  );

  const dayEvents = useDayEvents(new Date(), eventsUser, {
    coords: { latitude: geo.coords.lat, longitude: geo.coords.lon },
    timeZoneOffsetMinutes: -new Date().getTimezoneOffset(),
  });

  const liveSceneEffects = useMemo(
    () => sceneEffectsForDay(dayEvents).map((r) => r.effect),
    [dayEvents],
  );

  const canViewGarden = gardenIsAccessible(meta, entries.length);

  useEffect(() => {
    if (!ready || !meta) return;
    if (!canViewGarden) {
      router.replace('/write');
    }
  }, [ready, meta, canViewGarden, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading garden…</p>
      </div>
    );
  }

  if (!canViewGarden) {
    return null;
  }

  return (
    <BloomMeadow
      entries={entries}
      live
      liveWeather={weather}
      latitude={geo.coords.lat}
      specialStar={specialStar}
      liveSceneEffects={liveSceneEffects}
    />
  );
}
