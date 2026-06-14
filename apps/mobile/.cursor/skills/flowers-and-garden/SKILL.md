---
name: flowers-and-garden
description: Procedural flower SVGs and organic garden layout for Bloom Journal mobile app. MOBILE PAUSED — do not invoke unless the user explicitly requests mobile work.
---

> **Development halted (June 2026).** Mobile work is paused. Do not use this skill for new mobile features unless explicitly requested. Active development is on `apps/web`.

# Flowers & Garden

## Mood-locked flower rendering

| File | Role |
|------|------|
| `lib/flowers/prng.ts` | Spec xorshift PRNG (`xorshiftRand`, `createRng`) |
| `lib/flowers/moodPalettes.ts` | 6 visual `BloomPalette`s with 5 petal tiers each |
| `lib/flowers/moodBloom.ts` | `appMoodToBloomMood`, `BLOOM_FOR_MOOD`, labels |
| `lib/flowers/foliage.ts` | `pickFoliageVariant(seed, wordCount)`, density |
| `lib/flowers/genome.ts` | Entry attrs → `FlowerGenome` (adds `bloomMood`, `foliageVariant`, `wordCount`) |
| `components/flower/petalPathHelpers.ts` | `petalPath`, `heartPetal`, `cupCurl` |
| `components/flower/foliage/renderFoliage.tsx` | 8 grass/foliage bases (tuft → sprigs) |
| `components/flower/blooms/*.tsx` | One renderer per visual mood (Joy/Calm/Love/Wistful/Restless/Hopeful) |
| `components/flower/Flower.tsx` | Stem + foliage + bloom orchestration; ns IDs `${mood}-${seed}-…` |
| `components/flower/FlowerSvg.tsx` | Reanimated wrapper (bloom-in, sway, wilt, favourite glow) |

**Visual mood mapping (8 app moods → 6 visual moods):**
joyful → joy/daisy · peaceful + dreamy → calm/lavender · loved → love/rose ·
melancholy → wistful/bluebell · energized + anxious → restless/dahlia · grateful → hopeful/tulip.

**ViewBox:** `0 0 100 140`. Stem from y=60 to y=138 (centered at x=50), bloom centered around (50, 48).

**Foliage variants (seed + word-count biased):** 0 Tuft, 1 Clump, 2 Wild, 3 Fern, 4 Reeds, 5 Moss, 6 Clover, 7 Sprigs. Short entries pick sparse, long entries pick lush; density 0.6–1.4 scales blade count within a variant.

**Render order (back → front):** foliage base → stem (shadow + main + white highlight) → bloom defs/gradients → petal layers → pollen/specular.

**Rules:**
- Every `LinearGradient`, `RadialGradient`, `Filter` is namespaced via `nsId(ns, suffix)` to avoid collisions when many flowers share a screen.
- Garden flower sizes: ~140px default, 156px favourited (`GardenScene` `flowerSizeForEntry`).
- Gallery for QA: `/flowers` (reachable from settings).

## Garden layout

| File | Role |
|------|------|
| `lib/garden/scatter.ts` | `scatterInCluster()` — min distance between blooms |
| `lib/garden/layout.ts` | Month clusters, depth `z`, scale (older smaller) |
| `components/garden/GardenScene.tsx` | Anchor stem base: `left: x - size/2`, `top: y - height` |

**Coordinates:** `position.x/y` = stem base on scroll canvas. Sort by `z` before paint (back → front).

**Placement:** Deterministic from `entry.id` + month key — not persisted DB coords for display.

## Ambient garden

| File | Role |
|------|------|
| `lib/garden/ground.ts` | `computeGroundVariant`, hill colors, grass tuft params |
| `components/garden/SeasonBackground.tsx` | Sky gradient, layered hills (variant-colored) |
| `components/garden/AmbientSky.tsx` | Sun, mountains, clouds |
| `components/garden/GroundTexture.tsx` | Blade strokes + wildflower specks per variant |
| `components/garden/GrassLayer.tsx` | Foreground tufts (density/height per variant) |
| `components/garden/PollenSparkles.tsx` | Drifting motes |

**Ground variants (0–4):** meadow light, lush, wildflower, deep grove, golden hour.
`computeGroundVariant(month, seed)` — per cluster in `GardenScene`, global on `SeasonBackground`.

**Clouds:** Drift one direction only (right), linear easing, long duration (90s+), small `drift` px — no oscillation.

## Tweaking fullness

- Increase petal counts in `blooms/*.tsx` (per-mood constants live at the top).
- Add a new foliage variant: bump `FoliageVariant` union and add a renderer in `renderFoliage.tsx`.
- Tune mood palettes in `lib/flowers/moodPalettes.ts` (5 petal tiers + center/pollen/stem/leaf).
- Widen scatter `minDistance` in layout if blooms overlap.

## Animation

- Bloom: Reanimated scale 0.12 → 1 on plant confirm.
- Sway: gentle ±3° loop on garden flowers (rotation around stem base).
- Wilt: `wiltFactor` from days since last entry (`lib/garden/wilt.ts`) → passes `wiltDroop` (viewBox units) to `<Flower />`.
