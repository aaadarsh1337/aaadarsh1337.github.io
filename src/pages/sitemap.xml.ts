// sitemap.xml for search engines (the page list lives in lib/sitemap.ts, shared with
// sitemap.txt). Submit it once in Search Console; it rebuilds with every deploy.
// robots.txt points crawlers here.
import type { APIRoute } from "astro";
import { sitemapPages } from "../lib/sitemap";

export const GET: APIRoute = async () => {
  const pages = await sitemapPages();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${p.loc}</loc><lastmod>${p.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
