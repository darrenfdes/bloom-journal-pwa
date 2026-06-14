'use client';

/**
 * Bottom control bar for browsing world events in /preview. Group + rarity filter
 * chips and a prev/next stepper over the filtered list. Self-contained styling
 * (glass + pill) so it doesn't depend on BloomMeadow internals.
 */

import React from 'react';

import type { Rarity, WorldEvent } from '@bloom/core/events';

import {
  EVENT_GROUP_NAMES,
  RARITIES,
  eventTypeLabel,
  type EventGroup,
} from '@/lib/garden/bloom/event-catalog';
import { MONTH_ABBR } from '@/lib/garden/bloom/phases';

const sans = "var(--font-body), 'Segoe UI', sans-serif";
const serif = "var(--font-display), Georgia, 'Times New Roman', serif";

const glass: React.CSSProperties = {
  background: 'rgba(22,27,36,.55)',
  backdropFilter: 'blur(11px)',
  WebkitBackdropFilter: 'blur(11px)',
  border: '1px solid rgba(247,241,227,.16)',
  color: '#f7f1e3',
};

const RARITY_COLOR: Record<Rarity, { bg: string; fg: string }> = {
  common: { bg: 'rgba(180,184,170,.28)', fg: '#e7e4d6' },
  uncommon: { bg: 'rgba(118,178,110,.32)', fg: '#dcf2d2' },
  rare: { bg: 'rgba(108,150,224,.34)', fg: '#d7e4ff' },
  epic: { bg: 'rgba(196,150,70,.36)', fg: '#ffeec4' },
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  border: 'none',
  cursor: 'pointer',
  borderRadius: 999,
  padding: '4px 10px',
  fontFamily: sans,
  fontSize: 9.5,
  fontWeight: 800,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  transition: 'all .25s',
  color: active ? '#2c3328' : 'rgba(247,241,227,.78)',
  background: active ? '#f3ecd9' : 'transparent',
});

/** "2026-08-12" → "12 Aug 2026" without timezone drift. */
function fmtIso(iso: string): string {
  const [y, m, d] = iso.split('-');
  const mi = Number(m) - 1;
  return `${Number(d)} ${MONTH_ABBR[mi] ?? m} ${y}`;
}

export function EventStepper({
  events,
  index,
  onIndex,
  group,
  onGroup,
  rarity,
  onRarity,
  onClose,
}: {
  events: WorldEvent[];
  index: number;
  onIndex: (i: number) => void;
  group: EventGroup | null;
  onGroup: (g: EventGroup | null) => void;
  rarity: Rarity | null;
  onRarity: (r: Rarity | null) => void;
  onClose: () => void;
}) {
  const total = events.length;
  const event = total > 0 ? events[Math.min(index, total - 1)] : undefined;
  const step = (delta: number) => {
    if (total > 0) onIndex((index + delta + total) % total);
  };

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    borderRadius: '50%',
    width: 36,
    height: 36,
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(247,241,227,.1)',
    color: '#f7f1e3',
    opacity: disabled ? 0.35 : 1,
    transition: 'background .2s',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 52,
        width: 'min(560px, calc(100vw - 24px))',
      }}
    >
      <div style={{ ...glass, borderRadius: 20, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(247,241,227,.5)' }}>
            Events
          </span>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
            <button style={chipStyle(group === null)} onClick={() => onGroup(null)}>All</button>
            {EVENT_GROUP_NAMES.map((g) => (
              <button key={g} style={chipStyle(group === g)} onClick={() => onGroup(g)}>{g}</button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Close events"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(247,241,227,.7)', fontSize: 15, lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <button style={chipStyle(rarity === null)} onClick={() => onRarity(null)}>All rarities</button>
          {RARITIES.map((r) => (
            <button key={r} style={chipStyle(rarity === r)} onClick={() => onRarity(r)}>{r}</button>
          ))}
        </div>

        {/* stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={navBtn(total === 0)} disabled={total === 0} onClick={() => step(-1)} aria-label="Previous event">‹</button>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            {event ? (
              <>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: '#faf6e9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {event.title}
                </div>
                {event.subtitle && (
                  <div style={{ fontFamily: sans, fontSize: 10.5, color: 'rgba(247,241,227,.7)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.subtitle}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7, justifyContent: 'center', alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(247,241,227,.82)' }}>{fmtIso(event.date)}</span>
                  <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(247,241,227,.6)' }}>{eventTypeLabel(event.type)}</span>
                  <span
                    style={{
                      fontFamily: sans, fontSize: 8.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
                      borderRadius: 999, padding: '2px 7px',
                      background: RARITY_COLOR[event.rarity].bg, color: RARITY_COLOR[event.rarity].fg,
                    }}
                  >
                    {event.rarity}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: sans, fontSize: 12, color: 'rgba(247,241,227,.6)', padding: '10px 0' }}>
                No events match these filters
              </div>
            )}
          </div>

          <button style={navBtn(total === 0)} disabled={total === 0} onClick={() => step(1)} aria-label="Next event">›</button>
        </div>

        {total > 0 && (
          <div style={{ textAlign: 'center', fontFamily: sans, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(247,241,227,.45)' }}>
            {Math.min(index, total - 1) + 1} / {total}
          </div>
        )}
      </div>
    </div>
  );
}
