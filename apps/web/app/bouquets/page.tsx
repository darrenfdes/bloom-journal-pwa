'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { BouquetCard } from '@/components/bouquet/BouquetCard';
import { BouquetViewer } from '@/components/bouquet/BouquetViewer';
import { BackLink } from '@/components/layout/BackLink';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { readBouquetFile } from '@/lib/bouquet/file';
import { keepBouquet, listKeptBouquets } from '@/lib/bouquet/received';
import type { KeptBouquetRow } from '@/lib/db/client';

export default function BouquetsShelfPage() {
  const [bouquets, setBouquets] = useState<KeptBouquetRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<KeptBouquetRow | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setBouquets(await listKeptBouquets());
    setLoaded(true);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const payload = await readBouquetFile(file);
      const row = await keepBouquet(payload, 'file');
      await refresh();
      setOpen(row);
      toast.success('Bouquet added to your shelf');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That doesn’t look like a Bloom bouquet.');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <BackLink href="/settings" label="Settings" />
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Bouquets</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Keepsakes from others, and a place to gather your own.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/bouquet/new">Make a bouquet</Link>
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          Open a bouquet file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".bloom,application/json"
          className="hidden"
          onChange={(e) => void handleOpenFile(e)}
        />
      </div>

      {loaded && bouquets.length === 0 ? (
        <p className="rounded-2xl border border-parchment bg-cream p-8 text-center text-sm text-ink-muted">
          No bouquets on your shelf yet. Open one a friend sent you, or make your own.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {bouquets.map((bouquet) => (
            <li key={bouquet.id}>
              <BouquetCard bouquet={bouquet} onOpen={() => setOpen(bouquet)} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle className="sr-only">A kept bouquet</DialogTitle>
          {open ? <BouquetViewer state={{ status: 'ready', payload: open.payload }} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
