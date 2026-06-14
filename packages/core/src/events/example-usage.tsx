/**
 * Bloom Journal — Events: reference usage (NOT imported anywhere).
 * Shows the intended integration shape. Delete or keep as a doc.
 */

import { useDayEvents, primaryEvent, SCENE_EFFECT } from "./index";
import type { EventsUserContext, Coords } from "./index";

// --- Example 1: in a meadow day-cell component -----------------------------

interface DayCellProps {
  day: Date;
  user: EventsUserContext;
  coords?: Coords | null;            // from your existing geolocation/weather flow
  tzOffsetMinutes?: number;          // e.g. new Date().getTimezoneOffset() * -1
}

export function ExampleDayCellLogic(props: DayCellProps) {
  const events = useDayEvents(props.day, props.user, {
    coords: props.coords,
    timeZoneOffsetMinutes: props.tzOffsetMinutes,
  });

  const lead = primaryEvent(events);          // the day's headline event, or null
  const effect = lead ? SCENE_EFFECT[lead.type] : undefined;

  // YOU decide what each effect token renders in the scene. e.g.:
  //   <Meadow sceneEffect={effect} caption={lead?.title} rarity={lead?.rarity} />
  return { events, lead, effect };
}

// --- Example 2: gating a solar-eclipse effect on local visibility ----------

export function isEclipseVisibleHere(events: { type: string; meta?: any }[]): boolean {
  const ecl = events.find((e) => e.type === "solarEclipse");
  return Boolean(ecl?.meta?.local?.visible); // only set after enrich w/ coords
}
