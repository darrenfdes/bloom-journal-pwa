# Bloom Journal — Web

Next.js 15 app with local-first IndexedDB storage (Dexie), Bloom theme (Tailwind v4 + shadcn/ui), and Supabase stubs for future sync.

## Develop

From the monorepo root:

```bash
npm run dev:web
```

Or from this directory:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

## Environment

Copy `.env.local.example` to `.env.local` when enabling Supabase. The app runs without env vars (local-only).

## Docs

- [Sync design contract](./docs/sync.md)
