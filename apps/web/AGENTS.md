> **Mobile development paused (June 2026).** Active work is on this web app (`apps/web`).
>
> **Scope:** Work only under `apps/web/` and `packages/core/`. Do not read, search, or explore `apps/mobile/` unless the user explicitly requests mobile work.

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

## Preview route (dev)

[`/preview`](http://localhost:3000/preview) mounts the live `BloomMeadow` with **no flowers** and the
manual controls visible: dawn/day/golden/dusk/night phase pills + a weather selector (clear, partly
cloudy, overcast, fog, rain, heavy rain, snow, thunderstorm). It exercises the same sky/weather
engine the real `/garden` runs in `live` mode (clock-driven phase + Open-Meteo weather, controls
hidden). `/preview/meadow` is the same meadow with the reference sample garden + ambient creatures.

- Live meadow: `apps/web/components/garden/bloom/BloomMeadow.tsx` (`preview`, `live`, `liveWeather` props)
- Weather effects are driven from `WeatherCategory` via `@bloom/core/scene` helpers (`getRainLayerOpacity`, `getRainDropDurationSec`, `shouldShowLightning`, …).

### Access (admin-only in production)

`/preview*` is open to everyone in development and **admin-only in production**. The gate is
`isAdminUser()` (`apps/web/lib/auth/admin.ts`): always true in dev, otherwise requires a Supabase user
with `app_metadata.role === 'admin'`. Enforced in `apps/web/lib/supabase/middleware.ts` (redirects
non-admins to `/garden`); Settings surfaces preview links only for admins via `useIsAdmin()`.

Grant admin to a user (Supabase SQL editor or MCP `execute_sql`):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
where email = 'someone@example.com';
```

`app_metadata` is server-controlled (users can't edit it), so it's safe as the source of truth.

> Sample `/preview/meadow` flowers use the `'preview'` `userId` sentinel (`apps/web/lib/db/sentinels.ts`),
> live only in memory, and are never written to Dexie or pushed to Supabase.

**Deprecated:** the old fixed-scenery pages (`/preview/{dawn,day,golden-hour,heavy-rain,night-storm,full-moon,flowers}`) still load but are no longer linked. Their renderer is `apps/web/components/scene/DeprecatedWeatherPreviewScene.tsx` with presets in `apps/web/lib/scene/preview-scenes.deprecated.ts` — both marked `@deprecated`. Don't build new previews on them.
