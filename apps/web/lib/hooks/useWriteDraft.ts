'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { saveWriteDraft } from '@/lib/db/repositories/settings';
import { useBloomStore } from '@/stores/useBloomStore';
import type { WriteDraft } from '@bloom/core';

/**
 * Lifecycle of a write attempt, surfaced to the UI so the user can trust that
 * their words are safe. Mirrors the global `SyncBadge`'s status vocabulary.
 */
export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DEBOUNCE_MS = 600;

const emptyDraft: WriteDraft = {
  title: '',
  content: '',
  mood: null,
  additionalMoods: [],
  tags: [],
  createdAtOverride: null,
  revisitOf: null,
};

type Mode = 'fresh' | 'revisit' | 'quick';

type Options = {
  /** `fresh`/`revisit` bind to the shared store draft (autorestored on boot);
   *  `quick` keeps an independent local draft so the modal is self-contained. */
  mode: Mode;
  /** Parent entry id when `mode === 'revisit'`; seeds `draft.revisitOf`. */
  revisitOf?: string | null;
};

function isEmpty(draft: WriteDraft): boolean {
  return (
    !draft.title.trim() &&
    !draft.content.trim() &&
    draft.mood === null &&
    draft.additionalMoods.length === 0 &&
    draft.tags.length === 0
  );
}

/**
 * One source of truth for a `WriteDraft` across the three web writing surfaces
 * (`/write`, `/revisit/[id]`, `QuickWrite`). Replaces the per-page 600ms
 * autosave effects and the QuickWrite's persistence-less `useState` path.
 *
 * - `fresh`/`revisit` read/write the shared Zustand `draft` (restored on boot
 *   by `BloomProvider`) and persist to the `drafts` Dexie table on debounce.
 * - `quick` keeps an independent local draft and persists it under the same
 *   table (keyed separately) so closing the modal no longer loses content.
 * - Tracks `saveState` so callers can show a saved/saving/error indicator, and
 *   arms a `beforeunload` guard while unsaved changes exist.
 */
export function useWriteDraft({ mode, revisitOf = null }: Options) {
  const useShared = mode !== 'quick';

  const storeDraft = useBloomStore((s) => s.draft);
  const setStoreDraft = useBloomStore((s) => s.setDraft);
  const resetStoreDraft = useBloomStore((s) => s.resetDraft);

  const [localDraft, setLocalDraft] = useState<WriteDraft>(emptyDraft);

  const draft: WriteDraft = useShared ? storeDraft : localDraft;

  const [saveState, setSaveState] = useState<DraftSaveState>('idle');
  /** Stringified snapshot of the last persisted draft, to detect real changes. */
  const persistedRef = useRef<string>(JSON.stringify(emptyDraft));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDraft = useCallback(
    (patch: Partial<WriteDraft>) => {
      if (useShared) {
        setStoreDraft(patch);
      } else {
        setLocalDraft((prev) => ({ ...prev, ...patch }));
      }
    },
    [useShared, setStoreDraft]
  );

  const reset = useCallback(
    (base?: Partial<WriteDraft>) => {
      if (useShared) {
        resetStoreDraft(base);
      } else {
        setLocalDraft({ ...emptyDraft, ...base });
      }
    },
    [useShared, resetStoreDraft]
  );

  // Seed `revisitOf` once the shared draft mounts for a revisit. Non-quick
  // revisits historically wiped the in-progress draft here; we preserve that
  // behavior to avoid changing data semantics in a consistency-only pass.
  useEffect(() => {
    if (mode !== 'revisit' || !revisitOf) return;
    if (storeDraft.revisitOf === revisitOf) return;
    setStoreDraft({ ...emptyDraft, revisitOf });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, revisitOf]);

  // Debounced autosave. Identical cadence to the previous per-page effects,
  // but centralised so every surface reports the same save lifecycle.
  useEffect(() => {
    const snapshot = JSON.stringify(draft);
    if (snapshot === persistedRef.current) return; // nothing changed

    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          await saveWriteDraft(draft);
          persistedRef.current = snapshot;
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      })();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft]);

  // Warn before closing the tab while unsaved changes exist (no such guard
  // existed anywhere before). Internal-route navigation still risks loss if
  // the debounce hasn't fired — that's tracked separately.
  useEffect(() => {
    const hasUnsaved = JSON.stringify(draft) !== persistedRef.current && !isEmpty(draft);
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draft]);

  const canPlant = draft.content.trim().length > 0;

  return { draft, setDraft, reset, saveState, canPlant };
}
