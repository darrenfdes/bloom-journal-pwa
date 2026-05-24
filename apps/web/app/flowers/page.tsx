'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Flower } from '@/components/flower/Flower';
import { BLOOM_MOODS, BLOOM_MOOD_LABEL } from '@bloom/core/flowers/moodBloom';
import type { BloomMood } from '@bloom/core/flowers/moodPalettes';

export default function FlowersGalleryPage() {
  const [seeds, setSeeds] = useState<Record<BloomMood, number>>(() =>
    Object.fromEntries(BLOOM_MOODS.map((m) => [m, 1000 + m.charCodeAt(0)])) as Record<BloomMood, number>
  );
  const [expanded, setExpanded] = useState<BloomMood | null>(null);

  const reseed = (mood: BloomMood) => {
    setSeeds((s) => ({ ...s, [mood]: Math.floor(Math.random() * 1_000_000) }));
  };

  const reseedAll = () => {
    setSeeds(
      Object.fromEntries(BLOOM_MOODS.map((m) => [m, Math.floor(Math.random() * 1_000_000)])) as Record<
        BloomMood,
        number
      >
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Link href="/settings" className="text-sm text-ink-soft hover:text-ink">
        ← Settings
      </Link>
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Flower gallery</h1>
        <p className="mt-2 text-sm text-ink-muted">Six mood-locked blooms — procedural SVG from @bloom/core</p>
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={reseedAll}
          className="rounded-full border border-parchment px-3 py-1 text-sm text-ink-soft hover:bg-parchment"
        >
          Reseed all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {BLOOM_MOODS.map((mood) => (
          <div
            key={mood}
            className="flex flex-col items-center rounded-xl border border-parchment bg-cream p-4"
          >
            <button type="button" onClick={() => setExpanded(expanded === mood ? null : mood)}>
              <Flower mood={mood} seed={seeds[mood]} size={120} wordCount={80} />
            </button>
            <p className="mt-2 text-sm font-medium text-ink">{BLOOM_MOOD_LABEL[mood]}</p>
            <button
              type="button"
              onClick={() => reseed(mood)}
              className="mt-1 text-xs text-ink-muted hover:text-ink"
            >
              Reseed
            </button>
          </div>
        ))}
      </div>

      {expanded ? (
        <div className="rounded-xl border border-parchment bg-cream-dark p-4">
          <p className="mb-3 text-sm font-medium text-ink">{BLOOM_MOOD_LABEL[expanded]} — sibling seeds</p>
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Flower
                key={i}
                mood={expanded}
                seed={seeds[expanded] + i * 17}
                size={72}
                wordCount={40 + i * 10}
              />
            ))}
          </div>
        </div>
      ) : null}

      <header className="mt-4">
        <h2 className="font-display text-xl font-semibold text-ink">Pumpkin easter egg</h2>
        <p className="mt-1 text-sm text-ink-muted">Triggered by ecstatic / extremely-happy entries. Matures in 3 stages over ~30 days.</p>
      </header>
      <div className="grid grid-cols-3 gap-4">
        {([0, 1, 2] as const).map((stage) => (
          <div
            key={stage}
            className="flex flex-col items-center rounded-xl border border-parchment bg-cream p-4"
          >
            <Flower mood="joy" seed={9001 + stage} size={120} wordCount={80} pumpkinStage={stage} />
            <p className="mt-2 text-sm font-medium text-ink">
              {stage === 0 ? 'Stage 0 — flower (0–9d)' : stage === 1 ? 'Stage 1 — fruiting (10–19d)' : 'Stage 2 — ripe (20+d)'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
