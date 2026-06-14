# PRD: Rare World Events module integration

**Status:** ✅ complete · **Owner:** darrenfdes · **Branch:** `feature/world-events`
**Last updated:** 2026-06-14

## Context

A pre-built, already-tested **"rare world events"** module was delivered in
`apps/web/reference/world-events/`. It flags special celestial/calendar days (full moons, supermoons,
eclipses, meteor showers, solstices/equinoxes, comets, the user's birthday, the app anniversary, …) so
the meadow scene can later render special treatments. **All event data is precomputed into static JSON —
nothing hits the network at runtime.**

This is a **drop-in integration**: place the module in the shared package, wire the minimum build
plumbing, regenerate `events.json`, and verify typecheck + imports. The integration is **additive** — no
existing component/store/scene/screen is modified by it. The contract lives at
[INTEGRATION-SPEC.md](../../packages/core/src/events/INTEGRATION-SPEC.md) (moved alongside the module).

A second, **separately-requested** task centralizes hardcoded special-event dates (the
"June 18th shooting star") into a traceable config file. This intentionally edits one existing web file
and is kept distinct from the additive module work.

## Decisions (confirmed)

| Decision | Choice | Why |
|---|---|---|
| Placement | `packages/core/src/events/` → imported as `@bloom/core/events` | Repo's shared, framework-agnostic package; mobile-ready by construction |
| Mobile | **Deferred**; verify web only; do **not** touch `apps/mobile/` | Mobile dev paused (June 2026); module is Hermes/Metro-safe by construction |
| Reference copy | **Remove** `apps/web/reference/world-events/` after copying | Avoids duplicate module + stale 583 KB `events.json` |
| Hardcoded dates | Extract to `apps/web/lib/garden/bloom/special-events.config.ts` | Single traceable source of truth; not part of global astronomical JSON |

## Module facts

- Framework-agnostic except `useDayEvents.ts` (React) and `precompute-events.ts` (Node `fs`, build-only).
- `precompute-events.ts` reads `./comets.seed.json`, writes `./events.json` next to itself, prints
  `Wrote 1644 global events to events.json (2024–2050).`
- `@bloom/core` gates subpaths via its `exports` map — a subpath must be listed there to be importable.
- `astronomy-engine` (runtime) + `tsx` (dev) were not installed; `@types/node` is present at root.
- Repo enables `strict` **and** `noUncheckedIndexedAccess`.

---

## Status checklist

### Workstream A — Module integration (additive)
- [x] **A0** Create this PRD (`.claude/plans/world-events-integration.md`)
- [x] **A1** Copy module into `packages/core/src/events/` (types, events-runtime, enrich-location,
      scene-effects, useDayEvents, precompute-events, index, comets.seed.json, example-usage.tsx,
      INTEGRATION-SPEC.md). `events.json` regenerated in A4.
- [x] **A2** `npm i astronomy-engine -w @bloom/core` (`^2.1.19`) + `npm i -D tsx -w @bloom/core` (`^4.22.4`)
- [x] **A3** Wired `packages/core/package.json`: `exports["./events"]`, `scripts.precompute:events`;
      root passthrough script added. No tsconfig change (`resolveJsonModule` already on).
- [x] **A4** `npm run precompute:events -w @bloom/core` → `Wrote 1644 global events to events.json (2024–2050).`;
      confirmed `"scope":"global"`, **0** `latitude`/`longitude`/`observer` matches, 1644 ids.
- [x] **A5** `tsc --noEmit` **clean for `packages/core`**. `apps/web` adds **0 new errors** (verified by
      stash-baseline at HEAD: identical pre-existing test/`.next` errors). Events module imports cleanly.
- [x] **A6** Verified via throwaway tsx scratch: 2026-08-12 → Perseids peak + global solar eclipse +
      birthday (`--08-12`); coords add `meta.local` (`{visible:true,kind:"partial",altitudeDeg:7.3}`);
      no-coords is a no-op and never throws. Scratch deleted.
- [x] **A7** Removed `apps/web/reference/world-events/` (other pre-existing reference files left untouched).

### Workstream B — Centralize hardcoded dates (user-requested)
- [x] **B1** Created `apps/web/lib/garden/bloom/special-events.config.ts` (June 18 2026 one-off + Dec 1 annual).
- [x] **B2** Refactored `shooting-star.ts` `isShootingStarSpecialDay` to read from the config; behavior
      identical (verified: 18 Jun 2026 & 1 Dec → true, birthday override intact). Web typecheck clean.

### Workstream C — PRD
- [x] **C** Checklist updated; integration complete.

---

## Implementation notes

- **`exports` wiring:** add `"./events": "./src/events/index.ts"` mirroring the existing `"./scene"` entry.
- **Script:** `"precompute:events": "tsx src/events/precompute-events.ts"` in `@bloom/core`; run via
  `npm run precompute:events -w @bloom/core`.
- **Regenerate output (expected):** `Wrote 1644 global events to events.json (2024–2050).`
- **Typecheck:** `npx tsc --noEmit -p packages/core/tsconfig.json` and `-p apps/web/tsconfig.json`.
  `example-usage.tsx` is `.tsx` → excluded by core's `src/**/*.ts` include and unimported (reference-only).
- **`noUncheckedIndexedAccess` risk:** module only guaranteed `strict` + `noUnusedLocals/Parameters`.
  If typecheck fails, apply **minimal, type-safe** fixes confined to the **new** module files (no
  public-API / behavior change). Record any such fixes below.
- **Mobile:** deferred. Module sits in `packages/core` (pure JS, Hermes-safe, JSON Metro-native) so it's
  importable by Expo later without changes. Do not read/modify `apps/mobile/` while paused.

### Fixes applied to new module files (no public-API / behavior change)
1. **CJS↔ESM interop** — split by toolchain (`astronomy-engine@2.1.19` ships CJS):
   - `precompute-events.ts` (build-only, run by **tsx**): `import * as Astronomy` →
     `import Astronomy from "astronomy-engine"`. Under Node-ESM/tsx the namespace import collapses to
     `{ default }`, leaving `Astronomy.MakeTime` undefined (script crashed); the default import exposes
     all members. (Also relies on `Astronomy.*` as a type namespace, which the default import provides.)
   - `enrich-location.ts` (runs in the **browser**, bundled by webpack): kept as the original
     `import * as Astronomy`. Webpack exposes all CJS members on the namespace directly; a default
     import (or any static `.default` access) instead triggers an *"astronomy-engine does not contain a
     default export"* webpack warning. Confirmed clean after the web app began consuming the module
     (`event-catalog.ts` is the first web consumer): `/preview` cold-compiles with **0** such warnings.
2. **`noUncheckedIndexedAccess`** — `precompute-events.ts` full-moon loop: `const name = names[i]`
   → `names[i] ?? "Full Moon"`. `names` is parallel to `fulls` and sourced from a complete 12-month
   table, so the fallback never executes; it only satisfies the repo's stricter compiler flag (which
   the delivered module did not account for). The same flag would have failed the original reference
   copy too (observed at `reference/.../precompute-events.ts:115` before A7 removal).

