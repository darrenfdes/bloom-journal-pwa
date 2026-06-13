import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

/* ============================================================
   BLOOM — living meadow prototype
   A single-file sketch of the Bloom Journal garden:
   · deterministic procedural blooms from entry data (seed → flower)
   · 7 species: daisy, lavender, rose, bluebell, dahlia, tulip + pumpkin egg
   · 5 time-of-day palettes (auto from clock, manual override)
   · parallax hills, drifting clouds, stars, fireflies, pollen, rain
   · monthly clusters, favourites halo, anniversary sparkle,
     revisit threads, "this day in your garden" replay card
   ============================================================ */

/* ---------- deterministic helpers ---------- */
const hashString = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerpColor = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

/* ---------- moods ---------- */
const MOODS = {
  joyful: { label: "Joyful", chip: "#e2a23b", bloom: "daisy" },
  peaceful: { label: "Peaceful", chip: "#8d80c2", bloom: "lavender" },
  dreamy: { label: "Dreamy", chip: "#7da4c8", bloom: "lavender" },
  loved: { label: "Loved", chip: "#d4708f", bloom: "rose" },
  melancholy: { label: "Melancholy", chip: "#7488ba", bloom: "bluebell" },
  energized: { label: "Energized", chip: "#dd7440", bloom: "dahlia" },
  anxious: { label: "Anxious", chip: "#b56f9f", bloom: "dahlia" },
  grateful: { label: "Grateful", chip: "#c98a40", bloom: "tulip" },
};

/* ---------- time-of-day palettes ---------- */
const PHASE_ORDER = ["dawn", "day", "golden", "dusk", "night"];
const PHASES = {
  dawn: {
    label: "Dawn",
    sky: "linear-gradient(180deg,#5d6f9e 0%,#9c87ab 36%,#e7b292 64%,#f7ddb6 100%)",
    sun: { x: 20, y: 64, size: 116, core: "#ffedc8", glow: "rgba(255,205,135,.55)", o: 1 },
    moon: { x: 80, y: 16, o: 0 },
    clouds: "#eec9b4",
    stars: 0.18,
    hills: ["#a18ba3", "#7e8198", "#5f7077"],
    tree: "#4b5b60",
    ground: "linear-gradient(180deg,#6e8a66,#49664a)",
    grass: "#567c50",
    filter: "brightness(.97) saturate(.96)",
    fire: 0,
    pollen: 0.35,
  },
  day: {
    label: "Day",
    sky: "linear-gradient(180deg,#9bc4e6 0%,#bedaee 46%,#e7ead3 80%,#f5edd3 100%)",
    sun: { x: 68, y: 13, size: 102, core: "#fffae6", glow: "rgba(255,246,205,.5)", o: 1 },
    moon: { x: 80, y: 16, o: 0 },
    clouds: "#ffffff",
    stars: 0,
    hills: ["#b7c9ab", "#8fb288", "#6da267"],
    tree: "#557a52",
    ground: "linear-gradient(180deg,#7fae72,#54824e)",
    grass: "#5d9457",
    filter: "none",
    fire: 0,
    pollen: 1,
  },
  golden: {
    label: "Golden",
    sky: "linear-gradient(180deg,#6f7fb2 0%,#c9a386 40%,#f0bd7e 70%,#fadfae 100%)",
    sun: { x: 81, y: 58, size: 148, core: "#ffd98f", glow: "rgba(255,178,96,.6)", o: 1 },
    moon: { x: 18, y: 22, o: 0 },
    clouds: "#f4cda1",
    stars: 0.1,
    hills: ["#c3ad8d", "#9aa06b", "#7d8d54"],
    tree: "#5f6e40",
    ground: "linear-gradient(180deg,#8c9c5d,#5d7544)",
    grass: "#6c8a4c",
    filter: "sepia(.1) saturate(1.05) brightness(1.02)",
    fire: 0.2,
    pollen: 1,
  },
  dusk: {
    label: "Dusk",
    sky: "linear-gradient(180deg,#33396b 0%,#5d4f86 38%,#a96f8b 66%,#e09a83 100%)",
    sun: { x: 86, y: 92, size: 148, core: "#ffc98a", glow: "rgba(255,160,110,.4)", o: 0 },
    moon: { x: 22, y: 22, o: 0.7 },
    clouds: "#c79fb6",
    stars: 0.5,
    hills: ["#6e6489", "#525a7c", "#3d4a64"],
    tree: "#2f3b50",
    ground: "linear-gradient(180deg,#4a6053,#33473b)",
    grass: "#3f5c46",
    filter: "brightness(.88) saturate(.92)",
    fire: 0.6,
    pollen: 0.2,
  },
  night: {
    label: "Night",
    sky: "linear-gradient(180deg,#0a0f2a 0%,#15204a 45%,#243259 78%,#2c3d63 100%)",
    sun: { x: 86, y: 96, size: 120, core: "#ffc98a", glow: "rgba(255,160,110,.3)", o: 0 },
    moon: { x: 72, y: 14, o: 1 },
    clouds: "#3a4a74",
    stars: 1,
    hills: ["#2c3a5e", "#232f4d", "#1a2440"],
    tree: "#131c30",
    ground: "linear-gradient(180deg,#1f3331,#152521)",
    grass: "#264336",
    filter: "brightness(.74) saturate(.8)",
    fire: 1,
    pollen: 0,
  },
};
const phaseFromHour = (h) => (h < 5 ? "night" : h < 7 ? "dawn" : h < 16 ? "day" : h < 18 ? "golden" : h < 20 ? "dusk" : "night");
const PHASE_PRETTY = { dawn: "Dawn", day: "Midday", golden: "Golden hour", dusk: "Dusk", night: "Night" };

