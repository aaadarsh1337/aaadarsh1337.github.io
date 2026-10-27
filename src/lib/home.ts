// Everything the home page shows, from the real content (no writeup images).
import { site } from "../config";
import { getWriteups } from "./writeups";
import { getPosts } from "./blog";
import { getMetrics } from "./intel";

export async function homeData() {
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const { metrics } = getMetrics();
  const latest = [
    ...writeups.map((w) => ({ kind: "writeup" as const, title: w.title, url: w.url, date: w.date, where: w.platform, tier: w.tier, difficulty: w.difficulty, tags: w.tags })),
    ...posts.map((p) => ({ kind: "blog" as const, title: p.title, url: p.url, date: p.date, where: p.categoryLabel, tier: null, difficulty: null, tags: p.tags.slice(0, 2) })),
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  const ranked = [...site.achievements]
    .map((a) => ({ ...a, rank: Number(a.detail.match(/#(\d+)/)?.[1] ?? 999) }))
    .sort((a, b) => a.rank - b.rank);
  return {
    writeups, posts, metrics, latest, ranked,
    platforms: new Set(writeups.map((w) => w.platform)).size,
    skills: site.skills.flatMap((s) => s.items.map((i) => i.replace(/^[A-Za-z]+: /, ""))).flatMap((i) => i.split(", ")),
  };
}