## Follow-on: Preview visuals (2026-06-14)

The module is **no longer dormant in `/preview`**. A world-events browser was added to the sky playground
(`BloomMeadow` with `preview` + no entries) so every `events.json` event can be viewed *and* see its
`SceneEffect` rendered. Live `/garden` is untouched. New web files:
- `apps/web/lib/garden/bloom/event-catalog.ts` — flatten/sort `eventsFileMeta.byDate`, group filters,
  `phaseForEvent` / `moonPresetForEvent` / `effectsForEvent`.
- `apps/web/components/garden/bloom/EventEffectsLayer.tsx` — implements visuals for the 14 reachable
  `SceneEffect` tokens (moon glows, starfield, meteors, solar/lunar eclipse, comet, season wash,
  bright star, sun shift, spooky tint, sparkles). `birthdayBloom`/`anniversaryBloom` deferred (personal events).
- `apps/web/components/garden/bloom/EventStepper.tsx` — prev/next stepper + group/rarity filter chips.
- `BloomMeadow.tsx` — additive: `eventMode`/filter state, an "✦ Events" toggle pill, the effects-layer
  mount, and the stepper. Typecheck unchanged (54 pre-existing baseline errors, 0 new).

Follow-ups: wire today's real event into live `/garden`; personal-event visuals; location-gated eclipses.

## How to resume

1. Read this checklist; the first unchecked box is the next step.
2. Re-run the verification commands in the "Implementation notes" / plan to confirm current state.
3. Plan-mode plan: `~/.claude/plans/refernce-this-folder-for-linked-hellman.md`.