/* ---------- sample journal ---------- */
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildEntries() {
  const t = new Date();
  const ann = new Date(t.getFullYear() - 1, t.getMonth(), t.getDate(), 18, 40);
  const E = (id, title, content, mood, tags, date, o = {}) => ({
    id, title, content, mood, tags,
    createdAt: date,
    isFavourited: !!o.fav,
    revisitOf: o.revisitOf || null,
    weather: o.w || "Clear",
    timePhase: o.tp || "day",
    place: o.pl || "home",
  });
  return [
    E("e-ann", "The day I started writing again", "Bought a small notebook at the Friday market and promised myself one honest page. This whole garden began here.", "grateful", ["beginnings"], ann, { fav: 1, w: "Light rain", tp: "dusk", pl: "Mapusa" }),
    E("e02", "Monsoon arrives", "The first proper downpour. Sat by the window doing nothing at all, and it felt like plenty.", "peaceful", ["rain"], new Date(2025, 5, 24, 7), { w: "Heavy rain", tp: "dawn", pl: "home" }),
    E("e03", "Power cut, candlelight", "Two hours of flickering shadows and an old playlist. The house felt like a different decade.", "dreamy", ["night"], new Date(2025, 6, 8, 21), { w: "Heavy rain", tp: "night", pl: "home" }),
    E("e04", "Old film photos", "Found the envelope from the Pune years. Everyone looks so unguarded. I miss who we were a little.", "melancholy", ["memory"], new Date(2025, 6, 19, 16), { w: "Clouds", tp: "day", pl: "home" }),
    E("e05", "Independence day ride", "Sixty kilometres of wet ghats before breakfast. Legs burning, head completely quiet.", "energized", ["cycling"], new Date(2025, 7, 15, 6), { w: "Mist", tp: "dawn", pl: "the ghats" }),
    E("e06", "Slow Sunday breakfast", "Poha, two rounds of chai, no phone. Grateful for mornings that ask nothing of me.", "grateful", ["food"], new Date(2025, 7, 24, 9), { w: "Clouds", tp: "day", pl: "home" }),
    E("e07", "First clear sky in weeks", "The monsoon blinked. Everything outside looks freshly painted.", "joyful", ["weather"], new Date(2025, 8, 6, 17), { w: "Clear", tp: "golden", pl: "the balcony" }),
    E("e08", "Tea with Dadi", "She told the wedding story again, with three new details. I wrote them all down this time.", "loved", ["family"], new Date(2025, 8, 14, 16), { fav: 1, w: "Clear", tp: "golden", pl: "Dadi's house" }),
    E("e09", "Deadline spiral", "Rewrote the same paragraph nine times. Tomorrow-me can have it.", "anxious", ["work"], new Date(2025, 8, 25, 23), { w: "Clear night", tp: "night", pl: "the desk" }),
    E("e10", "Diwali!!! the whole lane glowing", "Sparklers with the neighbours' kids, marigolds on every door, diyas down the whole street. Absolutely over the moon tonight.", "joyful", ["festival", "family"], new Date(2025, 9, 20, 20), { fav: 1, w: "Clear night", tp: "night", pl: "our lane" }),
    E("e11", "Quiet terrace, cool air", "October finally feels like October. The fan is off for the first time in months.", "dreamy", ["seasons"], new Date(2025, 9, 9, 22), { w: "Clear night", tp: "night", pl: "the terrace" }),
    E("e12", "Letter from an old friend", "An actual letter. Stamps and everything. Read it twice, then once more out loud.", "loved", ["friends"], new Date(2025, 9, 27, 18), { w: "Clear", tp: "dusk", pl: "home" }),
    E("e13", "Beach run before sunrise", "Anjuna at 5:40, tide out, sand hard and fast. Outran the sun by a few minutes.", "energized", ["running", "sea"], new Date(2025, 10, 3, 5, 50), { w: "Mist", tp: "dawn", pl: "Anjuna" }),
    E("e14", "Missing the old gang", "Group photo anniversary popped up. Everyone scattered across four cities now. Should write to them.", "melancholy", ["friends"], new Date(2025, 10, 16, 21), { w: "Clear night", tp: "night", pl: "home" }),
    E("e15", "Bookstore afternoon", "Two hours in the secondhand shop, left with three books I did not need and absolutely needed.", "peaceful", ["books"], new Date(2025, 10, 22, 15), { w: "Clear", tp: "day", pl: "Panaji" }),
    E("e16", "The deploy finally worked", "Green pipeline at last. Walked around the block grinning at strangers.", "joyful", ["work", "code"], new Date(2025, 11, 5, 19), { w: "Clear", tp: "dusk", pl: "the office" }),
    E("e17", "Cold night, hot soup", "December pretending to be winter, and I am fully playing along. Soup, blanket, contentment.", "grateful", ["food"], new Date(2025, 11, 14, 20), { w: "Clear night", tp: "night", pl: "home" }),
    E("e18", "Looking back at this year", "Read every entry since June. The hard months grew the strangest, prettiest flowers.", "peaceful", ["reflection"], new Date(2025, 11, 31, 23), { fav: 1, w: "Clear night", tp: "night", pl: "home" }),
    E("e19", "Soft start, no resolutions", "Just one intention this year: keep showing up to this page.", "grateful", ["beginnings"], new Date(2026, 0, 1, 10), { w: "Mist", tp: "day", pl: "home" }),
    E("e20", "Fog over the fields", "Rode through cloud sitting on the ground. Could barely see ten metres and did not mind.", "dreamy", ["cycling"], new Date(2026, 0, 11, 7), { w: "Mist", tp: "dawn", pl: "the fields" }),
    E("e21", "Spiralling about nothing", "Caught myself rehearsing arguments nobody is having with me. Wrote it down. Smaller already.", "anxious", ["mind"], new Date(2026, 0, 23, 22), { w: "Clear night", tp: "night", pl: "home" }),
    E("e22", "Dinner under fairy lights", "The little place by the river, the corner table, the long unhurried kind of evening.", "loved", ["us"], new Date(2026, 1, 14, 21), { fav: 1, w: "Clear night", tp: "night", pl: "by the river" }),
    E("e23", "Small wins count", "Inbox zero, one good code review, an actual lunch break. Logging it so I remember it happened.", "joyful", ["work"], new Date(2026, 1, 21, 18), { w: "Clear", tp: "dusk", pl: "the office" }),
    E("e24", "Holi, colour in my hair for days", "Pink palms, green ears, and the whole neighbourhood laughing in the street.", "joyful", ["festival"], new Date(2026, 2, 4, 13), { w: "Clear", tp: "day", pl: "our lane" }),
    E("e25", "Finally wrote to them", "Took three months, but the long message went out to the old gang this morning. Some gardens just need patience.", "grateful", ["friends"], new Date(2026, 2, 9, 9), { revisitOf: "e14", w: "Clear", tp: "day", pl: "home" }),
    E("e26", "First mangoes of the season", "The fruit seller saved the good ones. Ate one over the sink like a person with no manners and no regrets.", "joyful", ["food", "seasons"], new Date(2026, 3, 12, 12), { w: "Clear", tp: "day", pl: "Mapusa market" }),
    E("e27", "The balcony garden bloomed", "Every pot at once, like they coordinated. Sat with my coffee and just looked for a long time.", "peaceful", ["plants"], new Date(2026, 3, 25, 8), { fav: 1, w: "Clear", tp: "dawn", pl: "the balcony" }),
    E("e28", "Storm-watching from the porch", "Pre-monsoon theatre: purple sky, hot wind, the smell of rain that has not arrived yet.", "dreamy", ["weather"], new Date(2026, 4, 8, 18), { w: "Clouds", tp: "dusk", pl: "the porch" }),
    E("e29", "3 a.m. bug, 4 a.m. fix", "An off-by-one in the FX rounding, of course it was. Too wired to sleep, too tired to be smug.", "anxious", ["work", "code"], new Date(2026, 4, 19, 4), { w: "Clear night", tp: "night", pl: "the desk" }),
    E("e30", "Monsoon came home again", "First rains of the season on the roof. A whole year of weather has passed over this little garden.", "peaceful", ["rain", "seasons"], new Date(2026, 5, 4, 17), { w: "Heavy rain", tp: "golden", pl: "home" }),
    E("e31", "One year of tending this", "Three hundred-odd days, thirty-one honest pages, one slightly ridiculous pumpkin. Worth every word.", "grateful", ["milestone"], new Date(2026, 5, 10, 19), { fav: 1, w: "Light rain", tp: "dusk", pl: "home" }),
  ];
}

/* ---------- flower parts ---------- */
const Leaf = ({ x, y, angle, size, fill }) => (
  <path
    d={`M0 0 Q ${size * 0.85} ${-size * 0.45} ${size * 1.6} 0 Q ${size * 0.85} ${size * 0.45} 0 0Z`}
    fill={fill}
    opacity="0.95"
    transform={`translate(${x} ${y}) rotate(${angle})`}
  />
);

const Stem = ({ bend = 0, topY = 58, color = "#5d7d4e", width = 3.6 }) => (
  <path
    d={`M60 170 C ${60 + bend} 132 ${60 - bend * 0.7} 96 60 ${topY}`}
    stroke={color}
    strokeWidth={width}
    fill="none"
    strokeLinecap="round"
  />
);

const PETAL = "M0 -7 C 7 -13 7 -29 0 -35 C -7 -29 -7 -13 0 -7Z";
const PETAL_TIP = "M0 -24 C 4 -27 4 -33 0 -35 C -4 -33 -4 -27 0 -24Z";

function Daisy({ s }) {
  const r = mulberry32(s ^ 0xd1);
  const n = 11 + Math.floor(r() * 4);
  const cy = 50;
  const tip = r() < 0.3 ? "#f6c9d4" : "#fbecc4";
  const jit = [...Array(n)].map(() => (r() - 0.5) * 6);
  return (
    <>
      <Stem bend={(r() - 0.5) * 14} topY={cy + 12} color="#5d7d4e" />
      <Leaf x={56} y={136} angle={203} size={14} fill="#5d7d4e" />
      <Leaf x={63} y={116} angle={-24} size={12} fill="#6a8e5a" />
      <g transform={`translate(60 ${cy})`}>
        {[...Array(n)].map((_, i) => (
          <path key={"u" + i} d={PETAL} fill="#ecd9ad" transform={`rotate(${(i + 0.5) * (360 / n)} 0 0) scale(.92)`} />
        ))}
        {[...Array(n)].map((_, i) => (
          <g key={i} transform={`rotate(${i * (360 / n) + jit[i]} 0 0)`}>
            <path d={PETAL} fill="#fdf8ec" />
            <path d={PETAL_TIP} fill={tip} opacity=".85" />
          </g>
        ))}
        <circle r="9" fill="#eeb23f" />
        <circle cx="-2.4" cy="-2.4" r="5.2" fill="#f7d27e" />
        {[...Array(7)].map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return <circle key={"d" + i} cx={Math.cos(a) * 6.4} cy={Math.sin(a) * 6.4} r="1.1" fill="#c98e2c" />;
        })}
      </g>
    </>
  );
}

