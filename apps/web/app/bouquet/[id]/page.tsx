'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BouquetViewer, type BouquetViewerState } from '@/components/bouquet/BouquetViewer';
import { keepBouquet, getKeptBouquet } from '@/lib/bouquet/received';
import { openSharedBouquet, parseFragmentKey } from '@/lib/bouquet/share';
import type { BouquetPayload } from '@bloom/core';

export default function SharedBouquetPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [state, setState] = useState<BouquetViewerState>({ status: 'loading' });
  const [payload, setPayload] = useState<BouquetPayload | null>(null);
  const [kept, setKept] = useState(false);
  const [keeping, setKeeping] = useState(false);

  useEffect(() => {
    const key = parseFragmentKey(window.location.hash);
    if (!key) {
      setState({ status: 'missing-key' });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const opened = await openSharedBouquet(id, key);
        if (cancelled) return;
        setPayload(opened);
        setState({ status: 'ready', payload: opened });
        setKept(Boolean(await getKeptBouquet(opened.id)));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setState(/found/i.test(message) ? { status: 'not-found' } : { status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleKeep = async () => {
    if (!payload) return;
    setKeeping(true);
    try {
      await keepBouquet(payload, 'link');
      setKept(true);
      toast.success('Kept on your shelf');
    } catch {
      toast.error('Could not keep this bouquet.');
    } finally {
      setKeeping(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <BouquetViewer
        state={state}
        onKeep={() => void handleKeep()}
        kept={kept}
        keeping={keeping}
      />
      {state.status === 'ready' ? (
        <Link href="/bouquets" className="text-center text-sm text-ink-soft hover:text-ink">
          Go to your bouquets shelf →
        </Link>
      ) : null}
    </div>
  );
}
