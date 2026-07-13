-- Release notes for 0.4.1: the 3D explore meadow is now open to everyone. Tap Explore in the
-- garden to walk among your flowers with a fox guide, live sky and weather, and tap any flower
-- to revisit its memory. Mirrors the row published to the public.release_notes table so it is
-- reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.4.1', '2026-07-13', 'What''s new',
    '[
      "Walk your garden in 3D: tap Explore in the meadow to wander among your flowers — now open to everyone.",
      "A little fox leads the way as you stroll, run, or swim through the meadow. On desktop use WASD or arrow keys; on your phone, use the on-screen stick.",
      "The 3D meadow shares your real sky and weather — dawn, dusk, stars, rain, and snow — with mountains on the horizon and a stream and pond to find.",
      "Tap any flower while exploring to revisit that memory."
    ]'::jsonb
  );
