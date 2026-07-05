-- Release notes for 0.4.0: the explorable 3D meadow. A new "Explore" button in the garden
-- opens /garden/explore — a first-person three.js meadow where you walk among your flowers
-- in every direction, with the same live time-of-day sky and weather as the 2D garden, plus
-- mountains on the horizon and a pond between the months. Mirrors the row published to the
-- public.release_notes table so it is reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.4.0', '2026-07-06', 'What''s new',
    '["Take a walk through your garden: tap Explore in the meadow to wander among your flowers in 3D — in every direction.", "The 3D meadow follows your real sky too: dawn, dusk, stars, rain and snow, with mountains on the horizon and a pond to find.", "Tap any flower while exploring to revisit that memory."]'::jsonb
  );
