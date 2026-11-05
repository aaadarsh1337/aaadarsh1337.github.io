// Red spider lilies, drawn at build time. The same shape as the GitHub profile banner
// (aaadarsh1337/aaadarsh1337 scripts/render.py, lily()): an umbel of short recurved
// petals and long sweeping stamens. Seeded, so every build draws the same flowers.

export type Rand = () => number;

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();
const rad = (d: number) => (d * Math.PI) / 180;
const stemPath = (cx: number, cy: number, sway: number, ground: number) =>
  `M${n(cx)} ${n(cy)}Q${n(cx + sway)} ${n((cy + ground) / 2)} ${n(cx + sway * 0.4)} ${n(ground)}`;

export interface Lily { kind: "lily"; stem: string; petals: string; stamens: string; anthers: { cx: string; cy: string; r: string }[]; sw: { stem: string; petal: string; stamen: string } }
export interface Bud { kind: "bud"; stem: string; sw: string; head: { cx: string; cy: string; rx: string; ry: string; rot: string } }

/** A flower head at (cx, cy) of scale s, its stem curving down to the ground line. */
export function lily(cx: number, cy: number, s: number, rand: Rand, ground: number): Lily {
  const u = (a: number, b: number) => a + (b - a) * rand();
  const stem = stemPath(cx, cy, u(-6, 6) * s, ground);
  const flowers = 5 + Math.floor(rand() * 3);
  let petals = "", stamens = "";
  const anthers: Lily["anthers"] = [];
  for (let i = 0; i < flowers; i++) {
    const a = rad(-180 + ((i + 0.5) * 180) / flowers + u(-8, 8));
    const fx = cx + Math.cos(a) * 7 * s, fy = cy + Math.sin(a) * 5 * s;
    for (let p = 0; p < 4; p++) {            // petals: short, curling back
      const pa = a + rad(u(-50, 50)), L = u(7, 10) * s;
      petals += `M${n(fx)} ${n(fy)}Q${n(fx + Math.cos(pa - 0.9) * L * 0.8)} ${n(fy + Math.sin(pa - 0.9) * L * 0.8 - 2 * s)} ${n(fx + Math.cos(pa) * L)} ${n(fy + Math.sin(pa) * L)}`;
    }
    for (let k = 0; k < 3; k++) {            // stamens: long, sweeping up and out
      const sa = a + rad(u(-25, 25)), L = u(20, 27) * s;
      const ex = fx + Math.cos(sa) * L, ey = fy + Math.sin(sa) * L * 0.85 - 6 * s;
      stamens += `M${n(fx)} ${n(fy)}Q${n(fx + Math.cos(sa) * L * 0.55)} ${n(fy + Math.sin(sa) * L * 0.2)} ${n(ex)} ${n(ey)}`;
      anthers.push({ cx: n(ex), cy: n(ey), r: n(1.1 * s) });
    }
  }
  return { kind: "lily", stem, petals, stamens, anthers, sw: { stem: n(1.6 * s), petal: n(2.4 * s), stamen: n(0.8 * s) } };
}

/** A closed bud: a thin stem topped by a small tilted oval. */
export function bud(cx: number, cy: number, s: number, rand: Rand, ground: number): Bud {
  const u = (a: number, b: number) => a + (b - a) * rand();
  return {
    kind: "bud",
    stem: stemPath(cx, cy, u(-5, 5) * s, ground),
    sw: n(1.4 * s),
    head: { cx: n(cx), cy: n(cy - 4 * s), rx: n(2.3 * s), ry: n(5 * s), rot: n(u(-18, 18)) },
  };
}
