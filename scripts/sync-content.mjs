// Pulls everything the build reads from outside this repo into content-src/,
// and copies writeup/blog images into public/ so they keep their old URLs.
//
//   node scripts/sync-content.mjs                 clone/pull from GitHub
//   WRITEUPS_DIR=../ctf-writeups BLOG_DIR=../security-blog node scripts/sync-content.mjs
//
// Every network step is optional: when GitHub or the sensor is unreachable the
// committed snapshots in src/data/ are used and the build still succeeds.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "content-src");
const USER = "aaadarsh1337";
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

function repo(name, envDir) {
  const dest = join(src, name);
  const local = process.env[envDir];
  if (local) {
    rmSync(dest, { recursive: true, force: true });
    cpSync(resolve(local), dest, { recursive: true, filter: (p) => !/\/\.git(\/|$)/.test(p) });
    console.log(`  ${name}: copied from ${local}`);
  } else if (existsSync(join(dest, ".git"))) {
    execFileSync("git", ["-C", dest, "pull", "--ff-only", "-q"], { stdio: "inherit" });
    console.log(`  ${name}: pulled`);
  } else if (existsSync(dest) && readdirSync(dest).length) {
    console.log(`  ${name}: using existing checkout`);
  } else {
    execFileSync("git", ["clone", "--depth", "1", "-q", `https://github.com/${USER}/${name}.git`, dest], { stdio: "inherit" });
    console.log(`  ${name}: cloned`);
  }
  return dest;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const p = join(dir, entry);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

// Images live next to the markdown; the page for a writeup is served from the
// same relative path, so copying keeps `![x](flag.png)` working unchanged.
function publishImages(from, to, map = (p) => p) {
  rmSync(to, { recursive: true, force: true });
  let n = 0;
  for (const file of walk(from).filter((p) => IMAGE.test(p))) {
    const dest = join(to, map(relative(from, file)));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(file, dest);
    n++;
  }
  return n;
}

async function fetchJson(url, file) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": `${USER}-site-build` }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    writeFileSync(join(src, file), JSON.stringify(data));
    console.log(`  ${file}: fetched`);
  } catch (err) {
    rmSync(join(src, file), { force: true });
    console.log(`  ${file}: unavailable (${err.message}); snapshot will be used`);
  }
}

mkdirSync(src, { recursive: true });
console.log("sync-content");
const writeups = repo("ctf-writeups", "WRITEUPS_DIR");
const blog = repo("security-blog", "BLOG_DIR");

console.log(`  images: ${publishImages(writeups, join(root, "public/writeups"))} writeup`);

// Blog posts share a category folder, so each post's images are copied into
// that post's own URL: posts/<cat>/x.png -> /blog/<cat>/<slug>/x.png.
// The slug rule must match src/lib/blog.ts.
const blogOut = join(root, "public/blog");
rmSync(blogOut, { recursive: true, force: true });
let blogImages = 0;
for (const md of walk(join(blog, "posts")).filter((p) => p.endsWith(".md"))) {
  const text = readFileSync(md, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const field = (k) => fm.match(new RegExp(`^${k}:\\s*["']?(.*?)["']?\\s*$`, "m"))?.[1];
  if (field("draft") === "true") continue;
  const category = relative(join(blog, "posts"), dirname(md)).split("/")[0];
  const slug = field("slug") || basename(md, ".md");
  for (const [, ref] of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    const file = join(dirname(md), decodeURIComponent(ref));
    if (/^[a-z]+:/i.test(ref) || !IMAGE.test(ref) || !existsSync(file)) continue;
    const dest = join(blogOut, category, slug, ref);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(file, dest);
    blogImages++;
  }
}
console.log(`  images: ${blogImages} blog`);

if (!process.env.OFFLINE) {
  await fetchJson(`https://raw.githubusercontent.com/${USER}/threat-harbour/main/analysis/metrics.json`, "metrics.json");
  await fetchJson(`https://api.github.com/users/${USER}/repos?per_page=100`, "repos.json");
  // Threat Harbour's own diagram, shown on /intel/ when it can be fetched
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${USER}/threat-harbour/main/diagrams/session-funnel.png`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    mkdirSync(join(root, "public/intel"), { recursive: true });
    writeFileSync(join(root, "public/intel/session-funnel.png"), Buffer.from(await res.arrayBuffer()));
    console.log("  session-funnel.png: fetched");
  } catch (err) {
    rmSync(join(root, "public/intel/session-funnel.png"), { force: true });
    console.log(`  session-funnel.png: unavailable (${err.message})`);
  }
}
