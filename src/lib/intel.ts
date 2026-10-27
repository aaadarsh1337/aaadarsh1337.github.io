// Threat Harbour metrics: the live metrics.json fetched by sync-content, or the
// committed snapshot when the fetch failed / returned something unusable.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import snapshot from "../data/intel-snapshot.json";

export type Metrics = typeof snapshot;

function usable(m: unknown): m is Metrics {
  const x = m as Metrics | undefined;
  return !!x?.totals?.total_events && !!x?.collection?.per_day_utc && Array.isArray(x?.logins?.top_usernames);
}

let cached: { metrics: Metrics; live: boolean } | undefined;
export function getMetrics() {
  if (cached) return cached;
  const live = join(process.cwd(), "content-src/metrics.json");
  if (existsSync(live)) {
    try {
      const m = JSON.parse(readFileSync(live, "utf8"));
      if (usable(m)) return (cached = { metrics: m, live: true });
    } catch { /* fall through to snapshot */ }
  }
  return (cached = { metrics: snapshot, live: false });
}

export function days(m: Metrics) {
  return Object.entries(m.collection.per_day_utc as Record<string, number>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, events]) => ({ day, events }));
}

export function cutoff(m: Metrics) {
  return new Date(m.analysis_cutoff_utc);
}
