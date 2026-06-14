/**
 * Bloom Journal — Events: shared types (runtime contract)
 * Structurally identical to what precompute-events.ts emits into events.json.
 */

export type EventType =
  | "fullMoon" | "newMoon" | "supermoon" | "micromoon" | "blueMoon" | "blackMoon"
  | "lunarEclipse" | "solarEclipse"
  | "solstice" | "equinox" | "seasonTransition" | "crossQuarter" | "solarTerm"
  | "earthApsis" | "planetOpposition"
  | "meteorShower" | "comet"
  | "fridayThe13th" | "leapDay"
  // runtime-only (never in events.json):
  | "birthday" | "appAnniversary";

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export interface WorldEvent {
  id: string;
  type: EventType;
  date: string;                                  // ISO date (UTC), YYYY-MM-DD
  instantUTC?: string;                           // full timestamp when the moment matters
  title: string;
  subtitle?: string;
  rarity: Rarity;
  activeRange?: { start: string; end: string };  // multi-night windows (showers)
  meta?: Record<string, unknown>;
}

/** Only pass when the user has granted location permission. */
export interface Coords {
  latitude: number;
  longitude: number;
  elevationM?: number;
}

/** Per-user context the app supplies from its own profile/store. */
export interface EventsUserContext {
  birthday: string;        // ISO date of birth, YYYY-MM-DD
  appInstallDate: string;  // ISO date first opened, YYYY-MM-DD
}

/** Shape of the generated events.json file. */
export interface EventsFile {
  generatedAt: string;
  range: { startYear: number; endYear: number };
  scope: "global";
  byDate: Record<string, WorldEvent[]>;
}
