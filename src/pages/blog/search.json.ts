import { getPosts } from "../../lib/blog";
import { iso } from "../../lib/format";
export async function GET() {
  const list = (await getPosts()).map((p) => ({
    title: p.title, category: p.categoryLabel, url: `${p.category}/${p.slug}/`, summary: p.summary, tags: p.tags, date: iso(p.date),
  }));
  return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
}