function Lavender({ s }) {
  const r = mulberry32(s ^ 0xa5);
  const n = 13 + Math.floor(r() * 5);
  const buds = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = 96 - t * 60;
    const side = i % 2 ? 1 : -1;
    const x = 60 + side * (6.5 - 4.5 * t) + (r() - 0.5) * 2;
    const c = lerpColor("#c3a8e3", "#7a58b0", Math.min(1, t * 0.9 + r() * 0.15));
    buds.push(
      <ellipse key={i} cx={x} cy={y} rx={Math.max(2.4, 4.6 - t * 1.8)} ry={Math.max(3.4, 6.2 - t * 2.2)} fill={c} transform={`rotate(${side * 34} ${x} ${y})`} />
    );
  }
  return (
    <>
      <Stem bend={2 + (r() - 0.5) * 4} topY={96} color="#5e7f50" width={3.2} />
      <Leaf x={57} y={134} angle={205} size={13} fill="#5e7f50" />
      <Leaf x={63} y={117} angle={-22} size={11} fill="#69905b" />
      {buds}
      <ellipse cx="60" cy="33" rx="3" ry="4.6" fill="#6b4aa0" />
    </>
  );
}

function Rose({ s }) {
  const r = mulberry32(s ^ 0x90);
  const cy = 48;
  const ring = (cnt, sc, fill, off, key) =>
    [...Array(cnt)].map((_, i) => (
      <path
        key={key + i}
        d="M0 2 C 9 0 13 -11 6 -18 C 2 -21 -2 -21 -6 -18 C -13 -11 -9 0 0 2Z"
        fill={fill}
        stroke="rgba(120,20,50,.18)"
        strokeWidth=".6"
        transform={`rotate(${i * (360 / cnt) + off} 0 0) scale(${sc})`}
      />
    ));
  return (
    <>
      <Stem bend={(r() - 0.5) * 12} topY={cy + 16} color="#5c7d4d" />
      <Leaf x={55} y={130} angle={208} size={15} fill="#52764a" />
      <Leaf x={64} y={108} angle={-20} size={13} fill="#5d8252" />
      <g transform={`translate(60 ${cy})`}>
        <Leaf x={-4} y={17} angle={150} size={12} fill="#52764a" />
        <Leaf x={4} y={17} angle={30} size={12} fill="#52764a" />
        {ring(6, 1.18, "#e2798f", r() * 30, "a")}
        {ring(5, 0.86, "#d4587a", 32 + r() * 20, "b")}
        {ring(4, 0.56, "#bf3f63", 75, "c")}
        <circle r="4.6" fill="#a92f52" />
        <path d="M-2.4 -0.6 a2.8 2.8 0 1 0 4.4 1.4" stroke="#8c2342" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

function Bluebell({ s }) {
  const r = mulberry32(s ^ 0xb7);
  const bell = "M0 0 C -6.5 2 -8 10 -6.5 16 L -8 21 L -4 18 L 0 22 L 4 18 L 8 21 L 6.5 16 C 8 10 6.5 2 0 0Z";
  const pts = [
    [66, 74, 0.95],
    [74, 63, 0.85],
    [82, 55, 0.74],
    [88, 50, 0.6],
  ];
  return (
    <>
      <path d="M60 170 C 57 126 50 88 66 62 C 72 53 80 49 89 47" stroke="#5e7f50" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <Leaf x={56} y={138} angle={206} size={15} fill="#557a4d" />
      <Leaf x={61} y={114} angle={-26} size={12} fill="#618655" />
      {pts.map(([x, y, sc], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d={`M0 -6 C ${-1.5} -9 ${-2.5} -11 ${-3.5} -13`} stroke="#5e7f50" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <g transform={`scale(${sc}) rotate(${4 + r() * 10})`}>
            <path d={bell} fill="#7e90d6" stroke="#5d6cb8" strokeWidth=".9" transform="translate(0 -5)" />
          </g>
        </g>
      ))}
    </>
  );
}

function Dahlia({ s, mood }) {
  const r = mulberry32(s ^ 0xda);
  const cy = 50;
  const hot = mood === "anxious";
  const oc = hot ? "#c96d9b" : "#ef8b4d";
  const ic = hot ? "#ad4279" : "#dd5f37";
  const pet = "M0 -6 C 5.5 -12 4 -26 0 -31 C -4 -26 -5.5 -12 0 -6Z";
  const nO = 15, nI = 11;
  return (
    <>
      <Stem bend={(r() - 0.5) * 16} topY={cy + 12} color="#5c7d4d" />
      <Leaf x={55} y={132} angle={206} size={14} fill="#54784b" />
      <Leaf x={64} y={110} angle={-22} size={12} fill="#5f8453" />
      <g transform={`translate(60 ${cy})`}>
        {[...Array(nO)].map((_, i) => (
          <path key={"o" + i} d={pet} fill={oc} stroke="rgba(90,25,15,.22)" strokeWidth=".5" transform={`rotate(${i * (360 / nO) + (r() - 0.5) * 5} 0 0) scale(1.05)`} />
        ))}
        {[...Array(nI)].map((_, i) => (
          <path key={"i" + i} d={pet} fill={ic} transform={`rotate(${i * (360 / nI) + 16} 0 0) scale(.66)`} />
        ))}
        <circle r="5.4" fill="#7c2c1c" />
        {[...Array(5)].map((_, i) => {
          const a = (i / 5) * Math.PI * 2 + 0.5;
          return <circle key={"c" + i} cx={Math.cos(a) * 3} cy={Math.sin(a) * 3} r="1" fill="#f2c14e" />;
        })}
      </g>
    </>
  );
}

function Tulip({ s }) {
  const r = mulberry32(s ^ 0x70);
  const cy = 46;
  const palettes = [
    ["#ef9a4e", "#e07b3a"],
    ["#e87f9a", "#d65f80"],
    ["#f0c04e", "#dfa238"],
  ];
  const [main, dark] = palettes[Math.floor(r() * palettes.length)];
  return (
    <>
      <Stem bend={(r() - 0.5) * 8} topY={cy + 24} color="#5d8050" />
      <path d="M58 168 C 44 146 40 118 50 92 C 52 116 55 140 60 162Z" fill="#587a4b" />
      <path d="M62 168 C 76 148 79 122 70 98 C 69 122 65 144 60 162Z" fill="#618655" />
      <g transform={`translate(60 ${cy})`}>
        <path d="M-13 16 C -15 -6 -8 -20 0 -22 C 8 -20 15 -6 13 16 C 8 21 -8 21 -13 16Z" fill={main} />
        <path d="M-13 15 C -14 -2 -10 -14 -3 -19 C -5 -4 -5 8 -3 17Z" fill={dark} />
        <path d="M13 15 C 14 -2 10 -14 3 -19 C 5 -4 5 8 3 17Z" fill={dark} />
      </g>
    </>
  );
}

function Pumpkin() {
  return (
    <>
      <path d="M60 170 C 46 160 36 158 22 162" stroke="#5e7f50" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M44 158 c -2 -8 6 -10 8 -4 c 1.6 4 -3 7 -5 4" stroke="#6b8e5c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Leaf x={28} y={156} angle={195} size={15} fill="#557a4d" />
      <g transform="translate(72 150)">
        <circle r="27" fill="rgba(255,190,90,.16)" />
        <ellipse cx="-9" cy="0" rx="10" ry="13" fill="#d97a22" />
        <ellipse cx="9" cy="0" rx="10" ry="13" fill="#d97a22" />
        <ellipse cx="0" cy="0" rx="11.5" ry="14" fill="#ef9433" />
        <ellipse cx="-3.4" cy="-4.5" rx="4" ry="6" fill="rgba(255,228,165,.4)" />
        <path d="M-2 -13 C -2 -19 4 -21 5.5 -17.5 L 3 -12Z" fill="#74934e" />
        <path d="M11 -23 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6Z" fill="#ffe49a" />
        <path d="M-17 -17 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1Z" fill="#ffe9b0" opacity=".9" />
      </g>
    </>
  );
}

function FlowerArt({ entry }) {
  const { bloom, seed, lean, mood } = entry;
  let inner = null;
  if (bloom === "daisy") inner = <Daisy s={seed} />;
  else if (bloom === "lavender") inner = <Lavender s={seed} />;
  else if (bloom === "rose") inner = <Rose s={seed} />;
  else if (bloom === "bluebell") inner = <Bluebell s={seed} />;
  else if (bloom === "dahlia") inner = <Dahlia s={seed} mood={mood} />;
  else if (bloom === "tulip") inner = <Tulip s={seed} />;
  else inner = <Pumpkin />;
  return (
    <svg viewBox="0 0 120 170" width="120" height="170" style={{ overflow: "visible", display: "block" }}>
      <g transform={`rotate(${lean} 60 170)`}>{inner}</g>
    </svg>
  );
}

/* ---------- scenery bits ---------- */
function makeHill(seed, W, H, base, amp) {
  const rng = mulberry32(seed);
  const step = 190;
  const pts = [];
  for (let x = 0; x <= W + step; x += step) pts.push([x, H - base - rng() * amp]);
  let d = `M0 ${H} L ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q ${x0 + (x1 - x0) * 0.5 - step * 0.28} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`;
  }
  d += ` L ${W + step} ${H} Z`;
  const yAt = (x) => {
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor(x / step)));
    const t = (x - pts[i][0]) / step;
    return pts[i][1] * (1 - t) + pts[i + 1][1] * t;
  };
  return { d, yAt };
}

