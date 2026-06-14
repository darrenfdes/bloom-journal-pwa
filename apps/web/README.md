# Bloom Journal — Web

> **Active development target (June 2026).** Mobile development in `apps/mobile/` is paused. Do not read or explore that folder unless explicitly requested; work here and in `packages/core/`.

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

### Scene previews (dev)

Fixed scenes for sky/weather/pan testing — no live location or weather API required:

- Index: [http://localhost:3000/preview](http://localhost:3000/preview)
- Routes: `/preview/dawn`, `/preview/day`, `/preview/golden-hour`, `/preview/heavy-rain`
- Presets: `lib/scene/preview-scenes.ts`; renderer: `components/scene/WeatherPreviewScene.tsx`

See [apps/web/AGENTS.md](./AGENTS.md) for how to add new preview routes.

## Build

```bash
npm run build
```

## Environment

Copy `.env.local.example` to `.env.local` when enabling Supabase. The app runs without env vars (local-only).

## Docs

- [Sync design contract](./docs/sync.md)
