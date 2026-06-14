/**
 * Bloom Journal — Location enrichment (runtime, optional)
 * -------------------------------------------------------
 * Adds location-derived detail to the GLOBAL events from events.json.
 *
 * Pass `coords` ONLY when the user has granted location permission. With no
 * coords, events come back untouched except for a sensible default season
 * label — nothing is ever required, and no location is assumed.
 *
 * Runs astronomy-engine client-side, so call it in the browser when you have
 * the user's position; otherwise just render the global events as-is.
 */

// astronomy-engine ships as CommonJS; import it as a namespace (its original, tested form).
// Under webpack (Next.js) and Metro the namespace exposes every member directly, so this
// runs unchanged in the browser. The build-only precompute script runs under tsx instead and
// uses a default import there — see precompute-events.ts.
import * as Astronomy from "astronomy-engine";
import type { WorldEvent, Coords } from "./types";

export interface LocalEclipse { visible: boolean; kind: string; altitudeDeg: number; }

export function enrichWithLocation(
  events: WorldEvent[],
  coords?: Coords | null,
): WorldEvent[] {
  const south = coords ? coords.latitude < 0 : false;
  const observer = coords
    ? new Astronomy.Observer(coords.latitude, coords.longitude, coords.elevationM ?? 0)
    : null;

  return events.map((e) => {
    // (1) Hemisphere-correct season label. Default is Northern; flips only if
    // we actually know the user is in the Southern hemisphere.
    if ((e.type === "seasonTransition" || e.type === "crossQuarter") && e.meta) {
      const season = (south ? e.meta.southern : e.meta.northern) as string | undefined;
      if (season) {
        const title = e.type === "seasonTransition" ? `First day of ${season}` : e.title;
        return { ...e, title, meta: { ...e.meta, hemisphereSeason: season } };
      }
    }

    // (2) Solar-eclipse local visibility — ONLY when coords are present.
    if (e.type === "solarEclipse" && observer && e.instantUTC) {
      const local = localSolarEclipse(e.instantUTC, observer);
      if (local) {
        return {
          ...e,
          subtitle: `${e.subtitle ?? ""} · ${local.visible ? "visible here" : "below horizon here"}`.trim(),
          meta: { ...e.meta, local },
        };
      }
      return { ...e, meta: { ...e.meta, local: { visible: false } } };
    }

    return e;
  });
}

function localSolarEclipse(instantUTC: string, observer: Astronomy.Observer): LocalEclipse | null {
  const target = new Date(instantUTC);
  try {
    const local = Astronomy.SearchLocalSolarEclipse(
      new Date(target.getTime() - 86_400_000), observer);
    if (local.peak.time.date.toISOString().slice(0, 10) !== target.toISOString().slice(0, 10))
      return null;
    const alt = local.peak.altitude;
    return { visible: alt > 0, kind: local.kind, altitudeDeg: +alt.toFixed(1) };
  } catch {
    return null; // SearchLocalSolarEclipse throws when none is visible
  }
}