const Tree = ({ x, y, sc, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${sc})`}>
    <rect x="-1.6" y="-7" width="3.2" height="11" rx="1.4" fill={fill} opacity=".9" style={{ transition: "fill 1.4s" }} />
    <ellipse cx="0" cy="-16" rx="12.5" ry="14" fill={fill} style={{ transition: "fill 1.4s" }} />
    <ellipse cx="-8" cy="-8" rx="7.5" ry="8.5" fill={fill} style={{ transition: "fill 1.4s" }} />
    <ellipse cx="8" cy="-8" rx="7.5" ry="8.5" fill={fill} style={{ transition: "fill 1.4s" }} />
  </g>
);

const GrassTuft = ({ left, bottom, sc, dur, delay, z }) => (
  <div
    style={{
      position: "absolute",
      left,
      bottom,
      zIndex: z,
      transformOrigin: "bottom center",
      transform: `scale(${sc})`,
      pointerEvents: "none",
    }}
  >
    <svg width="26" height="34" viewBox="0 0 26 34" style={{ display: "block", overflow: "visible", animation: `bj-grass ${dur}s ${delay}s ease-in-out infinite alternate`, transformOrigin: "13px 34px" }}>
      <path d="M13 34 C 12 22 9 14 5 8" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M13 34 C 13.5 20 14 12 14.5 5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M13 34 C 15 24 18 16 22 11" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

const SunIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.4" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
  </svg>
);
const RainIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6 13a5 5 0 1 1 1-9.9A6 6 0 0 1 18.5 6 4.5 4.5 0 0 1 18 13H6Z" />
    <path d="M8 16.5l-1 3M13 16.5l-1 3M18 16.5l-1 3" />
  </svg>
);

/* ---------- live creatures ---------- */
const WINGS = [
  ["#e2a14e", "#b06a30"], // amber
  ["#a8bedf", "#6f88b5"], // pale blue
  ["#e3b4c6", "#b27795"], // rose
  ["#d8cd96", "#a3955c"], // meadow yellow
];

function Butterfly({ f }) {
  const [stage, setStage] = useState("fly"); // fly → perch → leave
  useEffect(() => {
    const t1 = setTimeout(() => setStage("perch"), (f.delay + f.dur) * 1000);
    const t2 = setTimeout(() => setStage("leave"), (f.delay + f.dur + f.stay - 1.1) * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const flap = stage === "fly" ? 0.24 : 2.6;
  const s = f.size;
  return (
    <div style={{ position: "absolute", left: f.x, bottom: f.yB, zIndex: 190, pointerEvents: "none", opacity: stage === "leave" ? 0 : 1, transition: "opacity 1.1s ease" }}>
      <div style={{ offsetPath: `path("${f.path}")`, offsetRotate: "0deg", animation: `bj-flight ${f.dur}s ${f.delay}s cubic-bezier(.42,.08,.34,.98) both` }}>
        <div style={{ animation: stage === "fly" ? "bj-flybob .85s ease-in-out infinite alternate" : "bj-perchbob 3.6s ease-in-out infinite alternate" }}>
          <div style={{ position: "relative", width: 30 * s, height: 24 * s, perspective: 110, filter: "drop-shadow(0 2px 2px rgba(20,30,22,.25))" }}>
            <svg width={14 * s} height={22 * s} viewBox="0 0 14 22" style={{ position: "absolute", right: "50%", top: 0, transformOrigin: "right center", animation: `bj-flapL ${flap}s ease-in-out infinite alternate` }}>
              <path d="M13.6 11 C 3 -1, -2.4 4, 3.4 10.4 C -2 15.4, 3.6 22.6, 13.6 12.4 Z" fill={f.wing[0]} />
              <path d="M13.6 11 C 7 4.6, 5 6.6, 8 10.4 Z" fill={f.wing[1]} opacity=".85" />
            </svg>
            <svg width={14 * s} height={22 * s} viewBox="0 0 14 22" style={{ position: "absolute", left: "50%", top: 0, transformOrigin: "left center", animation: `bj-flapR ${flap}s ease-in-out infinite alternate` }}>
              <g transform="scale(-1,1) translate(-14,0)">
                <path d="M13.6 11 C 3 -1, -2.4 4, 3.4 10.4 C -2 15.4, 3.6 22.6, 13.6 12.4 Z" fill={f.wing[0]} />
                <path d="M13.6 11 C 7 4.6, 5 6.6, 8 10.4 Z" fill={f.wing[1]} opacity=".85" />
              </g>
            </svg>
            <div style={{ position: "absolute", left: "50%", top: "16%", width: 2.6 * s, height: 14 * s, marginLeft: -1.3 * s, borderRadius: 4, background: "#3a322c" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const Fox = ({ fill }) => (
  <g>
    <path d="M5 7 C -2 13 -1 24 8 27.5 C 13.5 29.5 19.5 28 23 24.5 L 27 17 C 21 19.5 14.5 18.5 11.5 14 C 9.5 11 7.5 8.5 5 7 Z" fill={fill} />
    <path d="M20 24 C 22 18.5 28 15.5 35 15.5 C 43 15.5 50 17.2 57 16.6 C 62 16.1 65 13.8 67.8 11.6 L 68.8 6.2 L 72.8 9.8 L 76.8 6.8 L 77.8 11.9 C 83 12.4 88.5 14.2 92.4 17.6 C 94.4 19.2 93.8 21.2 91.2 21.7 L 83 22.7 C 80 25.7 75 27.6 70 28.1 C 62 29 52 29.1 44 28.7 C 35 28.2 26 27.7 21.6 26.6 C 20.5 26.1 19.8 25 20 24 Z" fill={fill} />
    <path d="M25.5 25.5 L 20.5 41.2 L 23.5 41.8 L 29.5 26.3 Z" fill={fill} />
    <path d="M33.5 26.8 L 35.8 41.8 L 38.8 41.8 L 38.3 27.2 Z" fill={fill} />
    <path d="M58 27.6 L 55.2 41.6 L 58.2 42 L 63 28 Z" fill={fill} />
    <path d="M68.5 27.2 L 73.8 41 L 76.8 40.4 L 73.2 26 Z" fill={fill} />
  </g>
);

/* ---------- date helpers ---------- */
const fmtFull = (d) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
const fmtShort = (d) => `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
function agoLabel(d) {
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  const yrs = now.getFullYear() - d.getFullYear();
  if (sameDay && yrs >= 1) return `${yrs} year${yrs > 1 ? "s" : ""} ago today`;
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 0) return "this month";
  if (months === 1) return "last month";
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)}y ${months % 12}m ago`;
}
const isAnniv = (d) => {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear();
};

/* ============================================================ */
export default function BloomMeadow() {
  const [phaseKey, setPhaseKey] = useState(() => phaseFromHour(new Date().getHours()));
  const [weather, setWeather] = useState("clear");
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [activeMonth, setActiveMonth] = useState(0);
  const [replay, setReplay] = useState(null);
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [grabbing, setGrabbing] = useState(false);
  const [bflies, setBflies] = useState(null);
  const [fox, setFox] = useState(null);
  const [cshadow, setCshadow] = useState(null);
  const [shoot, setShoot] = useState(null);

  const scrollerRef = useRef(null);
  const hillRefs = [useRef(null), useRef(null), useRef(null)];
  const drag = useRef({ down: false, x: 0, sl: 0, moved: 0 });
  const ticking = useRef(false);

  const phase = PHASES[phaseKey];
  const G = 150; // ground strip height

  /* layout: months + planted flowers */
  const layout = useMemo(() => {
    const entries = buildEntries().sort((a, b) => a.createdAt - b.createdAt);
    const mk = (d) => d.getFullYear() * 12 + d.getMonth();
    const keys = [...new Set(entries.map((e) => mk(e.createdAt)))].sort((a, b) => a - b);
    const MW = 560, PL = 300, PR = 380;
    const idx = new Map(keys.map((k, i) => [k, i]));
    const months = keys.map((k, i) => ({
      key: k,
      y: Math.floor(k / 12),
      m: k % 12,
      x: PL + i * MW,
      cx: PL + i * MW + MW / 2,
    }));
    const W = PL + keys.length * MW + PR;
    const placed = entries.map((e, ei) => {
      const seed = hashString(e.id + e.title);
      const r = mulberry32(seed);
      const mi = idx.get(mk(e.createdAt));
      const x = PL + mi * MW + 85 + r() * (MW - 180);
      const depth = r();
      const yB = 16 + depth * 72;
      const words = e.content.split(/\s+/).length;
      const scale = (1.16 - depth * 0.46) * (0.9 + (Math.min(words, 60) / 60) * 0.22) * (e.isFavourited ? 1.12 : 1);
      const isPumpkin = e.mood === "joyful" && /(!!!|ecstatic|over the moon|thrilled)/i.test(e.title + " " + e.content);
      const bloom = isPumpkin ? "pumpkin" : (MOODS[e.mood] ? MOODS[e.mood].bloom : "lavender");
      return {
        ...e,
        seed,
        x,
        yB,
        scale,
        bloom,
        z: 100 + Math.round((1 - depth) * 40),
        lean: (r() - 0.5) * 9,
        sway: 3.8 + r() * 3.2,
        delay: -r() * 6,
        fade: 0.8 + (ei / entries.length) * 0.2,
      };
    });
    return { entries: placed, months, W, MW, PL };
  }, []);

  /* ambient particle fields (deterministic) */
  const stars = useMemo(() => {
    const r = mulberry32(777);
    return [...Array(90)].map((_, i) => ({ id: i, x: r() * 100, y: r() * 62, s: 1 + r() * 1.6, d: 2.2 + r() * 3.4, dl: -r() * 5 }));
  }, []);
  const fireflies = useMemo(() => {
    const r = mulberry32(424);
    return [...Array(12)].map((_, i) => ({ id: i, x: 6 + r() * 88, y: 48 + r() * 38, d: 5 + r() * 6, dl: -r() * 8 }));
  }, []);
  const pollen = useMemo(() => {
    const r = mulberry32(909);
    return [...Array(14)].map((_, i) => ({ id: i, x: r() * 100, y: 35 + r() * 50, s: 2.4 + r() * 2.6, d: 9 + r() * 8, dl: -r() * 12 }));
  }, []);
  const drops = useMemo(() => {
    const r = mulberry32(313);
    return [...Array(70)].map((_, i) => ({ id: i, x: r() * 100, h: 22 + r() * 26, d: 0.85 + r() * 0.65, dl: -r() * 2 }));
  }, []);
  const clouds = useMemo(() => {
    const r = mulberry32(551);
    return [...Array(5)].map((_, i) => ({ id: i, top: 4 + r() * 26, w: 180 + r() * 150, d: 90 + r() * 80, dl: -r() * 120, o: 0.55 + r() * 0.3 }));
  }, []);
  const tufts = useMemo(() => {
    const r = mulberry32(212);
    const n = Math.floor(layout.W / 46);
    return [...Array(n)].map((_, i) => {
      const bottom = r() * 26;
      return { id: i, left: i * 46 + r() * 30, bottom, sc: 0.7 + r() * 0.75, dur: 2.6 + r() * 2.4, dl: -r() * 4, z: 100 + Math.round((26 - bottom) * 1.8) };
    });
  }, [layout.W]);

  /* hills (sized to viewport + parallax factor) */
  const hills = useMemo(() => {
    const defs = [
      { f: 0.16, base: 168, amp: 50, seed: 11 },
      { f: 0.32, base: 116, amp: 64, seed: 23 },
      { f: 0.55, base: 64, amp: 72, seed: 37 },
    ];
    return defs.map((h) => {
      const Wl = layout.W * h.f + vw + 500;
      const built = makeHill(h.seed, Wl, 340, h.base, h.amp);
      const tr = mulberry32(h.seed * 7);
      const trees = h.f > 0.2
        ? [...Array(h.f > 0.4 ? 6 : 4)].map((_, i) => {
            const x = 140 + tr() * (Wl - 280);
            return { id: i, x, y: built.yAt(x) + 4, sc: h.f > 0.4 ? 0.85 + tr() * 0.5 : 0.5 + tr() * 0.3 };
          })
        : [];
      return { ...h, Wl, d: built.d, yAt: built.yAt, trees };
    });
  }, [layout.W, vw]);

  /* memory replay: same day, prior year */
  useEffect(() => {
    const now = new Date();
    const cands = layout.entries.filter(
      (e) => e.createdAt.getDate() === now.getDate() && e.createdAt.getMonth() === now.getMonth() && e.createdAt.getFullYear() < now.getFullYear()
    );
    if (cands.length) {
      cands.sort((a, b) => b.createdAt - a.createdAt);
      const t = setTimeout(() => setReplay(cands[0]), 1100);
      return () => clearTimeout(t);
    }
  }, [layout]);

  /* start at the most recent month */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
      syncScroll();
    }
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sx = el.scrollLeft;
    hills.forEach((h, i) => {
      const node = hillRefs[i].current;
      if (node) node.style.transform = `translateX(${-sx * h.f}px)`;
    });
    const mi = Math.round((sx + window.innerWidth / 2 - layout.PL - layout.MW / 2) / layout.MW);
    const clamped = Math.max(0, Math.min(layout.months.length - 1, mi));
    setActiveMonth((p) => (p === clamped ? p : clamped));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hills, layout]);

  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      syncScroll();
      ticking.current = false;
    });
  };

  const onWheel = (e) => {
    const el = scrollerRef.current;
    if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { down: true, x: e.clientX, sl: scrollerRef.current.scrollLeft, moved: 0 };
    setGrabbing(true);
  };
  const onPointerMove = (e) => {
    if (!drag.current.down || e.pointerType !== "mouse") return;
    const dx = e.clientX - drag.current.x;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    scrollerRef.current.scrollLeft = drag.current.sl - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
    setGrabbing(false);
  };

  const scrollToX = (x) => {
    scrollerRef.current?.scrollTo({ left: Math.max(0, x - window.innerWidth / 2), behavior: "smooth" });
  };
  const openEntry = (e) => setActive(e);
  const visitEntry = (e) => {
    scrollToX(e.x);
    setTimeout(() => setActive(e), 650);
  };

  const parentOf = (e) => (e && e.revisitOf ? layout.entries.find((x) => x.id === e.revisitOf) : null);
  const childrenOf = (e) => (e ? layout.entries.filter((x) => x.revisitOf === e.id) : []);

  /* ---------- live scenes ---------- */
  const spawnButterflies = () => {
    const sx = scrollerRef.current?.scrollLeft || 0;
    const within = layout.entries.filter((e) => e.x > sx + 90 && e.x < sx + vw - 90 && e.bloom !== "pumpkin");
    const pool = within.length ? within : layout.entries.slice(-6);
    const r = mulberry32(Date.now() % 1000000);
    const picks = [];
    const used = new Set();
    let guard = 0;
    while (picks.length < Math.min(3, pool.length) && guard++ < 40) {
      const e = pool[Math.floor(r() * pool.length)];
      if (used.has(e.id)) continue;
      used.add(e.id);
      picks.push(e);
    }
    const flock = picks.map((e, i) => {
      const sxp = (220 + r() * 420) * (r() < 0.5 ? 1 : -1);
      const syp = -(200 + r() * 240);
      const path = `M ${sxp.toFixed(0)} ${syp.toFixed(0)} C ${(sxp * 0.55 + (r() - 0.5) * 260).toFixed(0)} ${(syp * 0.4 - 70 - r() * 110).toFixed(0)}, ${((r() - 0.5) * 260 + 70).toFixed(0)} ${(-150 - r() * 110).toFixed(0)}, ${((r() - 0.5) * 200).toFixed(0)} ${(-110 - r() * 100).toFixed(0)} S ${((r() - 0.5) * 240).toFixed(0)} ${(-40 - r() * 130).toFixed(0)}, 0 0`;
      return { id: i, x: e.x + (r() - 0.5) * 16, yB: e.yB + 118 * e.scale, path, dur: 7.5 + r() * 5, stay: 15 + r() * 13, delay: i * 1.7, wing: WINGS[Math.floor(r() * WINGS.length)], size: 0.78 + r() * 0.5 };
    });
    if (!flock.length) return;
    setBflies({ run: Date.now(), flock });
    const total = Math.max(...flock.map((f) => f.delay + f.dur + f.stay)) + 1.5;
    setTimeout(() => setBflies((b) => (b && Date.now() - b.run > total * 900 ? null : b)), total * 1000);
  };

  const spawnFox = (manual) => {
    const shift = manual && phaseKey !== "dusk" && phaseKey !== "night" && phaseKey !== "golden";
    if (shift) setPhaseKey("dusk");
    const go = () => {
      const h = hills[1];
      if (!h || !h.yAt) return;
      const sx = scrollerRef.current?.scrollLeft || 0;
      const cx = sx * h.f + vw / 2;
      const span = Math.min(vw * 0.8, 940);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const sc = 0.86;
      const xs = [0, 0.25, 0.5, 0.75, 1].map((t) => cx - (dir * span) / 2 + dir * span * t);
      const vars = {};
      xs.forEach((x, i) => {
        const xc = Math.max(30, Math.min(h.Wl - 30, x));
        vars[`--fx${i}`] = `${(xc - 48 * sc).toFixed(1)}px`;
        vars[`--fy${i}`] = `${(h.yAt(xc) - 41.5 * sc + 3).toFixed(1)}px`;
      });
      setFox({ run: Date.now(), vars, dir, sc, dur: 13 });
      setTimeout(() => setFox(null), 13600);
    };
    setTimeout(go, shift ? 1500 : 150);
  };

  const spawnShadow = () => {
    setCshadow({ run: Date.now() });
    setTimeout(() => setCshadow(null), 28500);
  };

  const spawnShoot = (manual) => {
    const shift = manual && phaseKey !== "night" && phaseKey !== "dusk";
    if (shift) setPhaseKey("night");
    const go = () => {
      const r = mulberry32(Date.now() % 1000000);
      const streaks = [0, 1].map((i) => ({
        id: i,
        x: 18 + r() * 58,
        y: 5 + r() * 22,
        ang: 152 + r() * 22,
        len: 120 + r() * 70,
        dur: 1.25 + r() * 0.5,
        delay: i === 0 ? 0.1 : 2.4 + r() * 1.4,
      }));
      setShoot({ run: Date.now(), streaks });
      setTimeout(() => setShoot(null), 6500);
    };
    setTimeout(go, shift ? 1500 : 100);
  };

  /* ambient: a creature wanders through on its own every minute or two */
  const triggersRef = useRef({});
  triggersRef.current = { spawnButterflies, spawnFox, spawnShadow, spawnShoot, phaseKey };
  useEffect(() => {
    let on = true;
    let t;
    const loop = () => {
      t = setTimeout(() => {
        if (!on) return;
        const { phaseKey: pk, ...fn } = triggersRef.current;
        const opts =
          pk === "night" ? ["shoot", "shoot"] :
          pk === "dusk" ? ["fox", "bflies", "shoot"] :
          pk === "golden" ? ["fox", "shadow", "bflies"] :
          pk === "dawn" ? ["bflies", "shadow"] :
          ["bflies", "shadow", "bflies"];
        const pick = opts[Math.floor(Math.random() * opts.length)];
        if (pick === "bflies") fn.spawnButterflies();
        else if (pick === "fox") fn.spawnFox(false);
        else if (pick === "shadow") fn.spawnShadow();
        else fn.spawnShoot(false);
        loop();
      }, 42000 + Math.random() * 72000);
    };
    loop();
    return () => { on = false; clearTimeout(t); };
  }, []);

  const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
  const sans = "'Nunito', 'Segoe UI', sans-serif";
  const glass = {
    background: "rgba(22,27,36,.38)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(247,241,227,.16)",
    color: "#f7f1e3",
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: sans, background: "#0a0f2a", userSelect: grabbing ? "none" : "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');
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
        @keyframes bj-flight{from{offset-distance:0%}to{offset-distance:100%}}
        @keyframes bj-flapL{from{transform:rotateY(62deg)}to{transform:rotateY(-16deg)}}
        @keyframes bj-flapR{from{transform:rotateY(-62deg)}to{transform:rotateY(16deg)}}
        @keyframes bj-flybob{from{transform:translateY(0)}to{transform:translateY(-5px)}}
        @keyframes bj-perchbob{from{transform:translateY(0) rotate(-1deg)}to{transform:translateY(-1.6px) rotate(1.4deg)}}
        @keyframes bj-fox{0%{transform:translate(var(--fx0),var(--fy0))}25%{transform:translate(var(--fx1),var(--fy1))}50%{transform:translate(var(--fx2),var(--fy2))}75%{transform:translate(var(--fx3),var(--fy3))}100%{transform:translate(var(--fx4),var(--fy4))}}
        @keyframes bj-foxlife{0%{opacity:0}6%{opacity:.96}93%{opacity:.96}100%{opacity:0}}
        @keyframes bj-trot{from{transform:translateY(0) rotate(.5deg)}to{transform:translateY(-2.6px) rotate(-.9deg)}}
        @keyframes bj-shoot{0%{transform:translateX(0);opacity:0}8%{opacity:1}72%{opacity:.95}100%{transform:translateX(500px);opacity:0}}
        @keyframes bj-cshadow{0%{transform:translateX(-85vw);opacity:0}9%{opacity:1}88%{opacity:1}100%{transform:translateX(145vw);opacity:0}}
        @media (prefers-reduced-motion: reduce){*{animation-duration:.01s !important;animation-iteration-count:1 !important;transition-duration:.01s !important}}
      `}</style>

      {/* ===== SKY (fixed) ===== */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {PHASE_ORDER.map((k) => (
          <div key={k} style={{ position: "absolute", inset: 0, background: PHASES[k].sky, opacity: k === phaseKey ? 1 : 0, transition: "opacity 1.6s ease" }} />
        ))}

        {/* stars */}
        <div style={{ position: "absolute", inset: 0, opacity: phase.stars, transition: "opacity 1.6s ease" }}>
          {stars.map((st) => (
            <div key={st.id} style={{ position: "absolute", left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: "50%", background: "#fdf6e3", animation: `bj-twinkle ${st.d}s ${st.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* sun */}
        <div
          style={{
            position: "absolute",
            left: `${phase.sun.x}%`,
            top: `${phase.sun.y}%`,
            width: phase.sun.size,
            height: phase.sun.size,
            marginLeft: -phase.sun.size / 2,
            marginTop: -phase.sun.size / 2,
            borderRadius: "50%",
            background: phase.sun.core,
            boxShadow: `0 0 60px 30px ${phase.sun.glow}, 0 0 140px 80px ${phase.sun.glow}`,
            opacity: phase.sun.o,
            transition: "all 1.8s ease",
          }}
        />

        {/* moon */}
        <div style={{ position: "absolute", left: `${phase.moon.x}%`, top: `${phase.moon.y}%`, opacity: phase.moon.o, transition: "all 1.8s ease", filter: "drop-shadow(0 0 26px rgba(240,238,210,.45))" }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="24" fill="#f2eed6" />
            <circle cx="45" cy="30" r="22" fill="rgba(20,28,58,.92)" opacity="0" />
            <circle cx="46" cy="29" r="21" fill="#1b2750" style={{ mixBlendMode: "multiply" }} opacity=".0" />
            <circle cx="28" cy="32" r="3.4" fill="rgba(180,176,150,.5)" />
            <circle cx="40" cy="44" r="2.4" fill="rgba(180,176,150,.45)" />
            <circle cx="42" cy="28" r="1.8" fill="rgba(180,176,150,.4)" />
          </svg>
        </div>

        {/* clouds */}
        {clouds.map((c) => (
          <div key={c.id} style={{ position: "absolute", top: `${c.top}%`, left: 0, opacity: c.o, animation: `bj-drift ${c.d}s linear infinite`, animationDelay: `${c.dl}s`, pointerEvents: "none" }}>
            <div style={{ position: "relative", width: c.w, height: 54 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${i * 22}%`,
                    top: i % 2 ? 12 : 0,
                    width: c.w * 0.42,
                    height: 38 + (i % 2) * 10,
                    borderRadius: "50%",
                    background: phase.clouds,
                    filter: "blur(11px)",
                    transition: "background 1.6s ease",
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* parallax hills */}
        {hills.map((h, i) => (
          <svg key={i} ref={hillRefs[i]} width={h.Wl} height="340" style={{ position: "absolute", bottom: G - 16, left: 0, display: "block", willChange: "transform" }}>
            <path d={h.d} fill={phase.hills[i]} style={{ transition: "fill 1.6s ease" }} />
            {h.trees.map((t) => (
              <Tree key={t.id} x={t.x} y={t.y} sc={t.sc} fill={phase.tree} />
            ))}
            {i === 1 && fox && (
              <g key={fox.run} style={{ ...fox.vars, animation: `bj-fox ${fox.dur}s linear both` }}>
                <g style={{ animation: `bj-foxlife ${fox.dur}s linear both` }}>
                  <g style={{ animation: "bj-trot .48s ease-in-out infinite alternate" }}>
                    <g transform={`scale(${fox.sc})${fox.dir < 0 ? " translate(96,0) scale(-1,1)" : ""}`}>
                      <Fox fill={phase.tree} />
                    </g>
                  </g>
                </g>
              </g>
            )}
          </svg>
        ))}

        {/* pollen + fireflies */}
        <div style={{ position: "absolute", inset: 0, opacity: phase.pollen, transition: "opacity 1.6s ease", pointerEvents: "none" }}>
          {pollen.map((p) => (
            <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: "50%", background: "rgba(255,250,225,.85)", filter: "blur(.6px)", animation: `bj-pollen ${p.d}s ${p.dl}s linear infinite` }} />
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: phase.fire, transition: "opacity 1.6s ease", pointerEvents: "none" }}>
          {fireflies.map((f) => (
            <div key={f.id} style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, width: 4, height: 4, borderRadius: "50%", background: "#ffe98a", boxShadow: "0 0 10px 3px rgba(255,228,130,.65)", animation: `bj-fire ${f.d}s ${f.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* shooting stars */}
        {shoot &&
          shoot.streaks.map((s) => (
            <div key={`${shoot.run}-${s.id}`} style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, transform: `rotate(${s.ang}deg)`, pointerEvents: "none" }}>
              <div style={{ position: "relative", width: s.len, height: 2, animation: `bj-shoot ${s.dur}s ${s.delay}s cubic-bezier(.25,.55,.45,1) both` }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 2, background: "linear-gradient(90deg, transparent, rgba(255,250,228,.95))" }} />
                <div style={{ position: "absolute", right: -2, top: -1.5, width: 5, height: 5, borderRadius: "50%", background: "#fffdf2", boxShadow: "0 0 9px 3px rgba(255,248,216,.85)" }} />
              </div>
            </div>
          ))}
      </div>

      {/* ===== MEADOW (scrolls) ===== */}
      <div
        ref={scrollerRef}
        className="bj-scroll"
        onScroll={onScroll}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ position: "absolute", inset: 0, zIndex: 10, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", cursor: grabbing ? "grabbing" : "grab" }}
      >
        <div style={{ position: "relative", width: layout.W, height: "100%", filter: phase.filter, transition: "filter 1.4s ease" }}>
          {/* ground */}
          {PHASE_ORDER.map((k) => (
            <div key={k} style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: G, background: PHASES[k].ground, opacity: k === phaseKey ? 1 : 0, transition: "opacity 1.6s ease" }} />
          ))}

          {/* month labels */}
          {layout.months.map((m, i) => (
            <div key={m.key} style={{ position: "absolute", left: m.cx, bottom: G - 34, transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none", opacity: activeMonth === i ? 1 : 0.55, transition: "opacity .5s" }}>
              <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: "rgba(250,246,232,.85)", textShadow: "0 1px 8px rgba(20,30,25,.35)" }}>
                {MONTH_NAMES[m.m]}
              </div>
              <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 13, color: "rgba(250,246,232,.6)" }}>{m.y}</div>
            </div>
          ))}

          {/* grass */}
          <div style={{ position: "absolute", inset: 0, color: phase.grass, transition: "color 1.6s ease", pointerEvents: "none" }}>
            {tufts.map((t) => (
              <GrassTuft key={t.id} left={t.left} bottom={t.bottom} sc={t.sc} dur={t.dur} delay={t.dl} z={t.z} />
            ))}
          </div>

          {/* flowers */}
          {layout.entries.map((e, i) => {
            const anniv = isAnniv(e.createdAt);
            return (
              <button
                key={e.id}
                onClick={() => {
                  if (drag.current.moved > 6) return;
                  openEntry(e);
                }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                aria-label={`${e.title}, ${fmtFull(e.createdAt)}`}
                style={{
                  position: "absolute",
                  left: e.x,
                  bottom: e.yB,
                  zIndex: hovered === e.id ? 200 : e.z,
                  width: 120,
                  height: 170,
                  marginLeft: -60,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transform: `scale(${e.scale})`,
                  transformOrigin: "bottom center",
                  opacity: e.fade,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* ground shadow */}
                <div style={{ position: "absolute", left: "50%", bottom: -4, width: 64, height: 14, transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(15,35,20,.28), transparent 70%)" }} />
                {/* favourite halo */}
                {e.isFavourited && (
                  <div style={{ position: "absolute", left: "50%", top: 22, width: 110, height: 110, transform: "translateX(-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,219,140,.4), transparent 68%)", pointerEvents: "none" }} />
                )}
                <div style={{ animation: `bj-bloom .9s cubic-bezier(.18,.9,.32,1.2) both`, animationDelay: `${0.15 + i * 0.04}s`, transformOrigin: "bottom center" }}>
                  <div style={{ transition: "transform .35s ease", transform: hovered === e.id ? "scale(1.07)" : "scale(1)", transformOrigin: "bottom center" }}>
                    <div style={{ animation: `bj-sway ${e.sway}s ease-in-out infinite alternate`, animationDelay: `${e.delay}s`, transformOrigin: "60px 170px" }}>
                      <FlowerArt entry={e} />
                    </div>
                  </div>
                </div>
                {anniv && (
                  <>
                    <div style={{ position: "absolute", left: 16, top: 28, color: "#ffe49a", fontSize: 13, textShadow: "0 0 8px rgba(255,220,140,.8)", animation: "bj-spark 3.2s ease-in-out infinite", pointerEvents: "none" }}>✦</div>
                    <div style={{ position: "absolute", right: 18, top: 50, color: "#ffe9b0", fontSize: 9, textShadow: "0 0 6px rgba(255,220,140,.8)", animation: "bj-spark 2.6s 1.1s ease-in-out infinite", pointerEvents: "none" }}>✦</div>
                  </>
                )}
                {/* hover tooltip */}
                {hovered === e.id && (
                  <div style={{ position: "absolute", left: "50%", top: -6, transform: "translate(-50%,-100%)", whiteSpace: "nowrap", background: "rgba(251,246,236,.96)", border: "1px solid #e3d6bd", borderRadius: 999, padding: "5px 14px", boxShadow: "0 6px 18px rgba(25,35,30,.22)", pointerEvents: "none" }}>
                    <span style={{ fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "#3d4438" }}>{e.title}</span>
                    <span style={{ fontFamily: sans, fontSize: 10.5, color: "#8a8270", marginLeft: 8, fontWeight: 700 }}>{fmtShort(e.createdAt)}</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* butterflies */}
          {bflies && bflies.flock.map((f) => <Butterfly key={`${bflies.run}-${f.id}`} f={f} />)}
        </div>
      </div>

      {/* ===== CLOUD SHADOW SWEEP ===== */}
      {cshadow && (
        <div key={cshadow.run} style={{ position: "absolute", left: 0, right: 0, top: "32%", bottom: 0, zIndex: 15, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "60vw", mixBlendMode: "multiply", background: "radial-gradient(ellipse 52% 58% at 50% 46%, rgba(98,114,106,.95), rgba(150,160,152,.55) 56%, rgba(255,255,255,0) 78%)", filter: "blur(26px)", animation: "bj-cshadow 23s linear both" }} />
          <div style={{ position: "absolute", top: "8%", bottom: 0, left: 0, width: "32vw", mixBlendMode: "multiply", background: "radial-gradient(ellipse 50% 55% at 50% 50%, rgba(112,126,118,.85), rgba(255,255,255,0) 74%)", filter: "blur(24px)", animation: "bj-cshadow 19s 4.5s linear both" }} />
        </div>
      )}

      {/* ===== RAIN ===== */}
      <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none", opacity: weather === "rain" ? 1 : 0, transition: "opacity 1s ease" }}>
        <div style={{ position: "absolute", inset: 0, background: "rgba(70,92,122,.16)" }} />
        <div style={{ position: "absolute", inset: "-10% 0", transform: "rotate(7deg)" }}>
          {drops.map((d) => (
            <div key={d.id} style={{ position: "absolute", left: `${d.x}%`, top: 0, width: 1.5, height: d.h, background: "linear-gradient(to bottom, transparent, rgba(205,220,240,.55))", animation: weather === "rain" ? `bj-rain ${d.d}s ${d.dl}s linear infinite` : "none" }} />
          ))}
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 22px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: 30, color: "#faf6e9", textShadow: "0 2px 16px rgba(15,25,35,.45)", lineHeight: 1 }}>Bloom</div>
          <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.6, textTransform: "uppercase", color: "rgba(250,246,233,.78)", textShadow: "0 1px 10px rgba(15,25,35,.5)", marginTop: 6 }}>
            a living journal · {layout.entries.length} memories
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, pointerEvents: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ ...glass, borderRadius: 999, padding: 4, display: "flex", gap: 2 }}>
            {PHASE_ORDER.map((k) => (
              <button
                key={k}
                onClick={() => setPhaseKey(k)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "6px 11px",
                  fontFamily: sans,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: phaseKey === k ? "#2c3328" : "rgba(247,241,227,.85)",
                  background: phaseKey === k ? "#f3ecd9" : "transparent",
                  transition: "all .3s",
                }}
              >
                {PHASES[k].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setWeather((w) => (w === "rain" ? "clear" : "rain"))}
            aria-label="Toggle rain"
            style={{ ...glass, borderRadius: 999, padding: "6px 14px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", background: weather === "rain" ? "#f3ecd9" : glass.background, color: weather === "rain" ? "#2c3328" : "#f7f1e3" }}
          >
            {weather === "rain" ? <RainIcon /> : <SunIcon />}
            {weather === "rain" ? "Rain" : "Clear"}
          </button>
          <div style={{ ...glass, borderRadius: 999, padding: 4, display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "rgba(247,241,227,.5)", padding: "0 6px 0 9px" }}>Scenes</span>
            {[
              ["Butterflies", () => spawnButterflies(), !!bflies],
              ["Fox", () => spawnFox(true), !!fox],
              ["Cloud shadow", () => spawnShadow(), !!cshadow],
              ["Shooting star", () => spawnShoot(true), !!shoot],
            ].map(([label, fn, on]) => (
              <button
                key={label}
                onClick={fn}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "6px 11px",
                  fontFamily: sans,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: on ? "#2c3328" : "rgba(247,241,227,.85)",
                  background: on ? "#f3ecd9" : "transparent",
                  transition: "all .3s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== REPLAY CARD ===== */}
      {replay && !active && (
        <div style={{ position: "absolute", top: 86, left: "50%", zIndex: 52, width: "min(420px, calc(100vw - 36px))", animation: "bj-replay .7s ease both", transform: "translateX(-50%)" }}>
          <div style={{ background: "rgba(251,246,236,.97)", border: "1px solid #e6d9bf", borderRadius: 16, padding: "14px 16px", boxShadow: "0 14px 40px rgba(20,30,28,.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: 2.2, textTransform: "uppercase", color: "#a98c4a" }}>✦ This day in your garden</div>
              <button onClick={() => setReplay(null)} aria-label="Dismiss" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9a9181", fontSize: 15, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 19, color: "#3a4136", margin: "6px 0 3px" }}>“{replay.title}”</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: "#8b8370" }}>
              {agoLabel(replay.createdAt)} · {PHASE_PRETTY[replay.timePhase]} · {replay.weather.toLowerCase()} · {replay.place}
            </div>
            <button
              onClick={() => { visitEntry(replay); setReplay(null); }}
              style={{ marginTop: 10, border: "1px solid #d8c9a4", background: "#f0e6cd", color: "#5c5236", borderRadius: 999, padding: "6px 16px", fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", cursor: "pointer" }}
            >
              Visit this memory
            </button>
          </div>
        </div>
      )}

      {/* ===== TIMELINE SCRUBBER ===== */}
      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 50, maxWidth: "calc(100vw - 28px)" }}>
        <div style={{ ...glass, borderRadius: 999, padding: "7px 14px", display: "flex", alignItems: "center", gap: 2, overflowX: "auto", scrollbarWidth: "none" }}>
          {layout.months.map((m, i) => (
            <button
              key={m.key}
              onClick={() => scrollToX(m.cx)}
              style={{
                border: "none",
                cursor: "pointer",
                background: "transparent",
                padding: "3px 7px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                color: activeMonth === i ? "#ffe1a0" : "rgba(247,241,227,.62)",
                transition: "color .3s",
              }}
            >
              <span style={{ width: activeMonth === i ? 7 : 5, height: activeMonth === i ? 7 : 5, borderRadius: "50%", background: "currentColor", transition: "all .3s" }} />
              <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {MONTH_ABBR[m.m]}{m.m === 0 || i === 0 ? ` '${String(m.y).slice(2)}` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* hint */}
      <div style={{ position: "absolute", bottom: 76, left: 22, zIndex: 50, fontFamily: serif, fontStyle: "italic", fontSize: 14, color: "rgba(250,246,233,.72)", textShadow: "0 1px 10px rgba(15,25,35,.5)", pointerEvents: "none" }}>
        drag to wander · tap a bloom to remember
      </div>

      {/* ===== MEMORY CARD ===== */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(12,16,24,.22)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 92px" }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fbf6ec", border: "1px solid #e6d9bf", borderRadius: 20, padding: "20px 22px 18px", boxShadow: "0 24px 70px rgba(15,22,20,.4)", animation: "bj-card .45s cubic-bezier(.2,.8,.3,1) both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: MOODS[active.mood]?.chip || "#999" }} />
                <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#7d7561" }}>{MOODS[active.mood]?.label || active.mood}</span>
                {active.isFavourited && <span style={{ color: "#d4a23c", fontSize: 13 }}>♥</span>}
                {active.bloom === "pumpkin" && <span style={{ fontSize: 12 }} title="rare bloom">🎃</span>}
              </div>
              <button onClick={() => setActive(null)} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9a9181", fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 26, lineHeight: 1.15, color: "#33392f", margin: "10px 0 4px" }}>{active.title}</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: "#8b8370", marginBottom: 12 }}>
              {fmtFull(active.createdAt)} · {agoLabel(active.createdAt)}{isAnniv(active.createdAt) ? " ✦" : ""}
            </div>

            <div style={{ fontFamily: serif, fontSize: 17.5, lineHeight: 1.55, color: "#474e42", borderLeft: "2px solid #e3d3ac", paddingLeft: 14, fontStyle: "italic" }}>
              {active.content}
            </div>

            <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "#a39a83", marginTop: 14 }}>
              {PHASE_PRETTY[active.timePhase]} · {active.weather} · {active.place}
            </div>

            {(active.tags?.length || 0) > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {active.tags.map((t) => (
                  <span key={t} style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, color: "#6f7a64", background: "#eee6d0", border: "1px solid #e0d3b3", borderRadius: 999, padding: "3px 10px" }}>#{t}</span>
                ))}
              </div>
            )}

            {parentOf(active) && (
              <button onClick={() => setActive(parentOf(active))} style={{ marginTop: 12, display: "block", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#8a6f3c", textAlign: "left" }}>
                ↩ revisits “{parentOf(active).title}”
              </button>
            )}
            {childrenOf(active).map((c) => (
              <button key={c.id} onClick={() => setActive(c)} style={{ marginTop: 8, display: "block", border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#8a6f3c", textAlign: "left" }}>
                ↪ revisited on {fmtShort(c.createdAt)} — “{c.title}”
              </button>
            ))}
          </div>
        </div>
      )}

      {/* paper grain + vignette */}
      <svg style={{ position: "absolute", inset: 0, zIndex: 70, width: "100%", height: "100%", opacity: 0.05, mixBlendMode: "multiply", pointerEvents: "none" }}>
        <filter id="bj-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#bj-grain)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, zIndex: 65, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 58%, rgba(18,22,30,.2) 100%)" }} />
    </div>
  );
}
