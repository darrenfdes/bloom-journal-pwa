'use client';

import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import type { BouquetPayload } from '@bloom/core';

import { BouquetArrangement } from './BouquetArrangement';

export type BouquetViewerState =
  | { status: 'loading' }
  | { status: 'missing-key' }
  | { status: 'not-found' }
  | { status: 'error'; message?: string }
  | { status: 'ready'; payload: BouquetPayload };

type Props = {
  state: BouquetViewerState;
  /** When provided and not yet kept, a Keep button is shown. */
  onKeep?: () => void;
  kept?: boolean;
  keeping?: boolean;
};

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="font-display text-2xl text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

export function BouquetViewer({ state, onKeep, kept = false, keeping = false }: Props) {
  if (state.status === 'loading') {
    return <EmptyState title="Untying the ribbon…" body="Opening this bouquet for you." />;
  }
  if (state.status === 'missing-key') {
    return (
      <EmptyState
        title="This bouquet is sealed"
        body="The link is missing its key. Ask the sender to share the full link again."
      />
    );
  }
  if (state.status === 'not-found') {
    return (
      <EmptyState
        title="We couldn’t find this bouquet"
        body="The link may be broken or the bouquet may no longer exist."
      />
    );
  }
  if (state.status === 'error') {
    return (
      <EmptyState
        title="Something wilted"
        body={state.message ?? 'This bouquet couldn’t be opened. Try the link again.'}
      />
    );
  }

  const { payload } = state;
  const withWords = payload.flowers.filter((f) => f.content?.trim());

  return (
    <div className="flex flex-col items-center gap-6">
      <BouquetArrangement flowers={payload.flowers} greenery={payload.greenery} size={320} />

      {payload.to ? <p className="font-display text-lg text-ink">To {payload.to}</p> : null}

      {payload.from ? <p className="text-sm text-ink-soft">from {payload.from}</p> : null}

      {payload.note ? (
        <p className="max-w-prose whitespace-pre-wrap text-center font-display text-xl text-ink">
          {payload.note}
        </p>
      ) : null}

      {withWords.length > 0 ? (
        <div className="w-full max-w-prose space-y-4">
          {withWords.map((flower, i) => (
            <article key={i} className="rounded-xl border border-parchment bg-cream p-4">
              <p className="text-xs text-ink-muted">{format(parseISO(flower.createdAt), 'MMM d')}</p>
              {flower.title ? (
                <h3 className="font-display text-lg text-ink">{flower.title}</h3>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{flower.content}</p>
            </article>
          ))}
        </div>
      ) : null}

      {onKeep ? (
        kept ? (
          <p className="text-sm text-sage-dark">Kept on your shelf ✓</p>
        ) : (
          <Button onClick={onKeep} disabled={keeping}>
            {keeping ? 'Keeping…' : 'Keep on my shelf'}
          </Button>
        )
      ) : null}
    </div>
  );
}
