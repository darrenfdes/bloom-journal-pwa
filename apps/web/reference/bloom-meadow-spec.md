# Bloom Meadow — Implementation Spec v1.0

A precise, self-contained specification for recreating the **Bloom Meadow** React artifact: a horizontally scrollable living meadow where each journal entry grows a deterministic procedural SVG flower under a time-of-day sky. Follow this document literally. Where exact values are given, use them exactly. Where ranges are given, the value must come from the seeded PRNG described in §4 — never from `Math.random()`.

---

## 0. What you are building

A single full-viewport scene. A painterly sky (one of five time-of-day palettes, auto-chosen from the local clock, manually overridable) sits behind three parallax hill silhouettes with small trees. In front, a wide meadow scrolls horizontally: a green ground strip, ~165 swaying grass tufts, and 31 hand-drawn SVG flowers planted in monthly clusters — one flower per journal entry, species chosen by the entry's mood, shape randomized deterministically from the entry's id+title. The user wanders by dragging, scrolling, or a month scrubber; hovering a flower shows a tooltip; tapping opens a parchment "memory card" modal with the entry. A "This day in your garden" banner replays the entry from exactly one year ago. A rain toggle adds 70 animated raindrops. The whole frame is finished with a paper-grain texture and a vignette.

Everything animates: clouds drift, stars twinkle, fireflies wander at night, pollen floats by day, flowers sway, and the entire palette crossfades over ~1.6s when the phase changes.

---

## 1. Hard constraints

