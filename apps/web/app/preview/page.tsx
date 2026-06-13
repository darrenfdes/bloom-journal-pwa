'use client';

/**
 * Preview playground — the live `BloomMeadow` rendered with no flowers, exposing the manual
 * dawn/day/golden/dusk/night switcher + weather selector so the sky and weather effects can be
 * exercised without IndexedDB/auth or live geolocation. The real `/garden` runs the same meadow
 * in `live` mode (clock-driven phase + real weather, controls hidden).
 *
 * The old fixed "scenery" scenes (dawn/day/golden-hour/heavy-rain/…) are deprecated; their routes
 * still exist under `/preview/<name>` but are no longer linked here.
 */
import dynamic from 'next/dynamic';

const BloomMeadow = dynamic(
  () => import('@/components/garden/bloom/BloomMeadow').then((m) => m.BloomMeadow),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-dvh flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading preview…</p>
      </div>
    ),
  }
);

export default function PreviewPage() {
  return <BloomMeadow entries={[]} preview />;
}
