'use client';

/**
 * Small glass pill naming the live weather driving the meadow — "Light rain · 14°" —
 * so the scene reads as *your* sky, not a random one. Live garden only.
 */
import React from 'react';

import type { WeatherState } from '@bloom/core/scene';

import { glass, sans } from '@/components/garden/bloom/chrome';
import { WEATHER_LABEL } from '@/lib/garden/bloom/adapt';

export function WeatherChip({ weather }: { weather: WeatherState | null }) {
  if (!weather) return null;
  const label = WEATHER_LABEL[weather.category];
  const temp = Math.round(weather.temperature);
  return (
    <div
      aria-label={`Current weather: ${label.toLowerCase()}, ${temp} degrees`}
      style={{
        ...glass,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '5px 12px',
        fontFamily: sans,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {label} · {temp}°
    </div>
  );
}
