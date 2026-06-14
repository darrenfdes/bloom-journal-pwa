# @bloom/assets

> **Mobile development paused (June 2026).** Mobile branding assets remain in `apps/mobile/` for reference; do not add new mobile-only assets unless explicitly requested.

Bloom Journal uses **procedural SVG** for flowers, sky, ground, and grass — no PNG garden backgrounds.

Visual data lives in `@bloom/core`:

- `flowers/moodPalettes.ts` — bloom gradient colors
- `garden/ground.ts` — ground hill gradients and grass tuft parameters
- `theme/colors.ts`, `theme/seasons.ts` — sky and seasonal palettes

Mobile branding PNGs (`icon.png`, splash) remain under `apps/mobile/assets/images/`.
Web PWA icons remain under `apps/web/public/`.

Add binary assets here only when a feature needs shared raster files.
