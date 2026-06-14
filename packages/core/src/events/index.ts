/**
 * Bloom Journal — Events module public API.
 *
 * Pure (no React): types, events-runtime, enrich-location, scene-effects.
 * React: useDayEvents (safe to import in web + Expo).
 * Build-only (do NOT import at runtime): precompute-events.ts.
 */

export type {
  EventType, Rarity, WorldEvent, Coords, EventsUserContext, EventsFile,
} from "./types";

export { getEventsForDate, personalEvents, eventsFileMeta } from "./events-runtime";
export type { DayEventsOptions } from "./events-runtime";

export { enrichWithLocation } from "./enrich-location";
export type { LocalEclipse } from "./enrich-location";

export {
  SCENE_EFFECT, primaryEvent, sceneEffectsForDay,
} from "./scene-effects";
export type { SceneEffect, ResolvedEffect } from "./scene-effects";

export { useDayEvents } from "./useDayEvents";
