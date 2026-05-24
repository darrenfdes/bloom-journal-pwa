import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import { initDatabase } from '@/lib/db/client';
import { listEntries } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, loadWriteDraft } from '@/lib/db/repositories/settings';
import { pullForUser, setActiveSyncUser } from '@/lib/sync/engine';
import { palette } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useBloomStore } from '@/stores/useBloomStore';

const DbContext = createContext({ ready: false });

export function useDatabaseReady() {
  return useContext(DbContext).ready;
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const setStoreReady = useBloomStore((s) => s.setReady);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setEntries = useBloomStore((s) => s.setEntries);
  const setDraft = useBloomStore((s) => s.setDraft);
  const setUnlocked = useBloomStore((s) => s.setUnlocked);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await initDatabase();
      const [meta, entries, draft, settings] = await Promise.all([
        getOrCreateGardenMeta(),
        listEntries(),
        loadWriteDraft(),
        getOrCreateSettings(),
      ]);

      if (cancelled) return;

      setGardenMeta(meta);
      setEntries(entries);
      setDraft(draft);
      setUnlocked(!(settings.biometricLock || settings.pinEnabled));
      setReady(true);
      setStoreReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [setDraft, setEntries, setGardenMeta, setStoreReady, setUnlocked]);

  useEffect(() => {
    if (authLoading) return;
    const uid = user?.id ?? null;
    setActiveSyncUser(uid);
    if (!uid || !ready) return;

    void (async () => {
      await pullForUser(uid);
      setEntries(await listEntries());
      setGardenMeta(await getOrCreateGardenMeta());
    })();
  }, [user?.id, authLoading, ready, setEntries, setGardenMeta]);

  useEffect(() => {
    if (!user?.id || !ready) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void pullForUser(user.id).then(async () => {
          setEntries(await listEntries());
        });
      }
    });

    return () => sub.remove();
  }, [user?.id, ready, setEntries]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={palette.sage} />
      </View>
    );
  }

  return <DbContext.Provider value={{ ready }}>{children}</DbContext.Provider>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.cream,
  },
});
