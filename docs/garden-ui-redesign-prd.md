# PRD — Garden Scene UI Redesign (Web)

**Scope:** `apps/web` only. **Status:** Implemented on `feature/ui-2`.

## Problem

The garden is the product's hero screen, but the current rendering reads as flat
UI rather than a living illustration:

- The sky is a 2-stop CSS gradient; hills are three low-detail bands with flat
  fills. There is no mid-ground, no atmospheric perspective, no parallax — the
  scene has no depth.
- The flower SVGs are geometrically correct but stiff: uniform petals, heavy
  drop-shadow ellipses, little silhouette distinction between moods.
- The timeline is a row of white pill buttons plus white pill month labels —
  a navigation affordance, not part of the world.

## Design goals

1. **Depth** — distant mountain ridges and a treeline that parallax against the
   foreground meadow as you pan; atmospheric perspective (distance = lighter,
   bluer, hazier).
2. **Light** — every time-of-day phase gets a painterly multi-stop sky, a
   horizon bloom, and a matching scene-light grade; weather desaturates and
   cools the same layers rather than swapping them.
3. **Character** — each of the seven blooms gets a distinctive silhouette and
   petal craft (seeded variation, rim light, layered whorls) so it feels like
   its mood at 48 px.
4. **Journey** — the month scrubber becomes a season-tinted timeline that
   tracks scroll position; in-scene month labels become serif captions in the
   world; flowers ease in with a gentle stagger as their month enters view.

## Key decisions

- **All changes live in `apps/web`.** Mobile renders its own copies of the
  scene components from the same `@bloom/core` helpers; touching core palettes
  or hill paths would silently restyle mobile. New web-only visual constants
  live in `apps/web/lib/scene/atmosphere.ts`.
- **Geometry contracts are frozen.** `getGardenSkyHeight`, ground-line
  fractions, cluster layout, virtualizer config, hit-testing, and all
  mount/visibility triggers are untouched. Flowers, labels, and tiles appear at
  exactly the same scroll positions as before; only their visual treatment
  changed.
- **Parallax is additive.** Ridges/treeline are new decorative layers driven by
  the existing `visualScrollLeft` value at fractional speeds (0.05/0.1/0.18×).
  The existing 1:1 hill tiling (which carries per-month season colors) keeps
  its logic; its rendering gained crest light, layered gradients, and seeded
  tree/shrub silhouettes.
- **Night stays canvas-driven.** `NightSceneCanvas` (the reference screenshot)
  already clears the bar; the redesign targets the SVG day/dawn/golden/dusk
  stack and leaves night composition as-is.
- **Determinism preserved.** Bloom renderers still draw purely from
  `(mood, seed, palette)`; new petal jitter uses the same seeded PRNG, so an
  entry's flower is unchanged between sessions.

## Components touched

| Area | Files |
|------|-------|
| Atmosphere (new) | `lib/scene/atmosphere.ts` |
| Sky | `scene/SkyTimePhaseLayer.tsx`, `scene/AmbientOverlay.tsx`, `garden/AmbientSky.tsx` |
| Meadow | `garden/SeasonBackground.tsx`, `garden/RepeatingSeasonGround.tsx`, `garden/GrassLayer.tsx`, `garden/GroundTexture.tsx`, `garden/SwayingGrassCanvas.tsx` |
| Flowers | `flower/petalPathHelpers.ts`, `flower/blooms/{Joy,Calm,Love,Wistful,Restless,Hopeful,Pumpkin}.tsx` |
| Timeline | `garden/TimelineScrubber.tsx`, month labels + entrance stagger in `garden/GardenScene.tsx`, `garden/GardenFlower.tsx` |
| Wiring | `garden/GardenScene.tsx`, `scene/WeatherPreviewScene.tsx` |

## Bugs fixed en route (blocking the redesign)

- **Ground tiles vanished beyond the first viewport-width of scroll.** Tile
  screen-x was computed as `i*w - (scroll % w)` while indices spanned
  `floor(scroll/w)±1`, so for `scroll ≥ w` every tile landed off-screen — the
  meadow (and preview routes) rendered as a blank page background. Fixed to
  `i*w - scroll` in `RepeatingSeasonGround`, `SwayingGrassCanvas`,
  `WeatherPreviewScene`, and the month-resolution in `GardenScene`.
- **Grass/texture layers had negative computed heights** (`height - groundY`
  with `height=180`, `groundY≈400+`), so the meadow flora never rendered.
  Both layers now treat `height` as a local band below the ground line.

## Trade-offs

- **More SVG nodes per bloom** (~1.3–1.6×). Mitigated by existing
  `content-visibility: auto` on flowers and virtualized month columns.
- **Parallax layers re-render on scroll.** They are transform-only updates on
  memoized SVGs (no path recompute), matching the cost of the existing tiled
  hills.
- **Web and mobile scenes now diverge visually.** Accepted: web is the
  showcase; mobile parity can port `atmosphere.ts` later.
- **No WebGL/canvas rewrite of the day scene.** SVG + CSS keeps the PWA light
  and the preview routes/debug surface unchanged; it comfortably hits the
  painterly target without a new rendering stack.
