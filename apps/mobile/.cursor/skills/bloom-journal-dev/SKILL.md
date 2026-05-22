---
name: bloom-journal-dev
description: Develop Bloom Journal (Expo 54 React Native journaling app). Covers expo-router, async expo-sqlite, zustand store, watercolor theme, and privacy features. Use when editing this repo, adding screens, DB logic, or Expo configuration.
---

# Bloom Journal — Development

## Stack

- **Expo SDK 54** — read https://docs.expo.dev/versions/v54.0.0/ before changing native/API usage
- **expo-router** file-based routes under `app/`
- **expo-sqlite** async API (`getAllAsync`, `runAsync`) — not Drizzle sync on web
- **react-native-svg** + **Reanimated** for flowers and motion
- **Zustand** — `stores/useBloomStore.ts`

## Architecture

```
app/           → screens (write, garden, plant-confirm, entry, settings)
lib/db/        → schema, client, repositories (entries, garden, settings)
lib/flowers/   → genome, seeded RNG
lib/garden/    → layout, scatter, wilt, filters
components/    → flower/, garden/, ui/, lock/
providers/     → DatabaseProvider
```

## Data

- Local-first SQLite (`bloom.db`). JSON columns: `tags`, `garden_position` — use helpers in `lib/db/json.ts`
- Display layout is **recomputed** in `lib/garden/layout.ts` (do not rely on stale `garden_position` for rendering)
- Plant flow: Write → `pendingPlant` in store → `plant-confirm` → `plantEntry()` → garden

## Theme (watercolor)

- Cream parchment backgrounds (`lib/theme/colors.ts`)
- Display: Cormorant Garamond; body: Nunito (`app/_layout.tsx` fonts)
- Mood palettes: `lib/constants/moods.ts`

## Conventions

- Minimize scope; match existing file style
- Mobile-first (iOS/Android); web SQLite is alpha — `metro.config.js` needs `wasm` in `assetExts` + COOP/COEP headers
- No commits unless the user asks
- Verify with `npx tsc --noEmit` before claiming done

## Key routes

| Route | Role |
|-------|------|
| `app/index.tsx` | Redirect: first open → write; else garden |
| `app/write.tsx` | Journal entry + mood/tags |
| `app/plant-confirm.tsx` | Plant ritual + save |
| `app/garden.tsx` | Garden home |
| `app/entry/[id].tsx` | Detail, favourite, revisit, soft delete |

## Adding a feature checklist

- [ ] Types in `lib/types.ts` if new fields
- [ ] Repository in `lib/db/repositories/` using `getSqlite()`
- [ ] Store refresh via `useBloomStore` after mutations
- [ ] Screen wired in `app/_layout.tsx` if new route
