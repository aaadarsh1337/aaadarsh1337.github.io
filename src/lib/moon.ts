// Moon phase from a date: shared by the build (initial render) and the
// browser (re-computed for the visitor's "now", see components/Moon.astro).
//
// The phase is the Moon's true elongation from the Sun, from low-precision ephemerides
// (Meeus, Astronomical Algorithms, ch. 25 and 47: the main periodic terms). New and full
// moons come out within about two minutes of the exact instants; a plain average month
// (the old model) drifted by up to 17 hours. Checked by scripts/moon/elong.py.

const DAY = 86400000;
const RATE = 12.190749;           // mean elongation gain, degrees per day
const rad = (d: number) => (d * Math.PI) / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

// [coefficient (deg), D, M, M', F, has E factor]
const MOON_TERMS: [number, number, number, number, number, 0 | 1][] = [
  [6.288774, 0, 0, 1, 0, 0], [1.274027, 2, 0, -1, 0, 0], [0.658314, 2, 0, 0, 0, 0], [0.213618, 0, 0, 2, 0, 0],
  [-0.185116, 0, 1, 0, 0, 1], [-0.114332, 0, 0, 0, 2, 0], [0.058793, 2, 0, -2, 0, 0], [0.057066, 2, -1, -1, 0, 1],
  [0.053322, 2, 0, 1, 0, 0], [0.045758, 2, -1, 0, 0, 1], [-0.040923, 0, 1, -1, 0, 1], [-0.03472, 1, 0, 0, 0, 0],
  [-0.030383, 0, 1, 1, 0, 1], [0.015327, 2, 0, 0, -2, 0], [-0.012528, 0, 0, 1, 2, 0], [0.01098, 0, 0, 1, -2, 0],
  [0.010675, 4, 0, -1, 0, 0], [0.010034, 0, 0, 3, 0, 0], [0.008548, 4, 0, -2, 0, 0], [-0.007888, 2, 1, -1, 0, 1],
  [-0.006766, 2, 1, 0, 0, 1], [-0.005163, 1, 0, -1, 0, 0], [0.004987, 1, 1, 0, 0, 1], [0.004036, 2, -1, 1, 0, 1],
  [0.003994, 2, 0, 2, 0, 0], [0.003861, 4, 0, 0, 0, 0], [0.003665, 2, 0, -3, 0, 0], [-0.002689, 0, 1, -2, 0, 1],
  [-0.002602, 2, 0, -1, 2, 0], [0.00239, 2, -1, -2, 0, 1],
];

/** The Moon's elongation east of the Sun, 0-360 degrees: 0 new, 90 first quarter, 180 full. */
export function elongation(ms: number): number {
  const T = (ms / DAY + 2440587.5 + 69.2 / 86400 - 2451545) / 36525;   // Julian centuries (TT) from J2000
  const Ms = 357.52911 + 35999.05029 * T;
  const sun = 280.46646 + 36000.76983 * T
    + (1.914602 - 0.004817 * T) * Math.sin(rad(Ms)) + 0.019993 * Math.sin(rad(2 * Ms)) + 0.000289 * Math.sin(rad(3 * Ms))
    - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * T));
  const Lp = 218.3164477 + 481267.88123421 * T, D = 297.8501921 + 445267.1114034 * T, M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T, F = 93.272095 + 483202.0175233 * T, E = 1 - 0.002516 * T;
  let moon = Lp + 0.003958 * Math.sin(rad(119.75 + 131.849 * T)) + 0.001962 * Math.sin(rad(Lp - F)) + 0.000318 * Math.sin(rad(53.09 + 479264.29 * T));
  for (const [a, d, m, mp, f, e] of MOON_TERMS) moon += a * (e ? E : 1) * Math.sin(rad(d * D + m * M + mp * Mp + f * F));
  return norm(moon - sun);
}

/** The instant the elongation reaches `deg`, nearest to `ms` (Newton steps on the mean rate). */
function solve(ms: number, deg: number): number {
  for (let i = 0; i < 8; i++) ms += ((((deg - elongation(ms)) % 360) + 540) % 360 - 180) / RATE * DAY;
  return ms;
}

/** "27%", or "<1%" for a sliver that would round to a misleading 0 (or 100). */
export const litText = (illumination: number) => {
  const n = Math.round(illumination * 100);
  return n === 0 && illumination > 0.0005 ? "<1%" : n === 100 && illumination < 0.9995 ? ">99%" : `${n}%`;
};

export interface Phase { phase: number; illumination: number; name: string; age: number; at: number }

// The four principal phases are instants. As in calendars and almanacs, a day is named
// for one when that instant falls on it, in the visitor's own timezone; the days between
// are crescents and gibbous moons.
const NAMES = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];
const sameLocalDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
/** The instant of the principal phase `target` (degrees) nearest to `ms`. */
const nearest = (ms: number, deg: number, target: number) => solve(ms + ((((target - deg) % 360) + 540) % 360 - 180) / RATE * DAY, target);
function nameFor(deg: number, t: number): string {
  const q = Math.round(deg / 90) % 4;
  if (sameLocalDay(nearest(t, deg, q * 90), t)) return NAMES[q * 2];
  return NAMES[(Math.floor(deg / 90) * 2 + 1) % 8];
}

