-- Web-push notifications for world events & memories.
--
-- push_subscriptions: one row per browser/device push endpoint, owned by an authed user. Stores the
-- Web Push keys, the user's IANA timezone (so the hourly job can target their local night/day window),
-- their birthday, and per-group toggles. Written directly by the browser Supabase client under RLS.
--
-- notification_log: idempotency ledger so each occurrence fires at most once. Service-role only.
--
-- An hourly pg_cron job pings the `send-notifications` edge function (auth + function URL pulled from
-- Vault, so no secrets live in this file).

create table public.push_subscriptions (
  endpoint   text primary key,                  -- the push service endpoint = unique per browser/device
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,                     -- subscription public key
  auth       text not null,                     -- subscription auth secret
  timezone   text not null,                     -- IANA tz, e.g. 'Asia/Kolkata'
  birthday   date,                              -- optional, for the birthday greeting
  groups     jsonb not null default '{"celestial":true,"festivities":true,"memory":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users read own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users update own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Idempotency ledger. RLS on with no policies = clients denied; the edge function uses the
-- service-role key, which bypasses RLS.
create table public.notification_log (
  user_id          uuid not null references auth.users (id) on delete cascade,
  notification_key text not null,               -- e.g. 'celestial:<eventId>', 'memory:2026-06-24'
  sent_at          timestamptz not null default now(),
  primary key (user_id, notification_key)
);

alter table public.notification_log enable row level security;

-- ── Hourly scheduler ────────────────────────────────────────────────────────
-- pg_cron fires every hour; the edge function figures out who is due in their local time.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Before this job can deliver, add two secrets to Vault (Studio → Project Settings → Vault, or SQL):
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-notifications',
--                              'notify_function_url');
--   select vault.create_secret('<NOTIFY_CRON_SECRET — same value as the edge-function secret>',
--                              'notify_cron_secret');
-- The job stores only the command string, so scheduling here succeeds even before the secrets exist;
-- it simply no-ops (missing URL) until they're added.
-- Sourcing the URL via FROM means the call simply doesn't run while the secret is absent
-- (no rows → no call), so this schedule is safe to apply before the secrets are added.
select cron.schedule(
  'send-notifications-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := url_secret.decrypted_secret,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notify_cron_secret')
    ),
    body := '{}'::jsonb
  )
  from vault.decrypted_secrets as url_secret
  where url_secret.name = 'notify_function_url';
  $$
);
