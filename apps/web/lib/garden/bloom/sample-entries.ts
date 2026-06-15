/**
 * Sample meadow dataset — a faithful port of the reference artifact's `buildEntries()`
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`), reverse-mapped onto real
 * `EntryRecord` shape so it flows through the exact same `toReferenceEntry` adapter the
 * live garden uses. Used only by the standalone `/preview/meadow` playground so the scene
 * renders fully without IndexedDB/auth. `e-ann` is dynamic (one year ago today) so the
 * "this day in your garden" replay can fire, matching the reference.
 */
import type { EntryRecord, Mood } from '@bloom/core';
import type { EntryWeatherSnapshot, TimePhase, WeatherCategory } from '@bloom/core/scene/types';

import { PREVIEW_USER_ID } from '@/lib/db/sentinels';

/** Reference weather display string → the closest `WeatherCategory`. */
const WEATHER: Record<string, WeatherCategory> = {
  Clear: 'clear',
  'Clear night': 'clear',
  Clouds: 'overcast',
  Mist: 'fog',
  'Light rain': 'drizzle',
  'Heavy rain': 'heavy_rain',
};

/** Reference 5-phase → the app's 7-phase `TimePhase` (inverse of adapt.ts PHASE_MAP). */
const PHASE: Record<string, TimePhase> = {
  dawn: 'dawn',
  day: 'day',
  golden: 'golden_hour',
  dusk: 'dusk',
  night: 'night',
};

const snapshot = (w: string, place: string): EntryWeatherSnapshot => ({
  category: WEATHER[w] ?? 'clear',
  windSpeed: 0,
  cloudCover: 0,
  visibility: 0,
  precipitation: 0,
  temperature: 0,
  coords: { lat: 0, lon: 0 },
  locationName: place,
});

interface Opt {
  fav?: boolean;
  revisitOf?: string;
  w?: string;
  tp?: string;
  pl?: string;
}

const E = (
  id: string,
  title: string,
  content: string,
  mood: Mood,
  tags: string[],
  date: Date,
  o: Opt = {}
): EntryRecord => ({
  id,
  userId: PREVIEW_USER_ID,
  title,
  content,
  mood,
  inferredSentiment: null,
  tags,
  createdAt: date.toISOString(),
  updatedAt: date.toISOString(),
  flowerSeed: 0,
  flowerStyle: '',
  gardenPosition: null,
  isFavourited: !!o.fav,
  revisitOf: o.revisitOf ?? null,
  isDeleted: false,
  weather: snapshot(o.w ?? 'Clear', o.pl ?? 'home'),
  timePhase: PHASE[o.tp ?? 'day'] ?? 'day',
  sceneSeason: null,
});

