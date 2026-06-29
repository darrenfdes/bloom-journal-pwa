-- Release notes for 0.2.1: Sebastian the ram made rarer (rain 50%→20%, clear night ~1/7→10%;
-- difficult-mood entries still always bring him out). Mirrors the row published to the
-- public.release_notes table so it is reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.2.1', '2026-06-30', 'What''s new',
    '["Sebastian, the black ram, is now an even rarer sight: he still always keeps you company on difficult days, but ventures out less often in the rain and on clear nights — so spotting him feels a little more special."]'::jsonb
  );
