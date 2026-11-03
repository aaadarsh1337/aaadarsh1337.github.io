// Build-time manifest for scripts/og-cards.mjs: one share card per writeup and post.
// The script renders dist/og/**.png from it after `astro build`, then deletes it.
import type { APIRoute } from "astro";
import { getWriteups } from "../../lib/writeups";
import { getPosts } from "../../lib/blog";
import { TOPICS, cardFor } from "../../lib/seo";

export const GET: APIRoute = async () => {
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const cards = [
    ...writeups.map((w) => ({ out: cardFor.writeup(w.id), kind: `${w.platform} writeup`, title: w.title, tier: w.tier, difficulty: w.difficulty, topics: w.tags.map((t) => TOPICS[t] ?? t) })),
    ...posts.map((p) => ({ out: cardFor.post(p.category, p.slug), kind: p.categoryLabel, title: p.title, tier: null, difficulty: null, topics: p.tags.map((t) => t.replace(/-/g, " ")) })),
  ];
  return new Response(JSON.stringify(cards), { headers: { "Content-Type": "application/json" } });
};
