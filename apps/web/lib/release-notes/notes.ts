/**
 * Hardcoded "what's new" content. This list is the source of truth for both the notes shown to
 * users and the version timeline used to decide what's unseen — the newest entry's `version` is the
 * "current" release. Add one entry per release, newest-first; recommend keeping `version` in step
 * with apps/web/package.json.
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

// Newest-first. Add a new entry at the top for each release.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.1.0',
    date: '2026-06-26',
    title: "What's new in Bloom",
    items: [
      'A living garden: your meadow now follows the real time of day and local weather.',
      'Gentle nudges: optional notifications for sky events, festivities, and resurfaced memories.',
      'More ways to feel: an expanded set of moods to capture how an entry felt.',
      'Keepsake bouquets: bouquets you keep now sync across your devices.',
    ],
  },
];

/** The latest known release version, or null when there are no notes. */
export const CURRENT_RELEASE_VERSION: string | null = RELEASE_NOTES[0]?.version ?? null;