1. **One file.** A single `.jsx` file, default export `function BloomMeadow()`, **no required props**.
2. **Imports:** only `import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";`. No other libraries. No Tailwind.
3. **Styling:** inline `style` objects everywhere, plus exactly **one** injected `<style>` tag (inside the component's returned tree) containing the font `@import`, scrollbar hiding, all `@keyframes`, and the reduced-motion rule (§22).
4. **Fonts:** `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');`
5. **No browser storage.** Never use `localStorage`/`sessionStorage`. All state in React state/refs.
6. **No SVG gradient `<defs>` anywhere.** Many flower instances render simultaneously; gradient `id`s would collide. Use solid fills and layered shapes to fake shading.
7. **Determinism.** Two renders of the same entry must produce pixel-identical flowers. All per-flower randomness derives from `seed = hashString(entry.id + entry.title)` through `mulberry32`.
8. **Parallax is imperative.** Hill transforms are written directly to DOM refs inside a `requestAnimationFrame`-throttled scroll handler — never via React state (it would re-render 60×/s).
9. Root element: `<div style={{ position:"fixed", inset:0, overflow:"hidden", fontFamily: sans, background:"#0a0f2a", userSelect: grabbing ? "none" : "auto" }}>`.

---

## 2. Layer architecture (z-index map)

All layers are absolutely positioned children of the fixed root, bottom of list = topmost.

| z | Layer | Scrolls? |
|---|-------|----------|
| 0 | **Sky container**: phase gradients, stars, sun, moon, clouds, parallax hills, pollen, fireflies | fixed (hills translate imperatively) |
| 10 | **Meadow scroller**: ground, month labels, grass, flowers | yes — native horizontal scroll |
| 20 | **Rain overlay** | fixed |
| 50 | Header (brand + controls), timeline scrubber, hint text | fixed |
| 52 | Replay banner | fixed |
| 60 | Memory card modal (with its own dim backdrop) | fixed |
| 65 | Vignette | fixed |
| 70 | Paper grain | fixed |

Inside the meadow world: ground at base, grass tufts z `100 + round((26 − bottom) × 1.8)`, flowers z `100 + round((1 − depth) × 40)`, hovered flower z `200`.

---

## 3. Typography & shared tokens

```js
const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"; // display, titles, journal text (often italic)
const sans  = "'Nunito', 'Segoe UI', sans-serif";                        // UI labels: 9–12px, weight 700–800, letterSpacing 1–4, uppercase
const glass = {
  background: "rgba(22,27,36,.38)",
  backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(247,241,227,.16)",
  color: "#f7f1e3",
};
```

Cream/parchment family used throughout: `#fbf6ec` (card), `#f3ecd9` (active pill), `#faf6e9` (brand text), borders `#e6d9bf`/`#e3d6bd`, muted ink `#8b8370`, dark ink `#33392f`–`#474e42`, gold accent `#ffe1a0`/`#d4a23c`/`#a98c4a`.

---

## 4. Deterministic engine (copy verbatim)

```js
const hashString = (s) => {            // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const mulberry32 = (a) => () => {      // seeded PRNG, returns () => float in [0,1)
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hex2rgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const lerpColor = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  const c = A.map((v,i) => Math.round(v + (B[i]-v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
```

Usage rules: each flower species creates its own stream `const r = mulberry32(s ^ MASK)` where `s` is the entry seed and `MASK` is a per-species constant (given in §11) so species don't share random sequences. Ambient particle fields use fixed literal seeds (given per field). Layout placement uses `mulberry32(seed)` directly.

---

## 5. Data model, moods, sample dataset

### 5.1 EntryRecord shape

```ts
{
  id: string; title: string; content: string;
  mood: "joyful"|"peaceful"|"dreamy"|"loved"|"melancholy"|"energized"|"anxious"|"grateful";
  tags: string[];
  createdAt: Date;
  isFavourited: boolean;
  revisitOf: string | null;   // id of an earlier entry this one revisits
  weather: string;            // display string, e.g. "Light rain"
  timePhase: "dawn"|"day"|"golden"|"dusk"|"night";  // snapshot at writing time
  place: string;              // e.g. "Mapusa"
}
```

### 5.2 Mood → bloom mapping

```js
const MOODS = {
  joyful:     { label: "Joyful",     chip: "#e2a23b", bloom: "daisy"    },
  peaceful:   { label: "Peaceful",   chip: "#8d80c2", bloom: "lavender" },
  dreamy:     { label: "Dreamy",     chip: "#7da4c8", bloom: "lavender" },
  loved:      { label: "Loved",      chip: "#d4708f", bloom: "rose"     },
  melancholy: { label: "Melancholy", chip: "#7488ba", bloom: "bluebell" },
  energized:  { label: "Energized",  chip: "#dd7440", bloom: "dahlia"   },
  anxious:    { label: "Anxious",    chip: "#b56f9f", bloom: "dahlia"   },
  grateful:   { label: "Grateful",   chip: "#c98a40", bloom: "tulip"    },
};
```

**Pumpkin easter-egg rule** (evaluated at layout time): if `mood === "joyful"` AND `/(!!!|ecstatic|over the moon|thrilled)/i` matches `title + " " + content`, the bloom becomes `"pumpkin"` instead of daisy. Unknown/null moods fall back to `"lavender"`.

### 5.3 Sample dataset — 31 entries (reproduce exactly)

Build inside `buildEntries()`. **Special rule:** entry `e-ann` is created *dynamically* at `new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 18, 40)` — i.e. exactly one year ago today at 18:40 — so the replay banner (§16) always fires. All other dates are fixed. Dates below are local time, written as `Y-M-D H:mm` with **1-based months** (when constructing with `new Date(y, m, d, h)` remember JS months are 0-based).

| id | date | mood | title | fav | revisitOf | weather | timePhase | place | tags |
|----|------|------|-------|-----|-----------|---------|-----------|-------|------|
| e-ann | (today − 1yr) 18:40 | grateful | The day I started writing again | ✓ | — | Light rain | dusk | Mapusa | beginnings |
| e02 | 2025-6-24 07:00 | peaceful | Monsoon arrives | | — | Heavy rain | dawn | home | rain |
| e03 | 2025-7-8 21:00 | dreamy | Power cut, candlelight | | — | Heavy rain | night | home | night |
| e04 | 2025-7-19 16:00 | melancholy | Old film photos | | — | Clouds | day | home | memory |
| e05 | 2025-8-15 06:00 | energized | Independence day ride | | — | Mist | dawn | the ghats | cycling |
| e06 | 2025-8-24 09:00 | grateful | Slow Sunday breakfast | | — | Clouds | day | home | food |
| e07 | 2025-9-6 17:00 | joyful | First clear sky in weeks | | — | Clear | golden | the balcony | weather |
| e08 | 2025-9-14 16:00 | loved | Tea with Dadi | ✓ | — | Clear | golden | Dadi's house | family |
| e09 | 2025-9-25 23:00 | anxious | Deadline spiral | | — | Clear night | night | the desk | work |
| e10 | 2025-10-20 20:00 | joyful | Diwali!!! the whole lane glowing | ✓ | — | Clear night | night | our lane | festival, family |
| e11 | 2025-10-9 22:00 | dreamy | Quiet terrace, cool air | | — | Clear night | night | the terrace | seasons |
| e12 | 2025-10-27 18:00 | loved | Letter from an old friend | | — | Clear | dusk | home | friends |
| e13 | 2025-11-3 05:50 | energized | Beach run before sunrise | | — | Mist | dawn | Anjuna | running, sea |
| e14 | 2025-11-16 21:00 | melancholy | Missing the old gang | | — | Clear night | night | home | friends |
| e15 | 2025-11-22 15:00 | peaceful | Bookstore afternoon | | — | Clear | day | Panaji | books |
| e16 | 2025-12-5 19:00 | joyful | The deploy finally worked | | — | Clear | dusk | the office | work, code |
| e17 | 2025-12-14 20:00 | grateful | Cold night, hot soup | | — | Clear night | night | home | food |
| e18 | 2025-12-31 23:00 | peaceful | Looking back at this year | ✓ | — | Clear night | night | home | reflection |
| e19 | 2026-1-1 10:00 | grateful | Soft start, no resolutions | | — | Mist | day | home | beginnings |
| e20 | 2026-1-11 07:00 | dreamy | Fog over the fields | | — | Mist | dawn | the fields | cycling |
| e21 | 2026-1-23 22:00 | anxious | Spiralling about nothing | | — | Clear night | night | home | mind |
| e22 | 2026-2-14 21:00 | loved | Dinner under fairy lights | ✓ | — | Clear night | night | by the river | us |
| e23 | 2026-2-21 18:00 | joyful | Small wins count | | — | Clear | dusk | the office | work |
| e24 | 2026-3-4 13:00 | joyful | Holi, colour in my hair for days | | — | Clear | day | our lane | festival |
| e25 | 2026-3-9 09:00 | grateful | Finally wrote to them | | **e14** | Clear | day | home | friends |
| e26 | 2026-4-12 12:00 | joyful | First mangoes of the season | | — | Clear | day | Mapusa market | food, seasons |
| e27 | 2026-4-25 08:00 | peaceful | The balcony garden bloomed | ✓ | — | Clear | dawn | the balcony | plants |
| e28 | 2026-5-8 18:00 | dreamy | Storm-watching from the porch | | — | Clouds | dusk | the porch | weather |
| e29 | 2026-5-19 04:00 | anxious | 3 a.m. bug, 4 a.m. fix | | — | Clear night | night | the desk | work, code |
| e30 | 2026-6-4 17:00 | peaceful | Monsoon came home again | | — | Heavy rain | golden | home | rain, seasons |
| e31 | 2026-6-10 19:00 | grateful | One year of tending this | ✓ | — | Light rain | dusk | home | milestone |

Body copy (`content`) per entry — copy verbatim:

- **e-ann:** "Bought a small notebook at the Friday market and promised myself one honest page. This whole garden began here."
- **e02:** "The first proper downpour. Sat by the window doing nothing at all, and it felt like plenty."
- **e03:** "Two hours of flickering shadows and an old playlist. The house felt like a different decade."
- **e04:** "Found the envelope from the Pune years. Everyone looks so unguarded. I miss who we were a little."
- **e05:** "Sixty kilometres of wet ghats before breakfast. Legs burning, head completely quiet."
- **e06:** "Poha, two rounds of chai, no phone. Grateful for mornings that ask nothing of me."
- **e07:** "The monsoon blinked. Everything outside looks freshly painted."
- **e08:** "She told the wedding story again, with three new details. I wrote them all down this time."
- **e09:** "Rewrote the same paragraph nine times. Tomorrow-me can have it."
- **e10:** "Sparklers with the neighbours' kids, marigolds on every door, diyas down the whole street. Absolutely over the moon tonight."
- **e11:** "October finally feels like October. The fan is off for the first time in months."
- **e12:** "An actual letter. Stamps and everything. Read it twice, then once more out loud."
- **e13:** "Anjuna at 5:40, tide out, sand hard and fast. Outran the sun by a few minutes."
- **e14:** "Group photo anniversary popped up. Everyone scattered across four cities now. Should write to them."
- **e15:** "Two hours in the secondhand shop, left with three books I did not need and absolutely needed."
- **e16:** "Green pipeline at last. Walked around the block grinning at strangers."
- **e17:** "December pretending to be winter, and I am fully playing along. Soup, blanket, contentment."
- **e18:** "Read every entry since June. The hard months grew the strangest, prettiest flowers."
- **e19:** "Just one intention this year: keep showing up to this page."
- **e20:** "Rode through cloud sitting on the ground. Could barely see ten metres and did not mind."
- **e21:** "Caught myself rehearsing arguments nobody is having with me. Wrote it down. Smaller already."
- **e22:** "The little place by the river, the corner table, the long unhurried kind of evening."
- **e23:** "Inbox zero, one good code review, an actual lunch break. Logging it so I remember it happened."
- **e24:** "Pink palms, green ears, and the whole neighbourhood laughing in the street."
- **e25:** "Took three months, but the long message went out to the old gang this morning. Some gardens just need patience."
- **e26:** "The fruit seller saved the good ones. Ate one over the sink like a person with no manners and no regrets."
- **e27:** "Every pot at once, like they coordinated. Sat with my coffee and just looked for a long time."
- **e28:** "Pre-monsoon theatre: purple sky, hot wind, the smell of rain that has not arrived yet."
- **e29:** "An off-by-one in the FX rounding, of course it was. Too wired to sleep, too tired to be smug."
- **e30:** "First rains of the season on the roof. A whole year of weather has passed over this little garden."
- **e31:** "Three hundred-odd days, thirty-one honest pages, one slightly ridiculous pumpkin. Worth every word."

Notes: only **e10** satisfies the pumpkin rule ("!!!" in title and "over the moon" in content). **e25 → e14** is the revisit thread. Six entries are favourited.

---

## 6. Time-of-day system

```js
const PHASE_ORDER = ["dawn", "day", "golden", "dusk", "night"];
const phaseFromHour = (h) => (h < 5 ? "night" : h < 7 ? "dawn" : h < 16 ? "day" : h < 18 ? "golden" : h < 20 ? "dusk" : "night");
const PHASE_PRETTY = { dawn: "Dawn", day: "Midday", golden: "Golden hour", dusk: "Dusk", night: "Night" };
```

Initial state: `useState(() => phaseFromHour(new Date().getHours()))`. Manual override via header pills.

**Crossfade technique:** for sky and ground, render one absolutely-positioned full-size div **per phase**, stacked; only the active phase has `opacity: 1`, all transition `opacity 1.6s ease`. Sun/moon use a single element each whose properties transition `all 1.8s ease`. Hills/trees transition `fill 1.6s/1.4s`. Grass container transitions `color 1.6s`. The whole meadow world div gets `filter: phase.filter` with `transition: filter 1.4s ease`. Star/firefly/pollen field containers transition `opacity 1.6s`.

### PHASES token table (use exactly)

| token | dawn | day | golden | dusk | night |
|---|---|---|---|---|---|
| label | Dawn | Day | Golden | Dusk | Night |
| sky (linear-gradient 180deg) | `#5d6f9e 0%, #9c87ab 36%, #e7b292 64%, #f7ddb6 100%` | `#9bc4e6 0%, #bedaee 46%, #e7ead3 80%, #f5edd3 100%` | `#6f7fb2 0%, #c9a386 40%, #f0bd7e 70%, #fadfae 100%` | `#33396b 0%, #5d4f86 38%, #a96f8b 66%, #e09a83 100%` | `#0a0f2a 0%, #15204a 45%, #243259 78%, #2c3d63 100%` |
| sun {x%, y%, size, core, glow, o} | 20, 64, 116, `#ffedc8`, `rgba(255,205,135,.55)`, 1 | 68, 13, 102, `#fffae6`, `rgba(255,246,205,.5)`, 1 | 81, 58, 148, `#ffd98f`, `rgba(255,178,96,.6)`, 1 | 86, 92, 148, `#ffc98a`, `rgba(255,160,110,.4)`, **0** | 86, 96, 120, `#ffc98a`, `rgba(255,160,110,.3)`, **0** |
| moon {x%, y%, o} | 80, 16, 0 | 80, 16, 0 | 18, 22, 0 | 22, 22, 0.7 | 72, 14, 1 |
| clouds (fill) | `#eec9b4` | `#ffffff` | `#f4cda1` | `#c79fb6` | `#3a4a74` |
| stars (opacity) | 0.18 | 0 | 0.1 | 0.5 | 1 |
| hills [back, mid, front] | `#a18ba3 #7e8198 #5f7077` | `#b7c9ab #8fb288 #6da267` | `#c3ad8d #9aa06b #7d8d54` | `#6e6489 #525a7c #3d4a64` | `#2c3a5e #232f4d #1a2440` |
| tree | `#4b5b60` | `#557a52` | `#5f6e40` | `#2f3b50` | `#131c30` |
| ground (linear-gradient 180deg) | `#6e8a66, #49664a` | `#7fae72, #54824e` | `#8c9c5d, #5d7544` | `#4a6053, #33473b` | `#1f3331, #152521` |
| grass | `#567c50` | `#5d9457` | `#6c8a4c` | `#3f5c46` | `#264336` |
| filter (on meadow) | `brightness(.97) saturate(.96)` | `none` | `sepia(.1) saturate(1.05) brightness(1.02)` | `brightness(.88) saturate(.92)` | `brightness(.74) saturate(.8)` |
| fire (firefly opacity) | 0 | 0 | 0.2 | 0.6 | 1 |
| pollen (opacity) | 0.35 | 1 | 1 | 0.2 | 0 |

---

## 7. Sky layer contents (inside the z-0 container, in this order)

1. **Phase gradient stack** (§6 crossfade).
2. **Stars:** 90 dots, seeded `mulberry32(777)`: `x = r()*100 %`, `y = r()*62 %`, `size = 1 + r()*1.6 px`, twinkle duration `2.2 + r()*3.4 s`, delay `-r()*5 s`. Each: round div, background `#fdf6e3`, `animation: bj-twinkle …  ease-in-out infinite`. Field container opacity = `phase.stars`.
3. **Sun:** one div. `left: sun.x%`, `top: sun.y%`, width/height `sun.size`, negative margins of `size/2` to center, `borderRadius: 50%`, `background: sun.core`, `boxShadow: 0 0 60px 30px GLOW, 0 0 140px 80px GLOW`, `opacity: sun.o`, `transition: all 1.8s ease`.
4. **Moon:** wrapper div at `moon.x/y %`, opacity `moon.o`, transition all 1.8s, `filter: drop-shadow(0 0 26px rgba(240,238,210,.45))`. Inside, a 72×72 SVG: main disc `circle r=24 fill #f2eed6` centered at (36,36); three crater circles `(28,32,r3.4)`, `(40,44,r2.4)`, `(42,28,r1.8)` in `rgba(180,176,150,.4–.5)`.
5. **Clouds:** 5 clouds, seeded `mulberry32(551)`: `top = 4 + r()*26 %`, `width = 180 + r()*150`, drift duration `90 + r()*80 s`, delay `-r()*120 s`, opacity `0.55 + r()*0.3`. Each cloud = wrapper animated with `bj-drift` (translateX from −360px to `calc(100vw + 360px)`), containing a relative box `width × 54` with **4 blurred ellipses**: child i at `left: i*22%`, `top: i%2 ? 12 : 0`, `width: cloudWidth*0.42`, `height: 38 + (i%2)*10`, `borderRadius 50%`, `background: phase.clouds` (transition 1.6s), `filter: blur(11px)`.
6. **Parallax hills** (§8).
7. **Pollen:** 14 motes, seeded `mulberry32(909)`: `x r()*100%`, `y 35 + r()*50%`, `size 2.4 + r()*2.6`, dur `9 + r()*8 s`, delay `-r()*12 s`; round div `rgba(255,250,225,.85)`, `blur(.6px)`, `bj-pollen … linear infinite`. Container opacity = `phase.pollen`.
8. **Fireflies:** 12, seeded `mulberry32(424)`: `x 6 + r()*88%`, `y 48 + r()*38%`, dur `5 + r()*6 s`, delay `-r()*8 s`; 4×4 round div `#ffe98a` with `boxShadow 0 0 10px 3px rgba(255,228,130,.65)`, `bj-fire … ease-in-out infinite`. Container opacity = `phase.fire`.

All particle containers: `pointerEvents: none`.

---

## 8. Hills & parallax

### 8.1 Hill geometry — `makeHill(seed, W, H, base, amp)`

```js
function makeHill(seed, W, H, base, amp) {
  const rng = mulberry32(seed);
  const step = 190;
  const pts = [];
  for (let x = 0; x <= W + step; x += step) pts.push([x, H - base - rng() * amp]);
  let d = `M0 ${H} L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i-1]; const [x1, y1] = pts[i];
    d += ` Q ${x0 + (x1-x0)*0.5 - step*0.28} ${y0} ${(x0+x1)/2} ${(y0+y1)/2}`;
  }
  d += ` L ${W + step} ${H} Z`;
  const yAt = (x) => {
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor(x / step)));
    const t = (x - pts[i][0]) / step;
    return pts[i][1]*(1-t) + pts[i+1][1]*t;
  };
  return { d, yAt };
}
```

H is always 340. The ridge undulates between `H − base − amp` and `H − base`.

### 8.2 Three layers (memoized on `[layout.W, vw]`)

| layer | parallax f | base | amp | seed | trees |
|---|---|---|---|---|---|
| back | 0.16 | 168 | 50 | 11 | none |
| mid | 0.32 | 116 | 64 | 23 | 4 |
| front | 0.55 | 64 | 72 | 37 | 6 |

Per layer: width `Wl = layout.W * f + vw + 500`; build with `makeHill(seed, Wl, 340, base, amp)`. Trees only when `f > 0.2`: tree RNG = `mulberry32(seed * 7)`; each tree `x = 140 + tr() * (Wl − 280)`, `y = yAt(x) + 4`, scale = front layer `0.85 + tr()*0.5`, mid layer `0.5 + tr()*0.3`.

**Tree component** (SVG group at `translate(x y) scale(sc)`): trunk `rect x −1.6, y −7, w 3.2, h 11, rx 1.4, opacity .9`; canopy three ellipses — `(0,−16, rx 12.5, ry 14)`, `(−8,−8, 7.5×8.5)`, `(8,−8, 7.5×8.5)` — all `fill = phase.tree`, each with `transition: fill 1.4s`.

### 8.3 Render & parallax

Each layer is an `<svg width={Wl} height="340">` absolutely positioned `bottom: G − 16, left: 0` (G = 150), `display: block`, `willChange: transform`, with a React ref. The hill `<path d fill={phase.hills[i]} style={{transition:"fill 1.6s ease"}}/>` then its trees.

On scroll (§13): `ref.style.transform = translateX(${-scrollLeft * f}px)` for each layer, inside one rAF.

---

## 9. World layout (memoized once, empty deps)

Constants: `MW = 560` (month width), `PL = 300`, `PR = 380` (world padding), `G = 150` (ground strip height).

1. Sort entries by `createdAt` ascending.
2. Month key `mk(d) = d.getFullYear()*12 + d.getMonth()`; collect unique sorted keys; month i gets `x = PL + i*MW`, `cx = x + MW/2`.
3. World width `W = PL + monthCount*MW + PR`.
4. Per entry, with `seed = hashString(id + title)` and `r = mulberry32(seed)` (consume in this exact order):
   - `x = PL + monthIndex*MW + 85 + r() * (MW − 180)`
   - `depth = r()` → `yB = 16 + depth*72` (bottom offset within ground strip)
   - `words = content.split(/\s+/).length`
   - `scale = (1.16 − depth*0.46) * (0.9 + (min(words,60)/60)*0.22) * (isFavourited ? 1.12 : 1)`
   - pumpkin test (§5.2) → `bloom`
   - `z = 100 + round((1 − depth)*40)`
   - `lean = (r() − 0.5) * 9` degrees
   - `sway = 3.8 + r()*3.2` s; `delay = −r()*6` s
   - `fade = 0.8 + (chronoIndex / entryCount) * 0.2` (older entries slightly faded — the "wilt")

Return `{ entries: placed, months, W, MW, PL }`.

---

## 10. Meadow scroller contents

Scroller div: `position absolute inset 0, zIndex 10, overflowX auto, overflowY hidden, scrollbarWidth none` + `.bj-scroll::-webkit-scrollbar{display:none}`; cursor `grab`/`grabbing`. Inside: one world div `width: layout.W, height: 100%`, `filter: phase.filter`, `transition: filter 1.4s ease`, containing in order:

1. **Ground:** per-phase stacked divs (crossfade), each `bottom 0, width 100%, height G`, `background: phase.ground`.
2. **Month labels:** per month at `left: cx, bottom: G − 34, translateX(−50%)`, pointer-events none, opacity `1` when active month else `.55` (transition .5s). Line 1: month name — sans 11px / 700 / letterSpacing 4 / uppercase / `rgba(250,246,232,.85)` / textShadow `0 1px 8px rgba(20,30,25,.35)`. Line 2: year — serif italic 13px `rgba(250,246,232,.6)`.
3. **Grass:** container `inset 0, color: phase.grass, transition color 1.6s, pointerEvents none`. Count = `floor(W / 46)`, seeded `mulberry32(212)`: `left = i*46 + r()*30`, `bottom = r()*26`, `scale = 0.7 + r()*0.75`, sway dur `2.6 + r()*2.4 s`, delay `−r()*4 s`, `z = 100 + round((26 − bottom)*1.8)`. **GrassTuft:** positioned div (transformOrigin bottom center, scaled) containing a 26×34 SVG (`overflow: visible`, animation `bj-grass dur delay ease-in-out infinite alternate`, transformOrigin `13px 34px`) with three `currentColor` stroked blades (strokeWidth 2.4–2.6, round caps): `M13 34 C 12 22 9 14 5 8`, `M13 34 C 13.5 20 14 12 14.5 5`, `M13 34 C 15 24 18 16 22 11`.
4. **Flowers** (§12).

---

## 11. Bloom species (procedural SVG)

### 11.1 Shared frame

`FlowerArt({entry})` renders `<svg viewBox="0 0 120 170" width=120 height=170 style={{overflow:"visible", display:"block"}}>` wrapping `<g transform={rotate(lean, 60, 170)}>` around the species. The plant is anchored at **(60, 170)** = soil point. Species switch on `entry.bloom`; dahlia also receives `mood`.

Shared parts:

```jsx
const Leaf = ({x,y,angle,size,fill}) => (
  <path d={`M0 0 Q ${size*0.85} ${-size*0.45} ${size*1.6} 0 Q ${size*0.85} ${size*0.45} 0 0Z`}
        fill={fill} opacity="0.95" transform={`translate(${x} ${y}) rotate(${angle})`} />
);
const Stem = ({bend=0, topY=58, color="#5d7d4e", width=3.6}) => (
  <path d={`M60 170 C ${60+bend} 132 ${60-bend*0.7} 96 60 ${topY}`}
        stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />
);
const PETAL     = "M0 -7 C 7 -13 7 -29 0 -35 C -7 -29 -7 -13 0 -7Z";
const PETAL_TIP = "M0 -24 C 4 -27 4 -33 0 -35 C -4 -33 -4 -27 0 -24Z";
```

Every species opens its own RNG: `const r = mulberry32(s ^ MASK)`.

### 11.2 Daisy — joyful — MASK `0xd1`

Head center `(60, 50)`. `n = 11 + floor(r()*4)` petals. Tip accent: 30% chance `#f6c9d4` (pink) else `#fbecc4`. Pre-draw an **under-ring**: n petals using PETAL, fill `#ecd9ad`, each `rotate((i+0.5)*(360/n))` and `scale(.92)` (peeks between top petals). Then n **top petals**: group rotated `i*(360/n) + jitter` where jitter per petal = `(r()−0.5)*6` (precompute all jitters in one pass), containing PETAL in `#fdf8ec` plus PETAL_TIP in the tip color at opacity .85. Center: disc `r 9 #eeb23f`, highlight circle `(−2.4,−2.4) r 5.2 #f7d27e`, and 7 dots on a ring radius 6.4, `r 1.1 #c98e2c`. Stem `bend (r()−0.5)*14, topY cy+12`; leaves at `(56,136, rot 203, size 14, #5d7d4e)` and `(63,116, rot −24, size 12, #6a8e5a)`.

