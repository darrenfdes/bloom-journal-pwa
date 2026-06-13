'use client';

import Link from 'next/link';

import { Flower } from '@/components/flower/Flower';
import { BLOOM_MOOD_LABEL, BLOOM_MOODS } from '@bloom/core/flowers/moodBloom';

const BASE_SEED = 42420;

/** @deprecated Old standalone flower gallery — no longer linked from `/preview`. */
export default function FlowersPreviewPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-6 py-[calc(2rem+var(--safe-top))]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Flower preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All mood blooms rendered together for quick visual checks.
          </p>
        </div>
        <Link
          href="/preview"
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Back to previews
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BLOOM_MOODS.map((mood, index) => (
          <div
            key={mood}
            className="flex flex-col items-center rounded-xl border border-border bg-card px-3 py-4"
          >
            <Flower mood={mood} seed={BASE_SEED + index * 101} size={120} wordCount={120} />
            <p className="mt-3 text-sm font-medium text-foreground">{BLOOM_MOOD_LABEL[mood]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
