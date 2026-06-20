'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { BouquetBuilder } from '@/components/bouquet/BouquetBuilder';
import { BackLink } from '@/components/layout/BackLink';
import { useBloomStore } from '@/stores/useBloomStore';

export default function NewBouquetPage() {
  const { user } = useAuth();
  const ready = useBloomStore((s) => s.ready);
  const entries = useBloomStore((s) => s.entries);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <BackLink href="/bouquets" label="Bouquets" />
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Make a bouquet</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Gather a handful of your blooms, tie them with a note, and send them to someone.
        </p>
      </header>

      {ready ? (
        <BouquetBuilder entries={entries} canShareLink={Boolean(user)} />
      ) : (
        <p className="text-ink-muted">Loading your flowers…</p>
      )}
    </div>
  );
}
