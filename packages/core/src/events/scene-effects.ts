/**
 * Bloom Journal — Scene-effect contract
 * -------------------------------------
 * Maps each event type to an opaque effect TOKEN. The token names are a
 * contract only — YOU implement what each one looks like in the meadow scene.
 * This module deliberately contains no visuals and no rendering.
 */

import type { EventType, Rarity, WorldEvent } from "./types";

export type SceneEffect =
  | "moonGlow" | "moonGlowStrong" | "moonGlowFaint" | "moonGlowBlue"
  | "starfield" | "shootingStars" | "dimDaylight" | "bloodMoon" | "cometArc"
  | "seasonShift" | "brightStar" | "subtleSunShift"
  | "birthdayBloom" | "anniversaryBloom" | "spookyTint" | "rareSparkle";

export const SCENE_EFFECT: Partial<Record<EventType, SceneEffect>> = {
  fullMoon: "moonGlow",
  supermoon: "moonGlowStrong",
  micromoon: "moonGlowFaint",
  blueMoon: "moonGlowBlue",
  newMoon: "starfield",
  meteorShower: "shootingStars",
  solarEclipse: "dimDaylight",        // gate on meta.local?.visible when coords known
  lunarEclipse: "bloodMoon",
  comet: "cometArc",
  solstice: "seasonShift",
  equinox: "seasonShift",
  seasonTransition: "seasonShift",
  crossQuarter: "seasonShift",
  solarTerm: "seasonShift",
  planetOpposition: "brightStar",
  earthApsis: "subtleSunShift",
  birthday: "birthdayBloom",
  appAnniversary: "anniversaryBloom",
  fridayThe13th: "spookyTint",
  leapDay: "rareSparkle",
};

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3,
};

/** The single most notable event of a day (highest rarity), or null. */
export function primaryEvent(events: WorldEvent[]): WorldEvent | null {
  return events.reduce<WorldEvent | null>(
    (best, e) =>
      !best || RARITY_WEIGHT[e.rarity] > RARITY_WEIGHT[best.rarity] ? e : best,
    null,
  );
}

export interface ResolvedEffect {
  effect: SceneEffect;
  rarity: Rarity;
  event: WorldEvent;
}

/** All renderable effects for a day, sorted most-notable first. */
export function sceneEffectsForDay(events: WorldEvent[]): ResolvedEffect[] {
  return events
    .map((e): ResolvedEffect | null => {
      const effect = SCENE_EFFECT[e.type];
      return effect ? { effect, rarity: e.rarity, event: e } : null;
    })
    .filter((x): x is ResolvedEffect => x !== null)
    .sort((a, b) => RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity]);
}
