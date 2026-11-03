// After a deploy: tell IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing also feeds
// ChatGPT search, Copilot and DuckDuckGo) which pages changed. Reads the live sitemap and
// sends pages whose lastmod is recent, plus the home page. Never fails the deploy.
const SITE = "https://aaadarsh1337.github.io";
const KEY = "d373b1d4fcf95feedfd436fce4afd728";                                  // public by design: served at /d373b1d4fcf95feedfd436fce4afd728.txt
const RECENT_DAYS = 3;

try {
  const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
  const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map(([, loc, lastmod]) => ({ loc, lastmod }));
  const since = Date.now() - RECENT_DAYS * 864e5;
  const urls = [...new Set([`${SITE}/`, ...entries.filter((e) => e.lastmod && Date.parse(e.lastmod) >= since).map((e) => e.loc)])];
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  });
  console.log(`IndexNow: ${res.status} for ${urls.length} URL(s)`, urls);
} catch (e) {
  console.log("IndexNow skipped:", e.message);
}