### 11.3 Lavender — peaceful & dreamy — MASK `0xa5`

A spike of `n = 13 + floor(r()*5)` buds. For bud i: `t = i/(n−1)`, `y = 96 − t*60`, alternate `side = i%2 ? 1 : −1`, `x = 60 + side*(6.5 − 4.5t) + (r()−0.5)*2`. Color `lerpColor("#c3a8e3", "#7a58b0", min(1, t*0.9 + r()*0.15))` — darker toward the tip. Each bud: ellipse `rx max(2.4, 4.6 − 1.8t)`, `ry max(3.4, 6.2 − 2.2t)`, rotated `side*34°` about its own center. Tip bud: ellipse `(60,33) 3×4.6 #6b4aa0`. Stem `bend 2 + (r()−0.5)*4, topY 96, width 3.2, color #5e7f50`; leaves `(57,134,205,13,#5e7f50)`, `(63,117,−22,11,#69905b)`.

### 11.4 Rose — loved — MASK `0x90`

Head at `(60, 48)`. Petal path: `M0 2 C 9 0 13 -11 6 -18 C 2 -21 -2 -21 -6 -18 C -13 -11 -9 0 0 2Z`, stroke `rgba(120,20,50,.18)` width .6. Three concentric rings (count, scale, fill, rotation offset): **outer** 6 petals, 1.18, `#e2798f`, offset `r()*30`; **mid** 5, 0.86, `#d4587a`, offset `32 + r()*20`; **inner** 4, 0.56, `#bf3f63`, offset 75. Core: circle `r 4.6 #a92f52` plus a spiral hint `M-2.4 -0.6 a2.8 2.8 0 1 0 4.4 1.4` stroked `#8c2342` width 1.3. Two sepal Leafs inside the head group at `(−4,17, rot 150)` and `(4,17, rot 30)`, size 12, `#52764a`. Stem `bend (r()−0.5)*12, topY cy+16, #5c7d4d`; leaves `(55,130,208,15,#52764a)`, `(64,108,−20,13,#5d8252)`.

