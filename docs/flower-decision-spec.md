# Flower Decision Spec Sheet

This document describes how a journal `EntryRecord` becomes a rendered flower in web UI.

Source of truth:
- `packages/core/src/flowers/genome.ts`
- `packages/core/src/flowers/moodBloom.ts`
- `packages/core/src/flowers/moodPalettes.ts`
- `apps/web/components/flower/FlowerSvg.tsx`
- `apps/web/components/flower/Flower.tsx`

## 1) Decision Flow

1. `FlowerSvg` calls `buildFlowerGenome(entry, options)` unless `genomeOverride` is provided.
2. `buildFlowerGenome` derives deterministic genome fields from entry data and optional layout/time context.
3. `FlowerSvg` passes key genome fields into `Flower`:
   - `mood={genome.bloomMood}`
   - `seed={genome.seed}`
   - `wordCount={genome.wordCount}`
   - `wiltDroop={genome.wiltFactor * 8}`
   - `pumpkinStage` only when `genome.specialBloom === 'pumpkin'`
4. `Flower` chooses render path:
   - normal bloom component by `bloomMood`, or
   - pumpkin component when `pumpkinStage` is set.

## 2) Deterministic Seed Rule

- Primary seed is `entry.flowerSeed`.
- Fallback seed is `hashString(entry.id)`.
- Determinism consequence: the same entry data yields stable bloom selection and stable random variation.

## 3) Mood Routing Rules

### App Mood -> Bloom Mood

`appMoodToBloomMood(mood)` mapping:

- `joyful`, `ecstatic` -> `joy`
- `peaceful`, `dreamy` -> `calm`
- `loved` -> `love`
- `melancholy` -> `wistful`
- `energized`, `anxious` -> `restless`
- `grateful` -> `hopeful`
- `null`/`undefined`/unknown -> `calm` (default)

### Bloom Mood -> Rendered Bloom

In `Flower`:

- `joy` -> `JoyDaisy`
- `calm` -> `CalmLavender`
- `love` -> `LoveRose`
- `wistful` -> `WistfulBluebells`
- `restless` -> `RestlessDahlia`
- `hopeful` -> `HopefulTulip`

## 4) Pumpkin Easter-Egg Rules

Pumpkin is a render override from genome logic, not a separate mood.

### Trigger Conditions

`resolvePumpkinTrigger` returns true when any one condition matches:

1. Entry mood is `ecstatic` (legacy path).
2. Entry mood is `joyful` and content contains:
   - one ecstatic keyword (for example: `ecstatic`, `thrilled`, `over the moon`), or
   - `!!!` (three or more consecutive exclamation marks).
3. Entry mood is `joyful` and `seed % 10 === 0` (rare deterministic surprise).

If none match, bloom is not pumpkin.

### Stage by Entry Age

`computePumpkinStage(createdAt, now)`:

- `0-9` days old -> stage `0` (flower stage)
- `10-19` days old -> stage `1` (fruiting stage)
- `20+` days old -> stage `2` (ripe stage)

### Render Behavior When Active

- `FlowerSvg` passes `pumpkinStage` only when genome marks `specialBloom: 'pumpkin'`.
- `Flower` renders `Pumpkin` instead of the mood bloom when `pumpkinStage` exists.
- At ripe stage (`2`), `Flower` disables foliage, stem, sway, and wilt effects for the pumpkin render path.

## 5) Entry Field Influence Matrix

Selection-impacting and visual-impacting fields:

- `id`:
  - seed fallback (`hashString(id)`), affecting deterministic random branches.
- `flowerSeed`:
  - primary seed, affecting deterministic random branches and pumpkin rare trigger rule.
- `mood`:
  - direct input for `bloomMood` mapping and pumpkin trigger eligibility.
- `content`:
  - word count (`wordCount`).
  - sentiment-intensity proxy (`!`, `?`, and length) for openness.
  - ecstatic keyword / `!!!` pumpkin trigger matching.
- `title`:
  - changes petal config for some species and contributes to `hasInnerRing`.
- `tags`:
  - controls `leafCount` (`min(tags.length + 2, 6)`).
- `createdAt`:
  - pumpkin stage age calculation.
  - `timeAccent` by hour bucket.
- `isFavourited`:
  - drives favourite halo and slight scale-up in `FlowerSvg`.
- `revisitOf`:
  - sets `hasRevisitBud` flag in genome.

Context options passed to genome (not from entry itself):

- `daysSinceLastEntry` -> `wiltFactor` (after day 3, capped).
- `entryIndex` + `totalEntries` -> `fadeFactor` for older entries when list is large.
- `streakFactor` -> stem lean range.
- `now` -> deterministic pumpkin-stage testing/previews.

## 6) Defaults and Edge Behavior

- When `entry.mood` is null in web flow, `FlowerSvg` coerces to `peaceful` before genome generation.
- Unknown/null mood mapping still safely defaults to bloom mood `calm`.
- Pumpkin requires joyful/ecstatic gating; non-joyful moods cannot trigger pumpkin.
- Seed-dependent logic stays deterministic for fixed input values.
- `genomeOverride` in `FlowerSvg` bypasses normal genome generation logic.

## 7) Worked Examples

### Example A: Calm Lavender (default-safe path)

Input highlights:
- mood: `null`
- content: `"Quiet morning walk."`
- flowerSeed: `12345`

Outcome:
- `FlowerSvg` uses fallback mood `peaceful`.
- `appMoodToBloomMood('peaceful')` -> `calm`.
- no pumpkin trigger.
- rendered bloom: `CalmLavender`.

### Example B: Joy Entry Escalates to Pumpkin

Input highlights:
- mood: `joyful`
- content: `"I am over the moon today!!!"`
- createdAt: 12 days ago
- flowerSeed: any value

Outcome:
- joyful + ecstatic phrase/`!!!` => pumpkin trigger true.
- age 12 days => stage `1`.
- rendered bloom: `Pumpkin` at stage `1` (replaces normal `JoyDaisy` path).

### Example C: Rare Joyful Surprise Pumpkin

Input highlights:
- mood: `joyful`
- content: no ecstatic keywords, no `!!!`
- seed resolves to a multiple of 10
- createdAt: 25 days ago

Outcome:
- trigger via `seed % 10 === 0`.
- age 25 days => stage `2` (ripe).
- rendered bloom: ripe `Pumpkin`; sway/stem/foliage and wilt are suppressed in `Flower`.
