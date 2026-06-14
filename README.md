# Bloom Journal PWA

> **Mobile development paused (June 2026).** Active work is on the web app. The Expo app in `apps/mobile/` is maintained for reference only — agents should not read or explore it unless explicitly asked.

A monorepo for Bloom Journal — a mood-aware journaling app where each entry grows a flower in your garden.

**Product spec (current state):** [docs/product-spec.md](docs/product-spec.md)

## Apps

| App | Path | Stack |
|-----|------|-------|
| **Mobile** *(paused)* | [`apps/mobile/`](apps/mobile/) | Expo (React Native), SQLite, Expo Router |
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

### Mobile (Expo) — development paused

The mobile app is not under active development. To run it locally for reference:

```bash
npm run dev:mobile
```

## Workspace layout

```
bloom-journal-pwa/
├── apps/
│   ├── mobile/     # Expo app (development paused — do not modify unless requested)
│   └── web/        # Next.js PWA
└── packages/       # Shared packages (future: @bloom/core)
```

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/product-spec.md](docs/product-spec.md) | Product specification — features, flows, data model |
| [docs/mobile-development-paused.md](docs/mobile-development-paused.md) | Mobile pause status + **unpause checklist** |
| [docs/flower-decision-spec.md](docs/flower-decision-spec.md) | How entries become procedural flowers |
| [apps/web/docs/sync.md](apps/web/docs/sync.md) | Supabase auth and LWW sync |

## Roadmap

- Service worker + offline install (PWA manifest exists; no service worker yet)
- Web PIN lock and daily reminders (mobile has both; mobile development paused June 2026)
- File/image attachments (see sync doc)