### 11.5 Bluebell — melancholy — MASK `0xb7`

Arching stem (replaces Stem): path `M60 170 C 57 126 50 88 66 62 C 72 53 80 49 89 47`, stroke `#5e7f50` width 3.2 round. Leaves `(56,138,206,15,#557a4d)`, `(61,114,−26,12,#618655)`. Bell shape: `M0 0 C -6.5 2 -8 10 -6.5 16 L -8 21 L -4 18 L 0 22 L 4 18 L 8 21 L 6.5 16 C 8 10 6.5 2 0 0Z` — fill `#7e90d6`, stroke `#5d6cb8` width .9, drawn at `translate(0 -5)`. Four hanging bells at fixed `(x, y, scale)`: `(66,74,.95) (74,63,.85) (82,55,.74) (88,50,.6)`; each gets a tiny pedicel stroke `M0 -6 C -1.5 -9 -2.5 -11 -3.5 -13` and the bell group rotated `4 + r()*10` degrees.

### 11.6 Dahlia — energized & anxious — MASK `0xda`

Head `(60, 50)`. Spiky petal: `M0 -6 C 5.5 -12 4 -26 0 -31 C -4 -26 -5.5 -12 0 -6Z`. Palette: anxious → outer `#c96d9b`, inner `#ad4279`; energized → outer `#ef8b4d`, inner `#dd5f37`. **15 outer** petals: rotate `i*(360/15) + (r()−0.5)*5`, scale 1.05, stroke `rgba(90,25,15,.22)` width .5. **11 inner**: rotate `i*(360/11) + 16`, scale .66, no stroke. Center disc `r 5.4 #7c2c1c` with 5 gold dots `r 1 #f2c14e` on radius-3 ring (angles `(i/5)·2π + 0.5`). Stem `bend (r()−0.5)*16, topY cy+12, #5c7d4d`; leaves `(55,132,206,14,#54784b)`, `(64,110,−22,12,#5f8453)`.

