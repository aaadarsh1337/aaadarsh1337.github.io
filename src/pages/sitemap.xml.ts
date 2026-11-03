// sitemap.xml for search engines: every real page, with the date its content last
// changed (writeup/post dates, the honeypot's data cutoff). Submit it once in Search
// Console; it rebuilds with every deploy. robots.txt points crawlers here.
import type { APIRoute } from "astro";
import { getWriteups } from "../lib/writeups";
import { getPosts } from "../lib/blog";
import { getMetrics, cutoff } from "../lib/intel";
import { abs } from "../lib/seo";

const day = (d: Date | null | undefined) => (d && !isNaN(+d) ? d.toISOString().slice(0, 10) : undefined);
const newest = (ds: (Date | null)[]) => ds.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

export const GET: APIRoute = async () => {
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const intel = cutoff(getMetrics().metrics);
  const latestWriteup = newest(writeups.map((w) => w.date));
  const latestPost = newest(posts.map((p) => p.date));
  const pages: { url: string; lastmod?: string }[] = [
    { url: "/", lastmod: day(newest([latestWriteup, latestPost, intel])) },
    { url: "/writeups/", lastmod: day(latestWriteup) },
    ...writeups.map((w) => ({ url: w.url, lastmod: day(w.date) })),
    { url: "/blog/", lastmod: day(latestPost) },
    ...[...new Set(posts.map((p) => p.category))].map((c) => ({ url: `/blog/${c}/`, lastmod: day(newest(posts.filter((p) => p.category === c).map((p) => p.date))) })),
    ...posts.map((p) => ({ url: p.url, lastmod: day(p.date) })),
    { url: "/intel/", lastmod: day(intel) },
    { url: "/achievements/" },
    { url: "/about/" },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${abs(p.url)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
