// sitemap.txt: the same pages as sitemap.xml (lib/sitemap.ts), as the plain-text sitemap
// format: one absolute URL per line, UTF-8. Rebuilds with every deploy.
import type { APIRoute } from "astro";
import { sitemapPages } from "../lib/sitemap";

export const GET: APIRoute = async () =>
  new Response((await sitemapPages()).map((p) => p.loc).join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
