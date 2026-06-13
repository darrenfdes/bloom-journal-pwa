'use client';

import React from 'react';

import type { TimePhase } from '@bloom/core/scene';
import type { SceneOverride, WeatherOverride } from '@/lib/scene/scene-override';
import { cn } from '@/lib/utils';

const PHASE_PILLS: { label: string; phase: TimePhase }[] = [
  { label: 'Dawn', phase: 'dawn' },
  { label: 'Day', phase: 'day' },
  { label: 'Golden', phase: 'golden_hour' },
  { label: 'Dusk', phase: 'dusk' },
  { label: 'Night', phase: 'night' },
];

const WEATHER_CYCLE: WeatherOverride[] = ['auto', 'clear', 'partly_cloudy', 'overcast', 'rain'];
const WEATHER_LABEL: Record<WeatherOverride, string> = {
  auto: 'Auto',
  clear: 'Clear',
  partly_cloudy: 'Cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  heavy_rain: 'Storm',
  snow: 'Snow',
  thunderstorm: 'Thunder',
};

/** Collapse phases without a pill onto the nearest visible one for highlighting. */
function highlightPhase(phase: TimePhase): TimePhase {
  if (phase === 'deep_night') return 'night';
  if (phase === 'pre_dawn') return 'dawn';
  return phase;
}

type Props = {
  override: SceneOverride;
  onChange: (next: SceneOverride) => void;
  liveTimePhase: TimePhase;
};

export function PhaseWeatherToolbar({ override, onChange, liveTimePhase }: Props) {
  const activePhase =
    override.phase === 'auto' ? highlightPhase(liveTimePhase) : override.phase;
  const weatherIndex = Math.max(0, WEATHER_CYCLE.indexOf(override.weather));
  const nextWeather = WEATHER_CYCLE[(weatherIndex + 1) % WEATHER_CYCLE.length]!;

  return (
    <div
      data-scene-ui
      className="absolute right-4 top-[calc(0.9rem+var(--safe-top))] z-20 flex items-center gap-2"
    >
      <div className="flex items-center gap-0.5 rounded-full bg-black/25 p-1 backdrop-blur-md">
        {PHASE_PILLS.map(({ label, phase }) => {
          const active = activePhase === phase;
          return (
            <button
              key={phase}
              type="button"
              onClick={() =>
                onChange({ ...override, phase: override.phase === phase ? 'auto' : phase })
              }
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors',
                active ? 'bg-white/90 text-ink shadow-sm' : 'text-white/70 hover:text-white'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...override, weather: nextWeather })}
        title="Cycle weather"
        className="rounded-full bg-black/25 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white/85 backdrop-blur-md transition-colors hover:text-white"
      >
        <span aria-hidden className="mr-1">
          {override.weather === 'auto' ? '✦' : '◌'}
        </span>
        {WEATHER_LABEL[override.weather]}
      </button>
    </div>
  );
}
