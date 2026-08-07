# Self-host Bloom Journal (web)

Run your own instance of the Bloom Journal web app on **Vercel**, with optional cloud backup on **Supabase**, and optional **Google** sign-in.

This guide covers the **web app only** (`apps/web`). Mobile is out of scope.

## What you get

| Tier | Result |
|------|--------|
| **1 — Deploy** | App on your Vercel URL. Journaling stays **local-first** in the browser (IndexedDB). No cloud account required. |
| **2 — Sync** | Supabase auth + encrypted backup/sync across devices. Requires migrations, the encryption edge function, and a master key you must back up. |
| **Optional** | Google SSO; free-tier keep-alive via Vercel cron. |

**Not covered here:** web push / VAPID, the `send-notifications` function, or a full cron operations guide.

## Prerequisites

- A [GitHub](https://github.com/) account (to fork the repo)
- A [Vercel](https://vercel.com/) account
- For Tier 2: a [Supabase](https://supabase.com/) account and the [Supabase CLI](https://supabase.com/docs/guides/cli)
- For Google (optional): a Google Cloud project

---

## Tier 1 — Deploy the site (Vercel only)

### 1. Fork the repository

Fork [this repository](https://github.com/darrenfdes/bloom-journal-pwa) on GitHub (or clone your fork).

### 2. Import into Vercel

1. In Vercel: **Add New… → Project** → import your fork.
2. Configure the monorepo:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web` (Edit → select `apps/web`)
   - **Include source files outside of the Root Directory in the Build Step:** enable (required for `@bloom/core`)
3. Leave **Install** / **Build** at defaults unless the build fails (see [Monorepo build tips](#monorepo-build-tips)).
4. Do **not** add Supabase env vars yet.
5. Deploy.

When the deploy finishes, open the Vercel URL. You should be able to journal and grow a garden with data stored only in that browser.

### Monorepo build tips

This repo uses **npm workspaces** (`package-lock.json` at the repo root).

If install/build fails to resolve `@bloom/core`:

- **Install Command:** `cd ../.. && npm install`
- **Build Command:** `npm run build` (from `apps/web`)  
  or from the repo root: `cd ../.. && npm run build:web`

### Alternative: Vercel CLI

If you already develop locally:

```bash
git clone <your-fork-url>
cd bloom-journal-pwa
npm install
npx vercel link   # from repo root; set root directory to apps/web when prompted / in project settings
npx vercel --prod
```

Prefer the dashboard import for a first-time self-host.

---

## Tier 2 — Enable cloud sync (Supabase)

Signed-in sync **encrypts entries before upload**. The client calls the `get-encryption-key` edge function and **will not push plaintext**. Deploying the database without that function means sync will fail.

### 1. Create a Supabase project

In the Supabase dashboard, create a project. Note:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(Settings → API.)

### 2. Link the CLI and apply migrations

From a clone of your fork (repo root):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`<your-project-ref>` is the id in the project URL (`https://<ref>.supabase.co`).

### 3. Deploy entry encryption

Generate a master key encryption key (KEK) and **store a backup somewhere safe outside Supabase**. If this value is lost, wrapped per-user keys — and therefore encrypted entries — cannot be recovered.

```bash
openssl rand -base64 32
```

Set the secret and deploy the function:

```bash
npx supabase secrets set ENTRY_MASTER_KEK=<paste-the-base64-value>
npx supabase functions deploy get-encryption-key
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge Functions by Supabase automatically.

### 4. Configure Auth (email)

In Supabase → **Authentication**:

1. Enable the **Email** provider.
2. **Site URL:** `https://<your-vercel-domain>`
3. **Redirect URLs:** add:
   - `https://<your-vercel-domain>/auth/callback`
   - `http://localhost:3000/auth/callback` (if you develop locally)

**Email confirmation**

- **Personal / family instance:** disable **Confirm email** so sign-up works without SMTP.
- **Public instance:** keep confirmation on and configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) so users can verify addresses.

### 5. Wire env vars on Vercel

In the Vercel project → **Settings → Environment Variables**:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Redeploy so the new vars apply.

For local Tier 2 testing, copy `apps/web/.env.local.example` → `apps/web/.env.local` and fill the same two values.

### 6. Verify sync

1. Open your Vercel URL → sign up / sign in (Settings).
2. Plant an entry while signed in.
3. In Supabase Table Editor, confirm a row appears (sensitive fields live in `enc_blob` when encryption is active).
4. On another browser/device, sign in and confirm the garden pulls down.

If sign-in works but sync never uploads, confirm `get-encryption-key` is deployed and `ENTRY_MASTER_KEK` is set.

### Optional: free-tier keep-alive

Inactive free Supabase projects can pause. This repo includes a Vercel cron that pings Supabase health (`apps/web/vercel.json` → `/api/cron/supabase-keep-alive`).

To use it, set `CRON_SECRET` in Vercel (any long random string). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Without `CRON_SECRET`, the route returns 401 and does nothing useful.

---

## Optional — Google SSO

Google sign-in is optional. Email/password is enough for Tier 2.

High-level checklist (see [Supabase: Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) for console UI details):

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI must include Supabase’s callback:

   `https://<your-project-ref>.supabase.co/auth/v1/callback`

3. In Supabase → Authentication → Providers → **Google**, paste the Client ID and Client Secret and enable the provider.
4. Ensure your app redirect URLs still include:

   `https://<your-vercel-domain>/auth/callback`

   (The web app uses `signInWithOAuth` with `redirectTo: {origin}/auth/callback`.)

5. On the login screen, use **Continue with Google** and confirm you land back in the app signed in.

---

## Out of scope

- **Web push** (`NEXT_PUBLIC_VAPID_*`, `send-notifications`)
- **Mobile** (`apps/mobile`)
- Rebranding / white-labeling
- Maintaining a hand-pasted SQL dump instead of `supabase db push`

Design details for sync live in [apps/web/docs/sync.md](../apps/web/docs/sync.md).

## License

This project is licensed under the [MIT License](../LICENSE).
