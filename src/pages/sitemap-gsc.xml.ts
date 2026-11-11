// sitemap-gsc.xml: an exact copy of sitemap.xml under a second name (for Google Search
// Console). It reuses that route's handler, so the two are always byte-identical and
// both rebuild with every deploy.
export { GET } from "./sitemap.xml";
