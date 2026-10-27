// Same shape as the previous site's /writeups/search.json, for anything that consumed it.
import { getWriteups } from "../../lib/writeups";
import { iso } from "../../lib/format";
export async function GET() {
  const list = (await getWriteups()).map((w) => ({
    title: w.title, event: w.platform, url: `${w.id}/`, difficulty: w.difficulty, tags: w.tags,
    day: null, date: iso(w.date) || null, excerpt: w.body.excerpt,
  }));
  return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
}
