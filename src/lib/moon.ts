// Moon phase from a date — shared by the build (initial render) and the
// browser (re-computed for the visitor's "now", see components/Moon.astro).
//
// Mean synodic month from a known new moon (2000-01-06 18:14 UTC). Accurate
// to within a few hours, which is far finer than an 8-name phase needs.
const SYNODIC = 29.530588853;
const EPOCH = Date.UTC(2000, 0, 6, 18, 14);

export interface Phase { phase: number; illumination: number; name: string; age: number }

const NAMES = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];

export function moonPhase(date: Date = new Date()): Phase {
  const age = ((((date.getTime() - EPOCH) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC;
  const phase = age / SYNODIC;
  return {
    phase,
    age,
    illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2,
    name: NAMES[Math.round(phase * 8) % 8],
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

/** When the moon next reaches a phase (0 = new, 0.5 = full), from `date`. */
export function nextPhase(target: 0 | 0.5, date: Date = new Date()): Date {
  const { phase } = moonPhase(date);
  let frac = (target - phase + 1) % 1;
  if (frac < 0.01) frac += 1;   // just passed it: the next one
  return new Date(date.getTime() + frac * SYNODIC * 86400000);
}

/** Within ~18 hours of the exact full or new moon those nights get dressed up.
 *  The no-flash script in layouts/Base.astro repeats this test inline. */
export const SPECIAL_DAYS = 0.75;
export function special(p: Phase): "full" | "new" | null {
  if (Math.abs(p.age - SYNODIC / 2) < SPECIAL_DAYS) return "full";
  if (p.age < SPECIAL_DAYS || p.age > SYNODIC - SPECIAL_DAYS) return "new";
  return null;
}

/** The homepage's one line about tonight's sky. */
export function tonightLine(p: Phase): string {
  const s = special(p);
  if (s === "full") return "Full moon tonight";
  if (s === "new") return "New moon tonight, the darkest sky of the month";
  return `Tonight, ${p.name}, ${Math.round(p.illumination * 100)}% lit`;
}
