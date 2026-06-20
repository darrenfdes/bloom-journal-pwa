'use client';

import { format, parseISO } from 'date-fns';

import type { KeptBouquetRow } from '@/lib/db/client';

import { BouquetArrangement } from './BouquetArrangement';

type Props = {
  bouquet: KeptBouquetRow;
  onOpen: () => void;
};

/** A kept bouquet on the shelf: a small arrangement thumbnail with sender + received date. */
export function BouquetCard({ bouquet, onOpen }: Props) {
  const { payload } = bouquet;
  const count = payload.flowers.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center gap-2 rounded-2xl border border-parchment bg-cream p-4 text-center transition-colors hover:bg-parchment"
    >
      <BouquetArrangement flowers={payload.flowers} size={150} />
      <p className="text-sm font-medium text-ink">
        {payload.from ? `from ${payload.from}` : `A bouquet of ${count} flower${count === 1 ? '' : 's'}`}
      </p>
      <p className="text-xs text-ink-muted">Kept {format(parseISO(bouquet.receivedAt), 'MMM d')}</p>
    </button>
  );
}
