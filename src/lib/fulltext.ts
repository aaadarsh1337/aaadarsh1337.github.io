// Full-text search over writeup and post bodies, using the Pagefind index that
// `npm run build` writes to dist/pagefind/ after `astro build`. In `astro dev`
// there is no index, and callers just get no hits.
export interface Hit { url: string; excerpt: string; meta: { title?: string; kind?: string } }
type Pagefind = {
  init?: () => Promise<void>;
  search: (q: string) => Promise<{ results: { data: () => Promise<Hit> }[] }>;
};

let loading: Promise<Pagefind | null> | null = null;
function load() {
  const path = "/pagefind/pagefind.js";   // a runtime path, not a module for Vite to bundle
  return (loading ??= import(/* @vite-ignore */ path)
    .then(async (m: Pagefind) => { await m.init?.(); return m; })
    .catch(() => null));
}

export async function fulltext(q: string, limit = 8): Promise<Hit[]> {
  if (q.trim().length < 3) return [];
  const pf = await load();
  if (!pf) return [];
  const r = await pf.search(q);
  return Promise.all(r.results.slice(0, limit).map((x) => x.data()));
}

/** Pagefind excerpts are escaped text with <mark> around the matches: rebuild them
 *  as DOM so nothing else in an excerpt can ever become markup. */
export function excerptNodes(html: string): Node[] {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return [...tpl.content.childNodes].map((n) => {
    if (n.nodeName === "MARK") { const m = document.createElement("mark"); m.textContent = n.textContent; return m; }
    return document.createTextNode(n.textContent ?? "");
  });
}
