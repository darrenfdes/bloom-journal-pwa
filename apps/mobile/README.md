# Bloom Journal (Mobile)

> **Development halted (June 2026).** This Expo app is not under active development. Active work is on `apps/web`. Do not start new mobile work unless explicitly requested.

Turn every journal entry into a flower, and every flower into a memory in a living garden.

## Stack

- **Expo** (SDK 54) + **React Native** + **TypeScript**
- **Expo Router** for navigation
- **expo-sqlite** + **Drizzle ORM** for local-first storage
- **react-native-svg** for procedural flowers
- **Reanimated** for bloom, sway, and garden motion
- **Zustand** for app state

## Design

Soft **watercolor** aesthetic: cream parchment backgrounds, Cormorant Garamond display type, Nunito body, sage accents, and seasonal sky/ground palettes.

## Core flow

1. First open → **Write** screen (*"Every entry grows a flower. Start your garden."*)
2. **Plant It** → confirmation interstitial → flower blooms
3. Garden revealed with first flower planted
4. Later opens → **Garden** home

## Run

```bash
npm install
npm start
```

Press `i` for iOS simulator, `a` for Android, or scan the QR code in Expo Go.

### Linux: `ENOSPC` / file watcher limit

If Metro crashes with `System limit for number of file watchers reached`, raise the inotify limit (recommended, one-time):

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Then run `npm start` again.

**Workarounds** if you cannot use sudo:

- `npm run start:poll` — uses polling instead of native watchers (slower, but reliable)
- Install [Watchman](https://facebook.github.io/watchman/docs/install): `sudo apt install watchman` (often fixes this without changing sysctl)

## Features (MVP)

- Write entries with optional title, mood, tags
- Sentiment inference when mood is skipped
- Procedural SVG flowers (8 species: rose, tulip, daisy, sunflower, lily, orchid, peony, carnation)
- Organic garden layout with monthly clustering
- Seasonal backgrounds, wilt/refresh, timeline scrubber
- Long-press filter by mood or month
- Entry detail: Revisit threads, ♡ favourites, soft delete
- Biometric / PIN lock, JSON export, keyword search in Settings
- Opt-in daily reminders

## Privacy

All journal data stays on-device in SQLite. Export produces a local JSON backup you control.