### 11.7 Tulip — grateful — MASK `0x70`

Head `(60, 46)`. Palettes (pick one with `r()`): `["#ef9a4e","#e07b3a"]`, `["#e87f9a","#d65f80"]`, `["#f0c04e","#dfa238"]` as `[main, dark]`. Cup: `M-13 16 C -15 -6 -8 -20 0 -22 C 8 -20 15 -6 13 16 C 8 21 -8 21 -13 16Z` in main; two side-petal shadows in dark: `M-13 15 C -14 -2 -10 -14 -3 -19 C -5 -4 -5 8 -3 17Z` and its x-mirrored twin. Stem `bend (r()−0.5)*8, topY cy+24, #5d8050`. Two broad blade leaves as filled paths: `M58 168 C 44 146 40 118 50 92 C 52 116 55 140 60 162Z` (`#587a4b`) and `M62 168 C 76 148 79 122 70 98 C 69 122 65 144 60 162Z` (`#618655`).

### 11.8 Pumpkin — easter egg — no RNG

Ground vine instead of a stem: `M60 170 C 46 160 36 158 22 162` stroke `#5e7f50` width 3; curly tendril `M44 158 c -2 -8 6 -10 8 -4 c 1.6 4 -3 7 -5 4` stroke `#6b8e5c` width 1.6; Leaf `(28,156,195,15,#557a4d)`. Body group at `translate(72 150)`: warm glow `circle r 27 rgba(255,190,90,.16)`; two side lobes `ellipse (±9, 0) 10×13 #d97a22`; center lobe `ellipse 11.5×14 #ef9433`; highlight `ellipse (−3.4,−4.5) 4×6 rgba(255,228,165,.4)`; stalk `M-2 -13 C -2 -19 4 -21 5.5 -17.5 L 3 -12Z #74934e`; two four-point sparkles — `M11 -23 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6Z` fill `#ffe49a`, and a smaller one at `(−17,−17)` (same diamond construction with 1/2.2 arms) fill `#ffe9b0` opacity .9.

