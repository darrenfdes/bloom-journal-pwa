<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Develop

From the monorepo root:

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

## Scene preview routes (dev)

Fixed-scene pages under `/preview` for testing sky, weather, and garden panning without live location/weather APIs. Start at [http://localhost:3000/preview](http://localhost:3000/preview).

| Route | Scene |
|-------|--------|
| `/preview` | Index of all preview scenes |
| `/preview/dawn` | Dawn, partly cloudy |
| `/preview/day` | Midday, clear |
| `/preview/golden-hour` | Golden hour, light clouds |
| `/preview/heavy-rain` | Heavy rain (demo lightning enabled) |

**Implementation:**

- Scene presets: `apps/web/lib/scene/preview-scenes.ts` (`PREVIEW_ROUTES` + `*_PREVIEW_SCENE` exports)
- Shared renderer: `apps/web/components/scene/WeatherPreviewScene.tsx` (uses `ScenePreviewProvider`, horizontal pan, repeating ground)
- Route pages: `apps/web/app/preview/<name>/page.tsx`

**Adding a preview:** define a `SceneState` in `preview-scenes.ts`, append to `PREVIEW_ROUTES`, add `app/preview/<slug>/page.tsx` rendering `WeatherPreviewScene`. Use `demoLightning` only for storm previews.
