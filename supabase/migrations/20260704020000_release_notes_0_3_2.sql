-- Release notes for 0.3.2: ducks — a small V formation of ducks now crosses the garden sky
-- occasionally during golden hour, and a little more rarely at dusk. Mirrors the row published
-- to the public.release_notes table so it is reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.3.2', '2026-07-04', 'What''s new',
    '["Keep an eye on the evening sky: a little V of ducks now flies across your garden at golden hour, and sometimes at dusk."]'::jsonb
  );
