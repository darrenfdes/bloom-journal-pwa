import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import type { ReleaseNote } from './notes';
import { compareVersions } from './select';

/**
 * Loads "what's new" content from Supabase (the public-read `release_notes` table) instead of
 * bundling it in code, so notes can be published without a deploy. The last successful fetch is
 * cached in localStorage so returning users still see the latest notes while offline; on any failure
 * (offline, no Supabase env, query error) we fall back to that cache.
 */
const CACHE_KEY = 'bloom.releaseNotes.cache';

interface ReleaseNoteRow {
  version: string;
  date: string;
  title: string;
  items: unknown;
}

function mapRow(row: ReleaseNoteRow): ReleaseNote {
  return {
    version: row.version,
    date: row.date,
    title: row.title,
    items: Array.isArray(row.items) ? (row.items as string[]) : [],
  };
}

function readCache(): ReleaseNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReleaseNote[]) : [];
  } catch {
    return [];
  }
}

function writeCache(notes: ReleaseNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(notes));
  } catch {
    // Storage may be unavailable (private mode / disabled) — degrade gracefully.
  }
}

/**
 * Fetches release notes newest-first. Falls back to the cached copy when Supabase is unreachable so
 * offline returning users still see the latest notes.
 */
export async function loadReleaseNotes(): Promise<ReleaseNote[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return readCache();
  try {
    const { data, error } = await client
      .from('release_notes')
      .select('version, date, title, items');
    if (error || !data) return readCache();
    const notes = (data as ReleaseNoteRow[])
      .map(mapRow)
      .sort((a, b) => compareVersions(b.version, a.version));
    if (notes.length > 0) writeCache(notes);
    return notes;
  } catch {
    return readCache();
  }
}
