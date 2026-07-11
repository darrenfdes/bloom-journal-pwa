'use client';

import { useEffect, useState } from 'react';

import type { MonthNeighbors } from '@/lib/garden/explore/world-layout';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

import {
  cardEnter,
  cardEnterCentered,
  creamCard,
  glass,
  glassPanel,
  HUD_KEYFRAMES,
  microLabel,
  sans,
  serif,
} from './hudTokens';

/**
 * DOM chrome over the 3D canvas: back-to-garden button, a controls help panel, a fading
 * control hint, and the texture-loading overlay. Pure DOM — safe to unit-test in jsdom.
 */

const SAFE_TOP = 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 14px)';
const SAFE_BOTTOM = 'calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 22px)';

const glassPill: React.CSSProperties = {
  ...glass,
  ...microLabel,
  borderRadius: 999,
  padding: '9px 16px',
  pointerEvents: 'auto',
  cursor: 'pointer',
};

const helpRow: React.CSSProperties = {
  ...microLabel,
  fontSize: 10,
  letterSpacing: 1.6,
  color: 'rgba(247,241,227,.66)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
};

const KEYBOARD_CONTROLS: [string, string][] = [
  ['WASD / arrows', 'run'],
  ['hold shift', 'stroll'],
  ['drag', 'look around'],
  ['click a flower', 'open its memory'],
];

const TOUCH_CONTROLS: [string, string][] = [
  ['stick', 'walk & run'],
  ['drag', 'look around'],
  ['tap a flower', 'open its memory'],
];

export function ExploreHud({
  onBack,
  hint,
  progress,
  coarsePointer = false,
  month = null,
}: {
  onBack: () => void;
  /** Control hint shown at the bottom; null hides it. */
  hint: string | null;
  /** Texture build progress 0..1; null or ≥1 hides the overlay. */
  progress: number | null;
  /** Touch device — show stick controls in the help panel instead of keyboard ones. */
  coarsePointer?: boolean;
  /** Month the fox is walking through plus its neighbours; null hides the wayfinding pill. */
  month?: MonthNeighbors | null;
}) {
  const reduced = usePrefersReducedMotion();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHelpOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  const controls = coarsePointer ? TOUCH_CONTROLS : KEYBOARD_CONTROLS;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
        fontFamily: sans,
      }}
    >
      <style>{HUD_KEYFRAMES}</style>

      <button
        type="button"
        onClick={onBack}
        aria-label="Back to garden"
        style={{
          ...glassPill,
          position: 'absolute',
          top: SAFE_TOP,
          left: 16,
          animation: cardEnter(reduced),
        }}
      >
        ← Garden
      </button>

      {month && (
        <div
          key={month.current}
          style={{
            ...glass,
            position: 'absolute',
            top: SAFE_TOP,
            left: '50%',
            transform: 'translateX(-50%)',
            borderRadius: 999,
            padding: '8px 18px',
            pointerEvents: 'none',
            fontFamily: serif,
            fontStyle: 'italic',
            fontSize: 14,
            color: 'rgba(247,241,227,.85)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            animation: cardEnterCentered(reduced),
          }}
        >
          {month.prev && <span style={{ fontSize: 11, color: 'rgba(247,241,227,.45)' }}>‹ {month.prev}</span>}
          <span>{month.current}</span>
          {month.next && <span style={{ fontSize: 11, color: 'rgba(247,241,227,.45)' }}>{month.next} ›</span>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-label="Controls help"
        aria-expanded={helpOpen}
        style={{
          ...glassPill,
          position: 'absolute',
          top: SAFE_TOP,
          right: 16,
          width: 38,
          height: 38,
          padding: 0,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: cardEnter(reduced),
        }}
      >
        ?
      </button>

      {helpOpen && (
        <div
          style={{
            ...glassPanel,
            position: 'absolute',
            top: `calc(${SAFE_TOP} + 48px)`,
            right: 16,
            width: 'min(300px, calc(100vw - 32px))',
            padding: '18px 20px 14px',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            animation: cardEnter(reduced),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.1 }}>
              Wandering the meadow
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close help"
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'rgba(247,241,227,.6)',
                fontSize: 14,
                cursor: 'pointer',
                padding: 2,
              }}
            >
              ✕
            </button>
          </div>
          {controls.map(([action, effect]) => (
            <div key={action} style={helpRow}>
              <span>{action}</span>
              <span style={{ color: '#ffe1a0', textAlign: 'right' }}>{effect}</span>
            </div>
          ))}
          <div
            style={{
              ...microLabel,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'rgba(247,241,227,.45)',
              borderTop: '1px solid rgba(247,241,227,.14)',
              paddingTop: 10,
              marginTop: 3,
            }}
          >
            Fox model — PixelMannen · rig & animations @tomkranis (CC BY 4.0) · Fish — Quaternius
            (CC0)
          </div>
        </div>
      )}

      {hint && (
        <div
          style={{
            ...glassPill,
            ...microLabel,
            fontSize: 10.5,
            letterSpacing: 1.6,
            color: 'rgba(247,241,227,.78)',
            cursor: 'default',
            pointerEvents: 'none',
            position: 'absolute',
            bottom: SAFE_BOTTOM,
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </div>
      )}

      {progress !== null && progress < 1 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(12,16,24,.42)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              ...creamCard,
              width: 'min(320px, calc(100vw - 48px))',
              padding: '22px 24px',
              animation: cardEnter(reduced),
            }}
          >
            <div
              style={{
                fontFamily: serif,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 22,
                color: '#42483c',
              }}
            >
              Growing your meadow…
            </div>
            <div
              style={{
                marginTop: 14,
                height: 6,
                borderRadius: 999,
                background: 'rgba(92,113,80,.18)',
                overflow: 'hidden',
              }}
            >
              <div
                data-progress-fill
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: '#5c7150',
                  transition: 'width .3s ease',
                }}
              />
            </div>
            <div style={{ ...microLabel, fontSize: 10, color: '#8b8574', marginTop: 9 }}>
              {Math.round(progress * 100)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
