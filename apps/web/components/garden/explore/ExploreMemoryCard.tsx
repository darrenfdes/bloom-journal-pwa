'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { PlacedEntry } from '@/lib/garden/bloom/layout';
import { MOODS } from '@/lib/garden/bloom/moods';
import { agoLabel, fmtFull } from '@/lib/garden/bloom/phases';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { useBloomStore } from '@/stores/useBloomStore';

import { cardEnterCentered, creamCard, creamPill, HUD_KEYFRAMES, sans, serif } from './hudTokens';

/**
 * Lightweight memory card for the 3D meadow — same visual language as the 2D card (cream
 * panel, mood chip, italic quote) but deliberately minimal: favourite/revisit/delete live on
 * the full entry page it links to. Pure DOM, jsdom-testable.
 */
export function ExploreMemoryCard({
  entry,
  onClose,
}: {
  entry: PlacedEntry;
  onClose: () => void;
}) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const setMemoryCardOpen = useBloomStore((s) => s.setMemoryCardOpen);

  useEffect(() => {
    setMemoryCardOpen(true);
    return () => setMemoryCardOpen(false);
  }, [setMemoryCardOpen]);

  const mood = entry.mood ? MOODS[entry.mood] : undefined;
  const quote = entry.content.length > 220 ? `${entry.content.slice(0, 220)}…` : entry.content;

  return (
    <div
      style={{
        ...creamCard,
        position: 'absolute',
        left: '50%',
        bottom: 'calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 20px)',
        transform: 'translateX(-50%)',
        zIndex: 40,
        width: 'min(420px, calc(100vw - 28px))',
        padding: '20px 22px 18px',
        fontFamily: sans,
        color: '#3d4438',
        pointerEvents: 'auto',
        animation: cardEnterCentered(reduced),
      }}
    >
      <style>{HUD_KEYFRAMES}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {mood && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: mood.chip,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: mood.chip,
                flexShrink: 0,
              }}
            />
            {mood.label}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#8b8574',
          }}
        >
          {fmtFull(entry.createdAt)} · {agoLabel(entry.createdAt)}
        </span>
      </div>

      <div
        style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 21,
          marginTop: 8,
          color: '#42483c',
          lineHeight: 1.15,
        }}
      >
        {entry.title || 'An unnamed memory'}
      </div>

      <p
        style={{
          fontFamily: serif,
          fontStyle: 'italic',
          fontSize: 14.5,
          lineHeight: 1.5,
          color: '#5c6152',
          margin: '10px 0 0',
        }}
      >
        “{quote}”
      </p>

      {entry.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {entry.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11.5,
                color: '#7c8370',
                background: 'rgba(124,131,112,.12)',
                borderRadius: 999,
                padding: '3px 9px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={() => router.push(`/entry/${entry.id}`)}
          style={{
            ...creamPill,
            flex: 1,
            textAlign: 'center',
            padding: '10px 14px',
          }}
        >
          Open full memory
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            ...creamPill,
            background: 'transparent',
            border: '1px solid rgba(92,82,54,.28)',
            color: '#8b8574',
            padding: '10px 16px',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
