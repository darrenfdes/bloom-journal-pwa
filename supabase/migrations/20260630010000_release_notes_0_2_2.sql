-- Release notes for 0.2.2: fixed weather mapping so WMO rain-shower codes (80-82) render as
-- rain instead of snow (a user in Mumbai saw snow during monsoon rain). Mirrors the row
-- published to the public.release_notes table so it is reproducible on a fresh database.

insert into public.release_notes (version, date, title, items) values
  (
    '0.2.2', '2026-06-30', 'What''s new',
    '["Weather in your garden now matches your local forecast more accurately — rain showers show as rain instead of occasionally appearing as snow."]'::jsonb
  );
