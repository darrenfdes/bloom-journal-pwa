-- Sync the recipient's keepsake shelf (kept bouquets) per-user, encrypted at the sync boundary.
-- The whole bouquet payload is AES-GCM encrypted client-side with the user's per-user DEK (the same
-- key entries use) and stored in enc_blob. Only received_at stays plaintext, for ordering.
-- Distinct from the share-link `bouquets` table (anon-readable ciphertext store) — this is private,
-- per-user, and never anon-readable.

create table public.kept_bouquets (
  id          text not null,                 -- bouquet payload id (globally shared across recipients)
  user_id     uuid not null references auth.users (id) on delete cascade,
  enc_blob    text not null,                 -- base64( version(1) || iv(12) || ciphertext+tag ) of { payload, source }
  enc_version integer not null default 1,
  received_at timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Composite PK: the same bouquet can sit on multiple users' shelves.
  primary key (user_id, id)
);

alter table public.kept_bouquets enable row level security;

-- Owners only. Insert-only feature today (keepsakes are immutable, no remove-from-shelf UI), so no
-- update/delete policy is granted.
create policy "Users read own kept bouquets"
  on public.kept_bouquets
  for select
  using (auth.uid() = user_id);

create policy "Users insert own kept bouquets"
  on public.kept_bouquets
  for insert
  with check (auth.uid() = user_id);
