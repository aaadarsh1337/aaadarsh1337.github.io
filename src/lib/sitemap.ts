// The site's page list for search engines, shared by /sitemap.xml and /sitemap.txt so the
// two can never disagree. Every real page, with the date its content last changed
// (writeup/post dates, the honeypot's data cutoff). Rebuilt with every deploy.
import { getWriteups } from "./writeups";
import { getPosts } from "./blog";
import { getMetrics, cutoff } from "./intel";
import { abs } from "./seo";
import { site } from "../config";

const SITE_UPDATED = new Date(`${site.siteUpdated}T00:00:00Z`);
// a page changed when its content did, or when the whole site did, whichever is later
const day = (d: Date | null | undefined) => (d && !isNaN(+d) ? (d > SITE_UPDATED ? d : SITE_UPDATED) : SITE_UPDATED).toISOString().slice(0, 10);
const newest = (ds: (Date | null)[]) => ds.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0];

export async function sitemapPages(): Promise<{ loc: string; lastmod: string }[]> {
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const intel = cutoff(getMetrics().metrics);
  const latestWriteup = newest(writeups.map((w) => w.date));
  const latestPost = newest(posts.map((p) => p.date));
  return [
    { url: "/", lastmod: day(newest([latestWriteup, latestPost, intel])) },
    { url: "/writeups/", lastmod: day(latestWriteup) },
    ...writeups.map((w) => ({ url: w.url, lastmod: day(w.date) })),
    { url: "/blog/", lastmod: day(latestPost) },
    ...[...new Set(posts.map((p) => p.category))].map((c) => ({ url: `/blog/${c}/`, lastmod: day(newest(posts.filter((p) => p.category === c).map((p) => p.date))) })),
    ...posts.map((p) => ({ url: p.url, lastmod: day(p.date) })),
    { url: "/intel/", lastmod: day(intel) },
    { url: "/achievements/", lastmod: day(null) },
    { url: "/about/", lastmod: day(null) },
  ].map((p) => ({ loc: abs(p.url), lastmod: p.lastmod }));
}
