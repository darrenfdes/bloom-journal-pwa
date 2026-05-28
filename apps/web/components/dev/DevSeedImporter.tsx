'use client';

import { useState } from 'react';

import type { GardenMeta, LocalEntryRecord } from '@/lib/db/client';
import { getDb } from '@/lib/db/client';

type SeedEntry = {
  id: string;
  title: string | null;
  content: string;
  mood: LocalEntryRecord['mood'];
  inferredSentiment: LocalEntryRecord['inferredSentiment'];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  flowerSeed: number;
  flowerStyle: Record<string, unknown> | string;
  gardenPosition: LocalEntryRecord['gardenPosition'];
  isFavourited: boolean;
  revisitOf: string | null;
  isDeleted: boolean;
  weather: LocalEntryRecord['weather'];
  timePhase: LocalEntryRecord['timePhase'];
  sceneSeason: LocalEntryRecord['sceneSeason'];
};

type SeedPayload = {
  gardenMeta: {
    theme: string;
    layoutMode: string;
    lastEntryAt: string | null;
    hasPlantedFirst: boolean;
    unlockedSeasons: string[];
  };
  entries: SeedEntry[];
};

export function DevSeedImporter() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const importSeeds = async () => {
    setLoading(true);
    setStatus('Importing JSON seeds...');
    try {
      const response = await fetch('/dev-seeds/entries.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load /dev-seeds/entries.json');
      const payload = (await response.json()) as SeedPayload;
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      if (entries.length === 0) throw new Error('No entries found in JSON seed file.');

      const db = getDb();
      const now = new Date().toISOString();
      const existingMeta = await db.garden_meta.toCollection().first();
      const meta: GardenMeta = {
        id: existingMeta?.id ?? 'dev-seed-meta',
        userId: existingMeta?.userId ?? 'local',
        theme: payload.gardenMeta?.theme ?? 'watercolor',
        layoutMode: payload.gardenMeta?.layoutMode ?? 'organic',
        lastEntryAt: payload.gardenMeta?.lastEntryAt ?? null,
        hasPlantedFirst: payload.gardenMeta?.hasPlantedFirst ?? true,
        unlockedSeasons: payload.gardenMeta?.unlockedSeasons ?? [],
        createdAt: existingMeta?.createdAt ?? now,
      };

      await db.garden_meta.put(meta);
      await db.entries.bulkPut(
        entries.map((entry) => ({
          id: entry.id,
          userId: 'local',
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          inferredSentiment: entry.inferredSentiment,
          tags: entry.tags ?? [],
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          flowerSeed: entry.flowerSeed,
          flowerStyle:
            typeof entry.flowerStyle === 'string'
              ? entry.flowerStyle
              : JSON.stringify(entry.flowerStyle ?? {}),
          gardenPosition: entry.gardenPosition ?? null,
          isFavourited: !!entry.isFavourited,
          revisitOf: entry.revisitOf ?? null,
          isDeleted: !!entry.isDeleted,
          weather: entry.weather ?? null,
          timePhase: entry.timePhase ?? null,
          sceneSeason: entry.sceneSeason ?? null,
          pendingPush: false,
          syncedAt: null,
        }))
      );

      setStatus(`Imported ${entries.length} seed entries. Open /garden to view.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-xl font-semibold text-foreground">Dev JSON Seed Importer</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Imports entries from <code>/dev-seeds/entries.json</code> into local IndexedDB.
      </p>
      <button
        type="button"
        onClick={importSeeds}
        disabled={loading}
        className="mt-5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
      >
        {loading ? 'Importing...' : 'Import JSON Seeds'}
      </button>
      {status ? <p className="mt-4 text-sm text-foreground">{status}</p> : null}
    </div>
  );
}
