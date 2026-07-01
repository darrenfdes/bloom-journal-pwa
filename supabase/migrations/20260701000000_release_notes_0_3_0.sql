-- Release notes for 0.3.0: mobile UI/UX refresh — Settings rebuilt as a native grouped list
-- (icons, tap-friendly rows, real toggles) and adding a memory now opens a slide-up compose
-- sheet with the plant button pinned above the keyboard and optional mood/tags. Mirrors the row
-- published to the public.release_notes table so it is reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.3.0', '2026-07-01', 'What''s new',
    '["A fresh Settings screen: everything is now organised into tidy, tap-friendly groups with simple on/off switches — much more at home on your phone.","Adding a memory is quicker: tap + in your garden and a compose sheet slides up, with the plant button always within reach even when the keyboard is open.","Start with just your words: jot down a quick thought first, then add a mood or tags only if you want to."]'::jsonb
  );
