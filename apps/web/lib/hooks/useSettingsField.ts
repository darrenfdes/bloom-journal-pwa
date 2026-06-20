'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { updateSettings } from '@/lib/db/repositories/settings';
import type { AppSettings } from '@/lib/types';

export type FieldSaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 500;

/**
 * Binds a single `AppSettings` field to local state with a debounced,
 * error-aware write. Replaces the settings page's fire-and-forget
 * `void updateSettings(...)` calls, which could leave the optimistic UI value
 * out of sync with the DB on failure.
 *
 * Returns the standard `[value, setValue]` tuple plus `saveState` for a
 * saved/saving/error indicator.
 */
export function useSettingsField<K extends keyof AppSettings>(
  key: K,
  initial: AppSettings[K]
): [AppSettings[K], (next: AppSettings[K]) => void, FieldSaveState] {
  const [value, setValue] = useState<AppSettings[K]>(initial);
  const [saveState, setSaveState] = useState<FieldSaveState>('idle');
  const lastWrittenRef = useRef<AppSettings[K]>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the freshly-loaded value when the initial value arrives (settings
  // load asynchronously from Dexie on mount).
  useEffect(() => {
    setValue(initial);
    lastWrittenRef.current = initial;
    setSaveState('idle');
  }, [initial]);

  const setField = useCallback(
    (next: AppSettings[K]) => {
      setValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveState('saving');
      timerRef.current = setTimeout(() => {
        void (async () => {
          try {
            await updateSettings({ [key]: next } as Partial<AppSettings>);
            lastWrittenRef.current = next;
            setSaveState('saved');
          } catch {
            // Revert to the last persisted value so the UI matches the DB.
            setValue(lastWrittenRef.current);
            setSaveState('error');
            toast.error('Could not save that setting');
          }
        })();
      }, DEBOUNCE_MS);
    },
    [key]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return [value, setField, saveState];
}