export function moonPhase(date: Date = new Date()): Phase {
  const t = date.getTime(), deg = elongation(t);
  const lastNew = solve(t - (deg / RATE) * DAY, 0);
  return {
    phase: deg / 360,
    age: (t - (lastNew > t ? solve(lastNew - 29.53 * DAY, 0) : lastNew)) / DAY,
    illumination: (1 - Math.cos(rad(deg))) / 2,
    name: nameFor(deg, t),
    at: t,
  };
}

/** SVG path of the lit part of a disc of radius r centred at (c, c).
 *  Northern-hemisphere view: waxing light grows from the right. */
export function litPath(phase: number, c = 12, r = 10): string {
  const p = ((phase % 1) + 1) % 1;
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  const top = `${c} ${c - r}`, bottom = `${c} ${c + r}`;
  const f = (n: number) => n.toFixed(3);
  if (p < 0.5) {
    // limb on the right; terminator bulges left once past first quarter
    return `M${top}A${r} ${r} 0 0 1 ${bottom}A${f(rx)} ${r} 0 0 ${p > 0.25 ? 1 : 0} ${top}Z`;
  }
  return `M${top}A${r} ${r} 0 0 0 ${bottom}A${f(rx)} ${r} 0 0 ${p < 0.75 ? 0 : 1} ${top}Z`;
}

/** When the moon next reaches a phase (0 = new, 0.5 = full), after `date`. */
export function nextPhase(target: 0 | 0.5, date: Date = new Date()): Date {
  const now = date.getTime(), deg = target * 360;
  let ms = solve(now + ((((deg - elongation(now)) % 360) + 360) % 360) / RATE * DAY, deg);
  if (ms <= now + 0.01 * DAY) ms = solve(ms + 29.53 * DAY, deg);   // just passed it: the next one
  return new Date(ms);
}

/** Every new and full moon instant between two dates, oldest first. */
export function phaseInstants(from: Date, to: Date): { kind: "new" | "full"; at: number }[] {
  const out: { kind: "new" | "full"; at: number }[] = [];
  for (let ms = from.getTime(); ms < to.getTime();) {
    const n = nextPhase(0, new Date(ms)).getTime(), f = nextPhase(0.5, new Date(ms)).getTime();
    const next = Math.min(n, f);
    if (next > to.getTime()) break;
    out.push({ kind: next === n ? "new" : "full", at: next });
    ms = next + DAY;
  }
  return out;
}

/** The day of a full or new moon gets dressed up: the day, in the visitor's timezone, on
 *  which the true instant falls (as calendars mark it). The no-flash script in
 *  layouts/Base.astro applies the same rule to instants precomputed at build. */
export function special(p: Phase): "full" | "new" | null {
  const deg = p.phase * 360;
  if (deg > 120 && deg < 240 && sameLocalDay(nearest(p.at, deg, 180), p.at)) return "full";
  if ((deg < 60 || deg > 300) && sameLocalDay(nearest(p.at, deg, 0), p.at)) return "new";
  return null;
}

/** The homepage's one line about tonight's sky. */
export function tonightLine(p: Phase): string {
  const s = special(p);
  if (s === "full") return `Full moon tonight: the ${fullMoonName(new Date())}`;
  if (s === "new") return "New moon tonight, the darkest sky of the month";
  return `Tonight, ${p.name}, ${litText(p.illumination)} lit`;
}

const MONTH_MOONS = ["Wolf", "Snow", "Worm", "Pink", "Flower", "Strawberry", "Buck", "Sturgeon", "Corn", "Hunter's", "Beaver", "Cold"];
const SYNODIC = 29.530588853;
function nearestFull(d: Date): number {
  let f = 0.5 - moonPhase(d).phase;
  if (f > 0.5) f -= 1; else if (f < -0.5) f += 1;
  return solve(d.getTime() + f * SYNODIC * DAY, 180);
}
/** The traditional (Old Farmer's Almanac) name of the full moon at `full`, in local time:
 *  one per month, except that the full moon nearest the September equinox is the
 *  Harvest Moon, the one after it the Hunter's Moon, and a month's second full moon a Blue Moon. */
export function fullMoonName(full: Date): string {
  const harvest = nearestFull(new Date(full.getFullYear(), 8, 22));
  const t = nearestFull(full);
  if (Math.abs(t - harvest) < 2 * DAY) return "Harvest Moon";
  if (Math.abs(t - (harvest + SYNODIC * DAY)) < 2 * DAY) return "Hunter's Moon";
  const prev = new Date(t - SYNODIC * DAY), at = new Date(t);
  if (prev.getMonth() === at.getMonth() && prev.getFullYear() === at.getFullYear()) return "Blue Moon";
  return `${MONTH_MOONS[at.getMonth()]} Moon`;
}

/** Ids for the masks inside each photo moon: unique per page, and the same on every build. */
let moonIds = 0;
export const nextMoonId = () => `moon${++moonIds}`;
