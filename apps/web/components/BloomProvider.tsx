'use client';

import { useEffect } from 'react';

import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, loadWriteDraft } from '@/lib/db/repositories/settings';
import { useBloomStore } from '@/stores/useBloomStore';

export function BloomProvider({ children }: { children: React.ReactNode }) {
  const setReady = useBloomStore((s) => s.setReady);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const setDraft = useBloomStore((s) => s.setDraft);
  const refreshEntries = useBloomStore((s) => s.refreshEntries);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [meta, , draft] = await Promise.all([
        getOrCreateGardenMeta(),
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

  return <>{children}</>;
}
