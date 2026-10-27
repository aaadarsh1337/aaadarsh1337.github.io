// Public repos, fetched at build time by sync-content (snapshot fallback).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { site } from "../config";
import snapshot from "../data/repos-snapshot.json";

export interface Repo { name: string; description: string | null; language: string | null; url: string; pushed: Date; stars: number; pinned: boolean }

export function getRepos(): Repo[] {
  const live = join(process.cwd(), "content-src/repos.json");
  let raw: typeof snapshot = snapshot;
  try { if (existsSync(live)) { const r = JSON.parse(readFileSync(live, "utf8")); if (Array.isArray(r) && r.length) raw = r; } } catch { /* snapshot */ }
  const pinned: readonly string[] = site.github.pinnedRepos;
  return raw
    .filter((r) => !r.fork && !r.archived && !(site.github.hiddenRepos as readonly string[]).includes(r.name))
    .map((r) => ({ name: r.name, description: r.description, language: r.language, url: r.html_url, pushed: new Date(r.pushed_at), stars: r.stargazers_count, pinned: pinned.includes(r.name) }))
    .sort((a, b) => {
      const pa = pinned.indexOf(a.name), pb = pinned.indexOf(b.name);
      if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return b.pushed.getTime() - a.pushed.getTime();
    });
}
