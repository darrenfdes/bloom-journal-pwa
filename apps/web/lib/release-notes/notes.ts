/**
 * Shape of a "what's new" release note. The content itself lives in Supabase (the public-read
 * `release_notes` table) and is loaded at runtime by lib/release-notes/source.ts — this file is just
 * the shared type. The newest note's `version` is treated as the "current" release.
 */
export interface ReleaseNote {
  /** e.g. '0.2.0'. Compared with compareVersions() to decide what a returning user hasn't seen. */
  version: string;
  /** ISO 'YYYY-MM-DD', shown next to the title. */
  date: string;
  /** Short headline, e.g. "What's new". */
  title: string;
  /** User-facing bullet points of what changed. */
  items: string[];
}
