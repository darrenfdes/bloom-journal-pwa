-- Release notes for 0.3.1: meadow flock refresh — sheep now graze in loose natural groups instead
-- of an even scatter, some settle down to rest, and a new grey coat joins the cream and chestnut
-- breeds. Mirrors the row published to the public.release_notes table so it is reproducible on a
-- fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.3.1', '2026-07-04', 'What''s new',
    '["Your meadow''s flock got a refresh: sheep now graze in small natural groups, some settle down for a rest, and you might spot a new grey-coated sheep among the cream and chestnut ones."]'::jsonb
  );
