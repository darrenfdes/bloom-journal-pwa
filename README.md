# Bloom Journal PWA

A monorepo for Bloom Journal — a mood-aware journaling app where each entry grows a flower in your garden.

## Apps

| App | Path | Stack |
|-----|------|-------|
| **Mobile** | [`apps/mobile/`](apps/mobile/) | Expo (React Native), SQLite, Expo Router |
| **Web** | [`apps/web/`](apps/web/) | Next.js 15, Dexie (IndexedDB), Tailwind + shadcn/ui |

## Getting started

```bash
npm install
```

### Web (Next.js)

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000). Data is stored locally in IndexedDB; Supabase sync is wired but inactive until env vars are set (see `apps/web/.env.local.example`).

**Scene previews:** [http://localhost:3000/preview](http://localhost:3000/preview) — fixed sky/weather scenes for dev (`apps/web/AGENTS.md`).

### Mobile (Expo)

```bash
npm run dev:mobile
```

## Workspace layout

```
bloom-journal-pwa/
├── apps/
│   ├── mobile/     # Expo app (do not modify from web PRs)
│   └── web/        # Next.js PWA
└── packages/       # Shared packages (future: @bloom/core)
```

## Roadmap

- `packages/core` — shared types, flower genome, garden layout
- Supabase auth + LWW sync (see `apps/web/docs/sync.md`)
- Web flower SVG rendering
- Service worker + offline install
