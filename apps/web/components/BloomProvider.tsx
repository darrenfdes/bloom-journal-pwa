'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/AuthProvider';
import { repairGardenMetaIfNeeded } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, loadWriteDraft } from '@/lib/db/repositories/settings';
import { pullForUser, setActiveSyncUser, syncNow } from '@/lib/sync/engine';
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
      // Adopt any local-only memories, pull remote, then push everything pending.
      const { merged } = await syncNow(uid);
      await refreshEntries();
      const meta = await repairGardenMetaIfNeeded();
      setGardenMeta(meta);
      if (merged > 0) {
        toast.success(
          merged === 1
            ? 'Synced 1 memory to your account'
            : `Synced ${merged} memories to your account`
        );
      }
    })();
  }, [user?.id, authLoading, refreshEntries, setGardenMeta]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pullForUser(uid).then(() => refreshEntries());
      }
    };

    // Flush anything queued while offline as soon as connectivity returns.
    const onOnline = () => {
      void syncNow(uid).then(() => refreshEntries());
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [user?.id, refreshEntries]);

  return <>{children}</>;
}
