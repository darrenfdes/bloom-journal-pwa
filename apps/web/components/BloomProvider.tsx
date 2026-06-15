'use client';

import { useEffect } from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { MigrateLocalDialog } from '@/components/auth/MigrateLocalDialog';
import { repairGardenMetaIfNeeded } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, loadWriteDraft } from '@/lib/db/repositories/settings';
import { pullForUser, setActiveSyncUser } from '@/lib/sync/engine';
import { useBloomStore } from '@/stores/useBloomStore';

export function BloomProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const setReady = useBloomStore((s) => s.setReady);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setDraft = useBloomStore((s) => s.setDraft);
  const refreshEntries = useBloomStore((s) => s.refreshEntries);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [meta, , draft] = await Promise.all([
        repairGardenMetaIfNeeded(),
        getOrCreateSettings(),
        loadWriteDraft(),
      ]);

      if (cancelled) return;

      setGardenMeta(meta);
      setDraft(draft);
      await refreshEntries();
      setReady(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setReady, setGardenMeta, setDraft, refreshEntries]);

  useEffect(() => {
    if (authLoading) return;

    const uid = user?.id ?? null;
    setActiveSyncUser(uid);

    if (!uid) return;

    void (async () => {
      await pullForUser(uid);
      await refreshEntries();
      const meta = await repairGardenMetaIfNeeded();
      setGardenMeta(meta);
    })();
  }, [user?.id, authLoading, refreshEntries, setGardenMeta]);

  useEffect(() => {
    if (!user?.id) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pullForUser(user.id).then(() => refreshEntries());
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id, refreshEntries]);

  return (
    <>
      {children}
      <MigrateLocalDialog />
    </>
  );
}
