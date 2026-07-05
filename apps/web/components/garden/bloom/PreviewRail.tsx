'use client';

/**
 * Collapsible right-edge rail that holds the preview playground's manual controls
 * (sky phase, weather, moon, sheep, scenes, events). One icon per section; tapping
 * an icon expands that section's pills inline to the left of the rail. Only one
 * section is open at a time, and the rail collapses back on a second tap.
 *
 * Unlike a bottom sheet, the rail never covers the meadow — the meadow stays fully
 * visible to the left of the ~44px rail, so you can watch it react as you tap.
 */

import * as React from 'react';
import {
  CloudRain,
  Moon,
  Rabbit,
  Sparkles,
  Star,
  Sun,
  type LucideIcon,
} from 'lucide-react';

import { weatherCategoryLabel, type WeatherCategory } from '@bloom/core/scene';

import { PHASE_ORDER, PHASES, type PhaseKey } from '@/lib/garden/bloom/phases';

const sans = "var(--font-body), 'Segoe UI', sans-serif";

/** Weather states offered by the manual selector in the preview playground. */
const PREVIEW_WEATHER_CATS: WeatherCategory[] = [
  'clear',
  'partly_cloudy',
  'overcast',
  'fog',
  'rain',
  'heavy_rain',
  'snow',
  'thunderstorm',
];

/**
 * Fixed moon-phase presets. `phase: null` follows the real current moon; the
 * others pin a synodic fraction (0 = new, 0.5 = full).
 */
const MOON_PRESETS: { key: string; label: string; phase: number | null }[] = [
  { key: 'live', label: 'Live moon', phase: null },
  { key: 'new', label: 'New', phase: 0 },
  { key: 'crescent', label: 'Crescent', phase: 0.12 },
  { key: 'quarter', label: 'Quarter', phase: 0.25 },
  { key: 'gibbous', label: 'Gibbous', phase: 0.4 },
  { key: 'full', label: 'Full', phase: 0.5 },
];

/** Dark frosted-glass surface (mirrors BloomMeadow's `glass` token). */
const glass: React.CSSProperties = {
  background: 'rgba(22,27,36,.55)',
  backdropFilter: 'blur(11px)',
  WebkitBackdropFilter: 'blur(11px)',
  border: '1px solid rgba(247,241,227,.16)',
  color: '#f7f1e3',
};

/** Selection pill: cream surface + dark ink when active, transparent otherwise. */
const ACTIVE_BG = '#f3ecd9';
const ACTIVE_FG = '#2c3328';
const INACTIVE_FG = 'rgba(247,241,227,.85)';

function pillStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    cursor: 'pointer',
    borderRadius: 999,
    minHeight: 36,
    padding: '8px 13px',
    fontFamily: sans,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: active ? ACTIVE_FG : INACTIVE_FG,
    background: active ? ACTIVE_BG : 'transparent',
    transition: 'all .25s',
  };
}

/** Round rail-icon button; active section gets the cream surface. */
function railBtnStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    cursor: 'pointer',
    width: 40,
    height: 40,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: active ? ACTIVE_FG : INACTIVE_FG,
    background: active ? ACTIVE_BG : 'transparent',
    transition: 'all .25s',
  };
}

export type SceneButton = readonly [label: string, onTrigger: () => void, active: boolean];

type Section = 'phase' | 'weather' | 'moon' | 'sheep' | 'scenes' | 'events';

type RailEntry = {
  key: Section;
  label: string;
  icon: LucideIcon;
  /** Whether the section has a non-default value set (drives a small "modified" dot). */
  modified: boolean;
};

export type PreviewRailProps = {
  /** Show the Sheep + Scenes sections (i.e. `/preview/meadow`). */
  hasCreatures: boolean;
  /** Show the Events section (i.e. `/preview` with no entries). */
  hasEvents: boolean;
  // --- sky phase ---
  phaseKey: PhaseKey;
  onPhaseKey: (k: PhaseKey) => void;
  defaultPhaseKey: PhaseKey;
  // --- weather ---
  weatherCat: WeatherCategory;
  onWeatherCat: (c: WeatherCategory) => void;
  // --- moon ---
  moonPreset: string;
  onMoonPreset: (key: string, phase: number | null) => void;
  // --- sheep ---
  arrangement: 'scattered' | 'flock';
  onArrangement: (a: 'scattered' | 'flock') => void;
  onRerollSheep: () => void;
  sheepRainHide: boolean;
  onSheepRainHide: () => void;
  // --- scenes (ambient creatures) ---
  scenes: SceneButton[];
  // --- events ---
  eventMode: boolean;
  onToggleEvents: () => void;
};