---

## 12. Flower instance rendering (the planted button)

Each placed entry renders a `<button>`:

- `position absolute; left: e.x; bottom: e.yB; width 120; height 170; marginLeft: −60` (anchors the soil point on `e.x`); no border/background/padding; `cursor pointer`; `zIndex: hovered ? 200 : e.z`; `transform: scale(e.scale)` with `transformOrigin: bottom center`; `opacity: e.fade`; `WebkitTapHighlightColor: transparent`; `aria-label = "{title}, {fmtFull(date)}"`.
- `onClick`: if `drag.current.moved > 6` do nothing (drag suppression), else open the modal.
- `onMouseEnter/Leave` maintain `hovered` id.

Children, in order:

1. **Ground shadow:** ellipse div at `left 50%, bottom −4, 64×14, translateX(−50%)`, `radial-gradient(ellipse, rgba(15,35,20,.28), transparent 70%)`.
2. **Favourite halo** (if favourited): `left 50%, top 22, 110×110, translateX(−50%), borderRadius 50%`, `radial-gradient(circle, rgba(255,219,140,.4), transparent 68%)`, pointer-events none.
3. **Bloom-in wrapper:** `animation: bj-bloom .9s cubic-bezier(.18,.9,.32,1.2) both` with `animationDelay: 0.15 + i*0.04 s` (i = render index → staggered planting), transformOrigin bottom center. Inside it, a **hover-scale wrapper** (`transform: hovered ? scale(1.07) : scale(1)`, transition .35s, origin bottom center), inside that the **sway wrapper** (`animation: bj-sway {e.sway}s ease-in-out infinite alternate; animationDelay: {e.delay}s; transformOrigin: 60px 170px`), containing `<FlowerArt entry={e}/>`.
4. **Anniversary sparkles** (if entry date is today's day+month from a past year): two `✦` spans — `(left 16, top 28, 13px, #ffe49a, textShadow 0 0 8px rgba(255,220,140,.8), bj-spark 3.2s)` and `(right 18, top 50, 9px, #ffe9b0, bj-spark 2.6s delay 1.1s)`.
5. **Hover tooltip** (if hovered): pill at `left 50%, top −6, translate(−50%, −100%)`, `whiteSpace nowrap`, bg `rgba(251,246,236,.96)`, border `1px #e3d6bd`, radius 999, padding `5px 14px`, shadow `0 6px 18px rgba(25,35,30,.22)`, pointer-events none. Contents: title (serif italic 14, `#3d4438`) + short date (sans 10.5 / 700, `#8a8270`, marginLeft 8).

---

## 13. Interactions & scroll plumbing

- **Refs:** `scrollerRef`, three `hillRefs`, `drag = useRef({down:false, x:0, sl:0, moved:0})`, `ticking = useRef(false)`.
- **Initial mount:** `scroller.scrollLeft = scroller.scrollWidth` (open at the most recent month), call `syncScroll()` once; attach a window resize listener that updates `vw` state.
- **syncScroll():** read `scrollLeft`; for each hill layer set `translateX(−scrollLeft * f)` directly on the ref; compute `mi = round((scrollLeft + innerWidth/2 − PL − MW/2) / MW)`, clamp to month range, and `setActiveMonth` only if changed.
- **onScroll:** rAF-throttle via `ticking` then call `syncScroll`.
- **onWheel:** if `|deltaY| > |deltaX|`, add `deltaY` to `scrollLeft` (vertical wheel pans horizontally).
- **Drag-to-pan (mouse only):** `onPointerDown` (button 0, pointerType mouse) record `{x: clientX, sl: scrollLeft, moved: 0}`, set grabbing. `onPointerMove`: `scrollLeft = sl − (clientX − x)`; track `moved = max(moved, |dx|)`. `onPointerUp/Leave`: end drag. Flower clicks check `moved > 6` to suppress click-after-drag.
- **scrollToX(x):** smooth-scroll so x is centered: `scrollTo({ left: max(0, x − innerWidth/2), behavior: "smooth" })`.
- **visitEntry(e):** `scrollToX(e.x)` then open the modal after 650 ms.

---

## 14. Rain overlay

State `weather: "clear" | "rain"`. Overlay div: `inset 0, zIndex 20, pointerEvents none, opacity rain?1:0, transition opacity 1s`. Inside: dim wash `inset 0, background rgba(70,92,122,.16)`; then a tilted field `inset: -10% 0, transform: rotate(7deg)` holding **70 drops** seeded `mulberry32(313)`: `left r()*100%`, `height 22 + r()*26`, fall duration `0.85 + r()*0.65 s`, delay `−r()*2 s`; each drop is a 1.5px-wide div, `linear-gradient(to bottom, transparent, rgba(205,220,240,.55))`, animation `bj-rain … linear infinite` **only while raining** (set `animation: none` when clear so drops don't run hidden).

---

## 15. Header (z 50)

Flex row, space-between, `padding 18px 22px`, container pointer-events none; each side re-enables `pointerEvents: auto`.

- **Left brand:** "Bloom" — serif italic 500, 30px, `#faf6e9`, textShadow `0 2px 16px rgba(15,25,35,.45)`. Below: `a living journal · {N} memories` — sans 10.5/700, letterSpacing 2.6, uppercase, `rgba(250,246,233,.78)`.
- **Right controls** (flex, gap 8, wrap, justify-end):
  - **Phase segmented control:** glass pill (`borderRadius 999, padding 4`) of 5 buttons, labels from PHASES. Button: radius 999, `padding 6px 11px`, sans 10/800, letterSpacing 1.4, uppercase; active = bg `#f3ecd9` + color `#2c3328`, inactive = transparent + `rgba(247,241,227,.85)`; transition all .3s.
  - **Rain toggle:** glass pill button, `padding 6px 14px`, icon + label ("Rain"/"Clear"), same active styling when raining. **SunIcon** (12×12, stroke currentColor 2.4, round caps): circle r 4.4 + 8 rays. **RainIcon** (12×12, stroke 2.2): cloud path `M6 13a5 5 0 1 1 1-9.9A6 6 0 0 1 18.5 6 4.5 4.5 0 0 1 18 13H6Z` + three slanted drops.

---

## 16. "This day in your garden" replay (z 52)

On mount: find entries where `date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() < today.getFullYear()`; if any, take the most recent and `setReplay` after **1100 ms**. (The dynamic `e-ann` guarantees a hit.) Hidden while the memory modal is open.

Banner: centered at `top 86`, width `min(420px, 100vw − 36px)`, entry animation `bj-replay .7s ease both`. Card: bg `rgba(251,246,236,.97)`, border `#e6d9bf`, radius 16, padding `14px 16px`, shadow `0 14px 40px rgba(20,30,28,.3)`. Row 1: `✦ This day in your garden` (sans 10/800, letterSpacing 2.2, uppercase, `#a98c4a`) + ✕ dismiss. Row 2: "{title}" in curly quotes — serif italic 19, `#3a4136`. Row 3 (sans 11.5, `#8b8370`): `{agoLabel} · {PHASE_PRETTY[timePhase]} · {weather.toLowerCase()} · {place}`. Button **"Visit this memory"**: border `#d8c9a4`, bg `#f0e6cd`, text `#5c5236`, pill, sans 11/800 uppercase — calls `visitEntry(replay)` then dismisses.

---

## 17. Timeline scrubber (z 50)

Centered at `bottom 14`, `maxWidth calc(100vw − 28px)`. Glass pill (`padding 7px 14px`, horizontal overflow auto, scrollbar hidden) of one button per month: a dot (5px, or 7px when active) above an abbreviation label (sans 9/800, letterSpacing 1.1, uppercase). Label shows `MONTH_ABBR` plus ` 'YY` only when the month is January or it's the first chip. Color: active `#ffe1a0`, inactive `rgba(247,241,227,.62)`, transition .3s. Click → `scrollToX(month.cx)`.

**Hint text** (z 50): bottom-left at `bottom 76, left 22` — serif italic 14, `rgba(250,246,233,.72)`, textShadow, pointer-events none: `drag to wander · tap a bloom to remember`.

---

## 18. Memory card modal (z 60)

Backdrop: `inset 0, background rgba(12,16,24,.22), backdropFilter blur(2px)`, flex `align-items flex-end, justify-content center`, `padding 0 16px 92px` (card floats above the scrubber). Click backdrop closes; card `stopPropagation`.

Card: `width min(440px, 100%)`, bg `#fbf6ec`, border `#e6d9bf`, radius 20, padding `20px 22px 18px`, shadow `0 24px 70px rgba(15,22,20,.4)`, animation `bj-card .45s cubic-bezier(.2,.8,.3,1) both`. Contents in order:

1. **Top row:** mood chip (9px dot in `MOODS[mood].chip`) + mood label (sans 10.5/800, letterSpacing 2, uppercase, `#7d7561`); `♥` in `#d4a23c` if favourited; `🎃` if `bloom === "pumpkin"`; ✕ close on the right.
2. **Title:** serif 500, 26px, lineHeight 1.15, `#33392f`.
3. **Date line** (sans 11.5, `#8b8370`): `{fmtFull} · {agoLabel}` plus ` ✦` if anniversary.
4. **Journal text:** serif italic 17.5, lineHeight 1.55, `#474e42`, with a left rule `2px solid #e3d3ac` and `paddingLeft 14`.
5. **Snapshot line** (sans 10.5/700, letterSpacing 1.6, uppercase, `#a39a83`, marginTop 14): `{PHASE_PRETTY[timePhase]} · {weather} · {place}`.
6. **Tags:** pill chips `#{tag}` — sans 10.5/700, `#6f7a64` on `#eee6d0`, border `#e0d3b3`.
7. **Revisit thread links** (sans 12/700, `#8a6f3c`, plain text buttons): if this entry has `revisitOf`, show `↩ revisits "{parent title}"` (opens parent). For every entry whose `revisitOf` points here, show `↪ revisited on {fmtShort} — "{child title}"` (opens child).

---

## 19. Grain & vignette finish

```jsx
<svg style={{position:"absolute", inset:0, zIndex:70, width:"100%", height:"100%", opacity:0.05, mixBlendMode:"multiply", pointerEvents:"none"}}>
  <filter id="bj-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/></filter>
  <rect width="100%" height="100%" filter="url(#bj-grain)"/>
</svg>
<div style={{position:"absolute", inset:0, zIndex:65, pointerEvents:"none",
  background:"radial-gradient(ellipse at center, transparent 58%, rgba(18,22,30,.2) 100%)"}}/>
```

(This single filter id is allowed — it renders exactly once.)

---

## 20. Date helpers

```js
const MONTH_NAMES = ["January", …, "December"];
const MONTH_ABBR  = ["Jan", …, "Dec"];
const fmtFull  = (d) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
const fmtShort = (d) => `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
```

`agoLabel(d)`: if same day+month and ≥1 year ago → `"{n} year(s) ago today"`; else by month difference: `≤0 → "this month"`, `1 → "last month"`, `<12 → "{m} months ago"`, else `"{y}y {m}m ago"`. `isAnniv(d)`: same day+month, earlier year.

---

## 21. Component state summary

```js
phaseKey   // one of PHASE_ORDER, init from clock
weather    // "clear" | "rain"
active     // entry open in modal, or null
hovered    // entry id under cursor, or null
activeMonth// index for labels + scrubber
replay     // replay candidate entry, or null
vw         // window.innerWidth (state, updated on resize)
grabbing   // drag-cursor flag
```

---

## 22. Keyframes & global CSS (copy verbatim into the injected `<style>`)

```css
.bj-scroll::-webkit-scrollbar{display:none}
@keyframes bj-sway{0%{transform:rotate(-1.7deg)}100%{transform:rotate(1.9deg)}}
@keyframes bj-grass{0%{transform:rotate(-3deg)}100%{transform:rotate(3deg)}}
@keyframes bj-bloom{0%{transform:scale(0);opacity:0}62%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
@keyframes bj-drift{from{transform:translateX(-360px)}to{transform:translateX(calc(100vw + 360px))}}
@keyframes bj-twinkle{0%,100%{opacity:.12}50%{opacity:.95}}
@keyframes bj-pollen{0%{transform:translate(0,0);opacity:0}12%{opacity:.7}85%{opacity:.45}100%{transform:translate(80px,-140px);opacity:0}}
@keyframes bj-fire{0%,100%{transform:translate(0,0);opacity:.1}28%{opacity:.95}52%{transform:translate(26px,-22px);opacity:.55}76%{opacity:.9}}
@keyframes bj-rain{from{transform:translateY(-14vh)}to{transform:translateY(112vh)}}
@keyframes bj-card{from{opacity:0;transform:translateY(18px) scale(.975)}to{opacity:1;transform:none}}
@keyframes bj-spark{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-7px);opacity:1}}
@keyframes bj-replay{from{opacity:0;transform:translate(-50%,-14px)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion: reduce){*{animation-duration:.01s !important;animation-iteration-count:1 !important;transition-duration:.01s !important}}
```

---

## 23. Acceptance checklist

1. Opens at the most recent month; sky matches the local clock's phase.
2. Switching phase pills crossfades sky, ground, hills, trees, grass color and meadow filter over ~1.6s; sun/moon glide; stars/fireflies/pollen fade to their per-phase opacities.
3. 31 flowers in monthly clusters Jun '25 → Jun '26; reloading produces identical flowers (determinism).
4. The Diwali entry (e10) is a pumpkin with sparkles; no other entry is.
5. Six favourites have golden halos and are visibly larger; one entry (e-ann) carries ✦ anniversary sparkles **today**.
6. Vertical mouse-wheel pans horizontally; click-dragging pans; a drag of >6px never opens a card on release.
7. Hovering a bloom raises it slightly and shows the title+date pill; tapping opens the parchment card with mood chip, italic content, snapshot line, tags.
8. Opening e25 shows `↩ revisits "Missing the old gang"`; opening e14 shows `↪ revisited on 9 Mar '26 — "Finally wrote to them"`. The links navigate between them.
9. The replay banner appears ~1s after load quoting e-ann ("1 year ago today"); "Visit this memory" scrolls to it and opens the card.
10. Rain toggle: 70 slanted drops + blue dim fade in/out over 1s; drops don't animate while hidden.
11. Hills move at 0.16/0.32/0.55 of scroll speed with no React re-render per scroll frame.
12. Month scrubber tracks the centered month while scrolling; clicking a chip smooth-scrolls there.
13. Grain + vignette visible over everything; reduced-motion users get a static scene.

## 24. Pitfalls (read before coding)

- JS `Date` months are **0-based**; the table in §5.3 is written 1-based.
- The flower button needs `marginLeft: −60` — without it, blooms anchor off-center and drift from their tooltips.
- Sway must pivot at the soil point: `transformOrigin: "60px 170px"` on the sway wrapper, and `rotate(lean, 60, 170)` inside the SVG.
- Don't store scroll position in state; only `activeMonth` (and only when it changes).
- Set `overflow: visible` on flower and grass SVGs or petals/blades clip.
- Stacked-div crossfades need every phase's div present at all times (only opacity changes); conditionally rendering them breaks the fade.
- Consume PRNG values in the documented order; reordering changes every flower.
