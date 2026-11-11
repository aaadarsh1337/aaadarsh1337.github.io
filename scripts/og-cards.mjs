// After `astro build`: render a 1200×630 share card per writeup and post into dist/og/,
// from dist/og/cards.json, using headless Chrome (already on GitHub's runners) and the
// site's own fonts. No Chrome, or a card that fails, falls back to the site-wide
// card, so a page's og:image always exists.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const manifest = join(dist, "og/cards.json");
if (!existsSync(manifest)) { console.log("og-cards: no manifest, nothing to do"); process.exit(0); }
const cards = JSON.parse(readFileSync(manifest, "utf8"));
const fallback = join(dist, "assets/og.png");
const font = (p) => pathToFileURL(join(root, "node_modules", p)).href;

const chrome = [process.env.CHROME, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]
  .filter(Boolean).find((c) => spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0);

// the same moon the site draws (src/lib/moon.ts litPath), at r=10 in a 24 box
function lit(phase, tilt = 30) {   // decorative, like the site's decorPath: lit from the bottom left
  const c = 12, r = 10, p = (((1 - phase) % 1) + 1) % 1, rx = Math.abs(Math.cos(2 * Math.PI * p)) * r;
  const a = p < 0.5 ? tilt : -tilt, t = a * Math.PI / 180, f = (n) => n.toFixed(3);
  const top = `${f(c + Math.sin(t) * r)} ${f(c - Math.cos(t) * r)}`, bottom = `${f(c - Math.sin(t) * r)} ${f(c + Math.cos(t) * r)}`;
  return p < 0.5 ? `M${top}A${r} ${r} 0 0 1 ${bottom}A${f(rx)} ${r} ${f(a)} 0 ${p > 0.25 ? 1 : 0} ${top}Z`
    : `M${top}A${r} ${r} 0 0 0 ${bottom}A${f(rx)} ${r} ${f(a)} 0 ${p < 0.75 ? 0 : 1} ${top}Z`;
}
const TIER = { easy: { phase: 0.17, c: "#a8b893" }, medium: { phase: 0.25, c: "#d2b177" }, hard: { phase: 0.5, c: "#cf7c71" } };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function html(card) {
  const t = TIER[card.tier] ?? { phase: 0.5, c: "#ece8de" };
  const meta = [card.difficulty, ...card.topics].filter(Boolean).map(esc).join(" · ");
  const size = card.title.length > 34 ? 70 : card.title.length > 20 ? 84 : 100;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:JB;src:url(${font("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2")});font-weight:100 800}
@font-face{font-family:IS;src:url(${font("@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2")});font-weight:400 700}
@font-face{font-family:SM;src:url(${font("@fontsource/shippori-mincho/files/shippori-mincho-latin-500-normal.woff")});font-weight:500}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{position:relative;font-family:IS;color:#e1e5ea;background:radial-gradient(circle 560px at 1010px 250px,rgba(143,179,232,.08),transparent 70%),radial-gradient(circle 320px at 1010px 250px,rgba(236,232,222,.05),transparent 70%),#0b0e13}
.top{position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:16px;font-size:24px;color:#939eab}
.top b{font-family:JB;font-weight:600;letter-spacing:-.5px;color:#eef0f3}
.kind{color:#8fb3e8}
.title{position:absolute;left:76px;top:170px;width:760px;font-family:SM;font-weight:500;font-size:${size}px;line-height:1.08;letter-spacing:-1px;color:#eef0f3}
.meta{position:absolute;left:80px;bottom:150px;width:760px;font-size:28px;color:#b6bec8}
.meta i{font-style:normal;color:${t.c}}
.foot{position:absolute;left:80px;bottom:70px;display:flex;gap:18px;align-items:baseline;font-size:24px;color:#939eab}
.foot b{font-family:JB;font-weight:600;font-size:26px;letter-spacing:-.6px;color:#eef0f3}
.moon{position:absolute;left:880px;top:130px;width:260px;height:260px;filter:drop-shadow(0 0 40px ${t.c}33)}
</style></head><body>
<div class="top"><b>aaadarsh1337</b><span>·</span><span class="kind">${esc(card.kind)}</span></div>
<div class="title">${esc(card.title)}</div>
<div class="meta">${meta.replace(esc(card.difficulty ?? "\u0000"), `<i>${esc(card.difficulty ?? "")}</i>`)}</div>
<div class="foot"><b>Adarsh Pillai</b><span>aaadarsh1337.github.io</span></div>
<svg class="moon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.4" fill="none" stroke="${t.c}" stroke-opacity=".18" stroke-width=".4"/><circle cx="12" cy="12" r="10" fill="#1a1d22" stroke="${t.c}" stroke-opacity=".3" stroke-width=".3"/><path d="${lit(t.phase)}" fill="${t.c}"/></svg>
</body></html>`;
}

const work = mkdtempSync(join(tmpdir(), "og-cards-"));
let made = 0, fell = 0;
for (const card of cards) {
  const out = join(dist, card.out);
  mkdirSync(dirname(out), { recursive: true });
  let ok = false;
  if (chrome) {
    const page = join(work, "card.html");
    writeFileSync(page, html(card));
    const r = spawnSync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
      `--user-data-dir=${join(work, "profile")}`, "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=4000",
      `--screenshot=${out}`, pathToFileURL(page).href], { stdio: "ignore", timeout: 60000 });
    ok = r.status === 0 && existsSync(out);
  }
  if (ok) made++; else { copyFileSync(fallback, out); fell++; }
}
rmSync(work, { recursive: true, force: true });
rmSync(manifest);
console.log(`og-cards: ${made} rendered${fell ? `, ${fell} fell back to the site card${chrome ? "" : " (no Chrome found)"}` : ""}`);
