'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  formatCoordsFallback,
  getSeasonPlaceholder,
  isNightPhase,
  weatherCategoryLabel,
  type SceneState,
} from '@bloom/core/scene';
import { Textarea } from '@/components/ui/textarea';
import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { plantEntry } from '@/lib/db/repositories/entries';
import { useWindowSize } from '@/lib/hooks/useWindowSize';
import { buildPlantSceneSnapshot } from '@/lib/scene/plantSnapshot';
import { cn } from '@/lib/utils';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

import styles from './SceneFx.module.css';

type Props = {
  scene: SceneState;
  open: boolean;
  onClose: () => void;
};

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isDarkJournalScene(scene: SceneState): boolean {
  if (isNightPhase(scene.timePhase) || scene.timePhase === 'dusk') return true;
  const cat = scene.weather?.category;
  return cat === 'rain' || cat === 'heavy_rain' || cat === 'thunderstorm' || cat === 'overcast';
}

export function JournalPanel({ scene, open, onClose }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [confirmBloom, setConfirmBloom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const entries = useBloomStore((s) => s.entries);
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const { width, height } = useWindowSize();

  const dark = isDarkJournalScene(scene);
  const placeholder = getSeasonPlaceholder(scene.season);
  const badgeLocation =
    scene.locationName ??
    (scene.weather
      ? formatCoordsFallback(scene.weather.coords.lat, scene.weather.coords.lon)
      : 'Your meadow');
  const weatherLabel = scene.weather
    ? weatherCategoryLabel(scene.weather.category)
    : '—';
  const temp =
    scene.weather != null ? `${Math.round(scene.weather.temperature)}°C` : '';

  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text, open]);

  useEffect(() => {
    if (!open) {
      setShowPast(false);
      return;
    }
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const handleSave = useCallback(async () => {
    const content = text.trim();
    if (!content || saving) return;

    const snapshot = buildPlantSceneSnapshot(scene);
    setSaving(true);
    try {
      await plantEntry(
        {
          title: '',
          content,
          mood: null,
          additionalMoods: [],
          tags: [],
          createdAtOverride: null,
          revisitOf: null,
        },
        { width: width || 390, height: height || 800 },
        snapshot
      );
      await refreshEntries();
      setText('');
      setConfirmBloom(true);
      setTimeout(() => {
        setConfirmBloom(false);
        onClose();
      }, 600);
    } finally {
      setSaving(false);
    }
  }, [text, saving, scene, width, height, refreshEntries, onClose]);

  const recentEntries = entries.slice(0, 20);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="journal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/45"
            aria-label="Close journal"
            onClick={onClose}
          />
          <motion.div
            key="journal-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Quick journal entry"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'fixed left-1/2 z-40 -translate-x-1/2 rounded-[20px] border p-5 shadow-xl backdrop-blur-md',
              dark
                ? 'border-white/20 bg-black/50 text-white'
                : 'border-white/30 bg-white/80 text-ink'
            )}
            style={{
              bottom: 'calc(5.5rem + var(--safe-bottom))',
              width: 'min(560px, calc(100% - 32px))',
            }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium shadow-sm',
                  dark
                    ? 'border-white/25 bg-white/15 text-white'
                    : 'border-white/40 bg-white/60 text-ink'
                )}
              >
                {badgeLocation} · {weatherLabel}
                {temp ? ` · ${temp}` : ''}
              </span>
              {confirmBloom ? (
                <span className={`text-lg ${styles.bloomConfirm}`} aria-live="polite">
                  ✿
                </span>
              ) : null}
            </div>

            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className={cn(
                'min-h-[72px] resize-none',
                dark
                  ? 'border-white/25 bg-white/10 text-white placeholder:text-white/55'
                  : 'border-parchment/80 bg-white/90 text-ink placeholder:text-ink-muted'
              )}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={cn(
                    'text-xs font-medium underline-offset-2 hover:underline',
                    dark ? 'text-white/80' : 'text-ink-soft'
                  )}
                  onClick={() => setShowPast((v) => !v)}
                >
                  {showPast ? 'Hide past entries' : 'Past entries'}
                </button>
                <Link
                  href="/write"
                  className={cn(
                    'text-xs font-medium underline-offset-2 hover:underline',
                    dark ? 'text-white/80' : 'text-ink-soft'
                  )}
                  onClick={onClose}
                >
                  Mood &amp; tags →
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium',
                    dark ? 'text-white/75 hover:text-white' : 'text-ink-muted hover:text-ink'
                  )}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!text.trim() || saving}
                  onClick={() => void handleSave()}
                  className="rounded-full bg-sage px-5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {showPast ? (
              <ul
                className={cn(
                  'mt-4 max-h-48 space-y-2 overflow-y-auto border-t pt-3',
                  dark ? 'border-white/20' : 'border-parchment/60'
                )}
              >
                {recentEntries.length === 0 ? (
                  <li className={cn('text-xs', dark ? 'text-white/60' : 'text-ink-muted')}>
                    No entries yet.
                  </li>
                ) : (
                  recentEntries.map((entry: EntryRecord) => (
                    <li key={entry.id}>
                      <Link
                        href={`/entry/${entry.id}`}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition hover:opacity-90',
                          dark ? 'bg-white/10 text-white/85' : 'bg-white/60 text-ink-soft'
                        )}
                      >
                        <div className="shrink-0 rounded-full bg-white/50 p-1">
                          <FlowerSvg entry={entry} size={40} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={cn(
                              'mb-1 flex flex-wrap gap-2 font-medium',
                              dark ? 'text-white' : 'text-ink'
                            )}
                          >
                            <span>{formatEntryDate(entry.createdAt)}</span>
                            {entry.sceneSeason ? (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5 capitalize',
                                  dark ? 'bg-white/15' : 'bg-white/80'
                                )}
                              >
                                {entry.sceneSeason}
                              </span>
                            ) : null}
                            {entry.weather ? (
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.5',
                                  dark ? 'bg-white/15' : 'bg-white/80'
                                )}
                              >
                                {weatherCategoryLabel(entry.weather.category)}
                              </span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2">{entry.content}</p>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
