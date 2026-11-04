// Threat Harbour indicators: what the page shows in full, and what /intel/iocs.{txt,csv,json}
// publish. Everything comes from the sensor's metrics.json (lib/intel.ts); nothing is inferred,
// so a hash is never tied to a file path the data doesn't link it to.
import { getMetrics, cutoff } from "./intel";

/** Attacker-typed text, made safe to show and paste: URLs become hxxp://host[.]tld and
 *  IPv4 addresses 1.2.3[.]4, the usual threat-intel convention, so nothing is clickable
 *  or runnable by accident. Applied to commands only; CIDRs stay raw for blocklists. */
export function defang(s: string): string {
  return s
    .replace(/\b(h)tt(ps?):\/\/([^\s/'"`<>]+)/gi, (_m, h, p, host) => `${h}xx${p}://${host.replace(/\./g, "[.]")}`)
    .replace(/\bftp:\/\/([^\s/'"`<>]+)/gi, (_m, host) => `fxp://${host.replace(/\./g, "[.]")}`)
    .replace(/\b((?:\d{1,3}\.){3})(\d{1,3})\b/g, (m, a, b) => (m.split(".").every((o) => +o <= 255) ? `${a.slice(0, -1)}[.]${b}` : m));
}

export const lookups = (sha256: string) => [
  { label: "VirusTotal", url: `https://www.virustotal.com/gui/file/${sha256}` },
  { label: "MalwareBazaar", url: `https://bazaar.abuse.ch/browse.php?search=sha256%3A${sha256}` },
  { label: "Hybrid Analysis", url: `https://www.hybrid-analysis.com/search?query=${sha256}` },
];

export interface Ioc { type: "sha256" | "file_path" | "source_net16" | "password" | "username"; value: string; count: number; note: string }

export function iocs() {
  const { metrics: m } = getMetrics();
  const list: Ioc[] = [
    ...(m.downloads_uploads.top_shasums ?? []).map((x) => ({ type: "sha256" as const, value: x.value, count: x.count, note: "file written by an attacker session" })),
    ...m.downloads_uploads.top_destfiles.map((x) => ({ type: "file_path" as const, value: x.value, count: x.count, note: "destination an attacker wrote to" })),
    ...m.sources.top_source_net16_by_event_volume.map((x) => ({ type: "source_net16" as const, value: x.cidr, count: x.events, note: "source /16 by event volume" })),
    ...(m.logins.top_passwords ?? []).map((x) => ({ type: "password" as const, value: x.value, count: x.count, note: "attempted SSH password" })),
    ...m.logins.top_usernames.map((x) => ({ type: "username" as const, value: x.value, count: x.count, note: "attempted SSH username" })),
  ];
  return {
    list,
    from: m.observation_period.start,
    to: cutoff(m).toISOString().replace(/\.\d+Z$/, "Z"),
    sensor: `Cowrie ${m.stack.cowrie}, single SSH sensor`,
  };
}