export function buildSampleEntries(): EntryRecord[] {
  const t = new Date();
  const ann = new Date(t.getFullYear() - 1, t.getMonth(), t.getDate(), 18, 40);
  return [
    E('e-ann', 'The day I started writing again', 'Bought a small notebook at the Friday market and promised myself one honest page. This whole garden began here.', 'grateful', ['beginnings'], ann, { fav: true, w: 'Light rain', tp: 'dusk', pl: 'Mapusa' }),
    E('e02', 'Monsoon arrives', 'The first proper downpour. Sat by the window doing nothing at all, and it felt like plenty.', 'peaceful', ['rain'], new Date(2025, 5, 24, 7), { w: 'Heavy rain', tp: 'dawn', pl: 'home' }),
    E('e03', 'Power cut, candlelight', 'Two hours of flickering shadows and an old playlist. The house felt like a different decade.', 'dreamy', ['night'], new Date(2025, 6, 8, 21), { w: 'Heavy rain', tp: 'night', pl: 'home' }),
    E('e04', 'Old film photos', 'Found the envelope from the Pune years. Everyone looks so unguarded. I miss who we were a little.', 'melancholy', ['memory'], new Date(2025, 6, 19, 16), { w: 'Clouds', tp: 'day', pl: 'home' }),
    E('e05', 'Independence day ride', 'Sixty kilometres of wet ghats before breakfast. Legs burning, head completely quiet.', 'energized', ['cycling'], new Date(2025, 7, 15, 6), { w: 'Mist', tp: 'dawn', pl: 'the ghats' }),
    E('e06', 'Slow Sunday breakfast', 'Poha, two rounds of chai, no phone. Grateful for mornings that ask nothing of me.', 'grateful', ['food'], new Date(2025, 7, 24, 9), { w: 'Clouds', tp: 'day', pl: 'home' }),
    E('e07', 'First clear sky in weeks', 'The monsoon blinked. Everything outside looks freshly painted.', 'joyful', ['weather'], new Date(2025, 8, 6, 17), { w: 'Clear', tp: 'golden', pl: 'the balcony' }),
    E('e08', 'Tea with Dadi', 'She told the wedding story again, with three new details. I wrote them all down this time.', 'loved', ['family'], new Date(2025, 8, 14, 16), { fav: true, w: 'Clear', tp: 'golden', pl: "Dadi's house" }),
    E('e09', 'Deadline spiral', 'Rewrote the same paragraph nine times. Tomorrow-me can have it.', 'anxious', ['work'], new Date(2025, 8, 25, 23), { w: 'Clear night', tp: 'night', pl: 'the desk' }),
    E('e10', 'Diwali!!! the whole lane glowing', "Sparklers with the neighbours' kids, marigolds on every door, diyas down the whole street. Absolutely over the moon tonight.", 'joyful', ['festival', 'family'], new Date(2025, 9, 20, 20), { fav: true, w: 'Clear night', tp: 'night', pl: 'our lane' }),
    E('e11', 'Quiet terrace, cool air', 'October finally feels like October. The fan is off for the first time in months.', 'dreamy', ['seasons'], new Date(2025, 9, 9, 22), { w: 'Clear night', tp: 'night', pl: 'the terrace' }),
    E('e12', 'Letter from an old friend', 'An actual letter. Stamps and everything. Read it twice, then once more out loud.', 'loved', ['friends'], new Date(2025, 9, 27, 18), { w: 'Clear', tp: 'dusk', pl: 'home' }),
    E('e13', 'Beach run before sunrise', 'Anjuna at 5:40, tide out, sand hard and fast. Outran the sun by a few minutes.', 'energized', ['running', 'sea'], new Date(2025, 10, 3, 5, 50), { w: 'Mist', tp: 'dawn', pl: 'Anjuna' }),
    E('e14', 'Missing the old gang', 'Group photo anniversary popped up. Everyone scattered across four cities now. Should write to them.', 'melancholy', ['friends'], new Date(2025, 10, 16, 21), { w: 'Clear night', tp: 'night', pl: 'home' }),
    E('e15', 'Bookstore afternoon', 'Two hours in the secondhand shop, left with three books I did not need and absolutely needed.', 'peaceful', ['books'], new Date(2025, 10, 22, 15), { w: 'Clear', tp: 'day', pl: 'Panaji' }),
    E('e16', 'The deploy finally worked', 'Green pipeline at last. Walked around the block grinning at strangers.', 'joyful', ['work', 'code'], new Date(2025, 11, 5, 19), { w: 'Clear', tp: 'dusk', pl: 'the office' }),
    E('e17', 'Cold night, hot soup', 'December pretending to be winter, and I am fully playing along. Soup, blanket, contentment.', 'grateful', ['food'], new Date(2025, 11, 14, 20), { w: 'Clear night', tp: 'night', pl: 'home' }),
    E('e18', 'Looking back at this year', 'Read every entry since June. The hard months grew the strangest, prettiest flowers.', 'peaceful', ['reflection'], new Date(2025, 11, 31, 23), { fav: true, w: 'Clear night', tp: 'night', pl: 'home' }),
    E('e19', 'Soft start, no resolutions', 'Just one intention this year: keep showing up to this page.', 'grateful', ['beginnings'], new Date(2026, 0, 1, 10), { w: 'Mist', tp: 'day', pl: 'home' }),
    E('e20', 'Fog over the fields', 'Rode through cloud sitting on the ground. Could barely see ten metres and did not mind.', 'dreamy', ['cycling'], new Date(2026, 0, 11, 7), { w: 'Mist', tp: 'dawn', pl: 'the fields' }),
    E('e21', 'Spiralling about nothing', 'Caught myself rehearsing arguments nobody is having with me. Wrote it down. Smaller already.', 'anxious', ['mind'], new Date(2026, 0, 23, 22), { w: 'Clear night', tp: 'night', pl: 'home' }),
    E('e22', 'Dinner under fairy lights', 'The little place by the river, the corner table, the long unhurried kind of evening.', 'loved', ['us'], new Date(2026, 1, 14, 21), { fav: true, w: 'Clear night', tp: 'night', pl: 'by the river' }),
    E('e23', 'Small wins count', 'Inbox zero, one good code review, an actual lunch break. Logging it so I remember it happened.', 'joyful', ['work'], new Date(2026, 1, 21, 18), { w: 'Clear', tp: 'dusk', pl: 'the office' }),
    E('e24', 'Holi, colour in my hair for days', 'Pink palms, green ears, and the whole neighbourhood laughing in the street.', 'joyful', ['festival'], new Date(2026, 2, 4, 13), { w: 'Clear', tp: 'day', pl: 'our lane' }),
    E('e25', 'Finally wrote to them', 'Took three months, but the long message went out to the old gang this morning. Some gardens just need patience.', 'grateful', ['friends'], new Date(2026, 2, 9, 9), { revisitOf: 'e14', w: 'Clear', tp: 'day', pl: 'home' }),
    E('e26', 'First mangoes of the season', 'The fruit seller saved the good ones. Ate one over the sink like a person with no manners and no regrets.', 'joyful', ['food', 'seasons'], new Date(2026, 3, 12, 12), { w: 'Clear', tp: 'day', pl: 'Mapusa market' }),
    E('e27', 'The balcony garden bloomed', 'Every pot at once, like they coordinated. Sat with my coffee and just looked for a long time.', 'peaceful', ['plants'], new Date(2026, 3, 25, 8), { fav: true, w: 'Clear', tp: 'dawn', pl: 'the balcony' }),
    E('e28', 'Storm-watching from the porch', 'Pre-monsoon theatre: purple sky, hot wind, the smell of rain that has not arrived yet.', 'dreamy', ['weather'], new Date(2026, 4, 8, 18), { w: 'Clouds', tp: 'dusk', pl: 'the porch' }),
    E('e29', '3 a.m. bug, 4 a.m. fix', 'An off-by-one in the FX rounding, of course it was. Too wired to sleep, too tired to be smug.', 'anxious', ['work', 'code'], new Date(2026, 4, 19, 4), { w: 'Clear night', tp: 'night', pl: 'the desk' }),
    E('e30', 'Monsoon came home again', 'First rains of the season on the roof. A whole year of weather has passed over this little garden.', 'peaceful', ['rain', 'seasons'], new Date(2026, 5, 4, 17), { w: 'Heavy rain', tp: 'golden', pl: 'home' }),
    E('e31', 'One year of tending this', 'Three hundred-odd days, thirty-one honest pages, one slightly ridiculous pumpkin. Worth every word.', 'grateful', ['milestone'], new Date(2026, 5, 10, 19), { fav: true, w: 'Light rain', tp: 'dusk', pl: 'home' }),
  ];
}
