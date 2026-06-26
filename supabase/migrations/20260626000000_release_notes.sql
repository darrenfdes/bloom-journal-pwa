-- Release notes ("What's new"): global, public-read content feeding the in-app dialog.
-- Previously hardcoded in apps/web/lib/release-notes/notes.ts; moved here so notes can be published
-- without a code deploy. Anon-readable (like the share-link `bouquets` table); writes are admin-only
-- (no write policy → only the dashboard / service role can insert), so users can't author notes.

create table public.release_notes (
  version    text primary key,                   -- e.g. '0.2.0'; compared with compareVersions()
  date       date not null,                       -- shown next to the title (YYYY-MM-DD)
  title      text not null,                        -- short headline, e.g. "What's new"
  items      jsonb not null default '[]'::jsonb,   -- array of user-facing bullet strings
  created_at timestamptz not null default now()
);

alter table public.release_notes enable row level security;

-- Anyone (including signed-out visitors) may read release notes. No insert/update/delete policy:
-- notes are authored via the Supabase dashboard / SQL editor under the service role.
create policy release_notes_public_read
  on public.release_notes
  for select
  to public
  using (true);

-- Seed the notes that previously lived in code (apps/web/lib/release-notes/notes.ts).
insert into public.release_notes (version, date, title, items) values
  (
    '0.1.0', '2026-06-26', 'What''s new in Bloom',
    '["A living garden: your meadow now follows the real time of day and local weather.","Gentle nudges: optional notifications for sky events, festivities, and resurfaced memories.","More ways to feel: a much larger set of moods when writing an entry — from joyful, grateful, and hopeful to numb, drained, lonely, and overwhelmed — so you can capture exactly how a moment felt.","Keepsake bouquets: bouquets you keep now sync across your devices."]'::jsonb
  ),
  (
    '0.2.0', '2026-06-26', 'What''s new',
    '["Sebastian: the black ram now wanders into the meadow when you log a difficult feeling, sometimes ventures out in the rain, and only rarely appears on clear nights — a gentle presence for the harder days.","Easier mood picking: while writing an entry, moods are now grouped into scannable sections (Positive, Calm, Low, and Difficult) so it is quicker to find how you feel."]'::jsonb
  );