export function PreviewRail({
  hasCreatures,
  hasEvents,
  phaseKey,
  onPhaseKey,
  defaultPhaseKey,
  weatherCat,
  onWeatherCat,
  moonPreset,
  onMoonPreset,
  arrangement,
  onArrangement,
  onRerollSheep,
  sheepRainHide,
  onSheepRainHide,
  scenes,
  eventMode,
  onToggleEvents,
}: PreviewRailProps) {
  const [open, setOpen] = React.useState<Section | null>(null);
  const toggle = (s: Section) => setOpen((cur) => (cur === s ? null : s));

  const entries: RailEntry[] = [
    { key: 'phase', label: 'Sky phase', icon: Sun, modified: phaseKey !== defaultPhaseKey },
    { key: 'weather', label: 'Weather', icon: CloudRain, modified: weatherCat !== 'clear' },
    { key: 'moon', label: 'Moon', icon: Moon, modified: moonPreset !== 'live' },
    ...(hasCreatures
      ? ([
          {
            key: 'sheep' as const,
            label: 'Sheep',
            icon: Rabbit,
            modified: arrangement !== 'scattered' || sheepRainHide !== true,
          },
          {
            key: 'scenes' as const,
            label: 'Scenes',
            icon: Sparkles,
            modified: scenes.some(([, , active]) => active),
          },
        ] satisfies RailEntry[])
      : []),
    ...(hasEvents
      ? [
          {
            key: 'events' as const,
            label: 'Events',
            icon: Star,
            modified: eventMode,
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: 'calc(var(--safe-top) + 60px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {/* Expanded section — sits to the LEFT of the rail. Rendered first so the rail
          stays pinned to the right edge; the flex row lays this out left-to-right. */}
      {open && (
        <div
          role="group"
          aria-label={`${entries.find((e) => e.key === open)?.label} controls`}
          style={{
            ...glass,
            borderRadius: 16,
            padding: 6,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            maxWidth: 'calc(100vw - 84px)',
            marginTop: 0,
          }}
        >
          {open === 'phase' &&
            PHASE_ORDER.map((k) => (
              <button
                key={k}
                onClick={() => onPhaseKey(k)}
                aria-pressed={phaseKey === k}
                style={pillStyle(phaseKey === k)}
              >
                {PHASES[k].label}
              </button>
            ))}

          {open === 'weather' &&
            PREVIEW_WEATHER_CATS.map((c) => (
              <button
                key={c}
                onClick={() => onWeatherCat(c)}
                aria-pressed={weatherCat === c}
                style={pillStyle(weatherCat === c)}
              >
                {weatherCategoryLabel(c)}
              </button>
            ))}

          {open === 'moon' &&
            MOON_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => onMoonPreset(p.key, p.phase)}
                aria-pressed={moonPreset === p.key}
                style={pillStyle(moonPreset === p.key)}
              >
                {p.label}
              </button>
            ))}

          {open === 'sheep' && (
            <>
              {(['scattered', 'flock'] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => onArrangement(a)}
                  aria-pressed={arrangement === a}
                  style={{ ...pillStyle(arrangement === a), textTransform: 'capitalize' }}
                >
                  {a}
                </button>
              ))}
              <button onClick={onRerollSheep} style={pillStyle(false)}>
                ⟳ Re-roll
              </button>
              <button
                onClick={onSheepRainHide}
                aria-pressed={sheepRainHide}
                style={pillStyle(sheepRainHide)}
              >
                Hide in rain
              </button>
            </>
          )}

          {open === 'scenes' &&
            scenes.map(([label, onTrigger, active]) => (
              <button
                key={label}
                onClick={onTrigger}
                aria-pressed={active}
                style={{ ...pillStyle(active), textTransform: 'uppercase' }}
              >
                {label}
              </button>
            ))}

          {open === 'events' && (
            <button onClick={onToggleEvents} aria-pressed={eventMode} style={pillStyle(eventMode)}>
              ✦ {eventMode ? 'Close events' : 'Browse events'}
            </button>
          )}
        </div>
      )}

      {/* The icon rail itself. */}
      <div
        style={{
          ...glass,
          borderRadius: 999,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {entries.map(({ key, label, icon: Icon, modified }) => {
          const isActive = open === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-label={label}
              aria-expanded={isActive}
              style={{ position: 'relative', ...railBtnStyle(isActive) }}
            >
              <Icon size={18} />
              {modified && !isActive && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ffe1a0',
                    boxShadow: '0 0 5px rgba(255,225,160,.8)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
