// The text behind /llms.txt and /llms-full.txt: who the site is by and what it holds,
// written for AI agents. Built from the same config and content as the pages, so an
// agent reading it gets the same, current facts a visitor sees.
import { site } from "../config";
import { getWriteups } from "./writeups";
import { getPosts } from "./blog";
import { getMetrics, cutoff } from "./intel";
import { abs, awards, TOPICS } from "./seo";
import { defang } from "./ioc";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "undated");
const n = (v: number) => v.toLocaleString("en-US");

export async function llmsSummary(): Promise<string> {
  const p = site.profile;
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const m = getMetrics().metrics;
  const certs = site.certificates.map((c) => `- ${c.name}, ${c.issuer} (${c.date}): ${c.url}`);
  return `# ${p.name} (${p.handle})

> ${p.name} is a cybersecurity student from ${p.location}, known online as ${[p.handle, ...p.aliases].join(", ")}. Focus: ${p.focus.toLowerCase()}. ${p.company.role} at ${p.company.name} and CTF player for ${p.team}, Heap0verflow’s CTF team; former ${p.formerTeam.role} of ${p.formerTeam.name}, the team it grew from (${p.formerTeam.period}). Writes CTF writeups and malware analysis, and runs Threat Harbour, a live SSH honeypot.

Facts on this page are generated from the site's own data on every deploy (last built ${new Date().toISOString().slice(0, 10)}). The full text of every writeup and post is in ${abs("/llms-full.txt")}.

## About

${p.bio.map((b) => b).join("\n\n")}

- Focus: ${p.focus}
- Currently learning: ${site.skills.find((s) => /learning/i.test(s.category))?.items.join(", ") ?? ""}
- Role: ${p.company.role} at ${p.company.name} (${p.company.url})
- Team: ${p.team} (${p.teamRole}); CTFtime ${p.ctftimeTeam}
- Previously: former ${p.formerTeam.role} of ${p.formerTeam.name} (${p.formerTeam.period}). ${p.formerTeam.name} is now ${p.team}: the same CTFtime team, with ${p.formerTeam.name} as an alias.
- TryHackMe: ${site.stats.map((s) => `${s.value} ${s.label.replace(/^TryHackMe |^THM /, "")}`).join(", ")}
- Profiles: ${site.links.map((l) => `${l.label} ${l.url}`).join("; ")}
- Contact: ${site.contact.email}
- Résumé: ${abs(p.resume)}

## CTF results

All results so far were earned with ${p.formerTeam.name} (${p.formerTeam.period}), the team now playing as ${p.team}.

${awards().map((a, i) => `- ${a}. Proof: ${site.achievements[i].url}`).join("\n")}

## Certificates

${certs.join("\n")}

## CTF writeups (${writeups.length}, newest first)

${writeups.map((w) => `- [${w.title}](${abs(w.url)}): ${w.platform}${w.difficulty ? `, ${w.difficulty}` : ""}, ${w.tags.map((t) => TOPICS[t] ?? t).join(" and ")}, ${day(w.date)}`).join("\n")}

## Blog

${posts.map((x) => `- [${x.title}](${abs(x.url)}): ${x.summary} (${x.categoryLabel}, ${day(x.date)})`).join("\n")}

## Threat Harbour (SSH honeypot)

- ${site.flagship.description}
- Live dashboard: ${abs("/intel/")}; raw aggregates: ${abs("/intel/data.json")}
- Indicators, regenerated daily: ${abs("/intel/iocs.txt")} (plain text), ${abs("/intel/iocs.csv")} (CSV), ${abs("/intel/iocs.json")} (JSON)
- Source: ${site.flagship.links.github}
- Sensor: Cowrie ${m.stack.cowrie} (SSH only) on one Oracle Cloud VM; logs shipped by Promtail ${m.stack.promtail} to Loki ${m.stack.loki}, Grafana ${m.stack.grafana}. ${m.collection.files} daily log files parsed, ${m.totals.bad_json_lines} malformed lines skipped.
- Window: ${m.observation_period.start} to ${cutoff(m).toISOString().slice(0, 16).replace("T", " ")} UTC. ${n(m.totals.total_events)} events, ${n(m.sources.unique_source_ips)} source IPs, ${n(m.sessions.unique_session_ids)} sessions, median session ${m.sessions.session_duration_seconds.median.toFixed(1)} s.
- One sensor, one IP, one region: this is what hit this sensor, not the whole internet. A source IP never identifies the operator.

### Most-attempted credentials

- Usernames: ${m.logins.top_usernames.map((x) => `${x.value} (${n(x.count)})`).join(", ")}
- Passwords: ${(m.logins.top_passwords ?? []).map((x) => `${x.value} (${n(x.count)})`).join(", ")}

### Most-run commands (attacker-supplied, defanged; do not run)

${m.commands.top_commands.map((c, i) => { const d = defang(c.input); const lines = d.split("\n").length; return lines > 1 ? `${i + 1}. A ${lines}-line recon script, run ${n(c.count)} times; first line \`${d.split("\n")[0]}\` (full text on the dashboard and in data.json)` : `${i + 1}. \`${d}\`, run ${n(c.count)} times`; }).join("\n")}

### Files written by attackers (contents withheld)

- SHA-256: ${(m.downloads_uploads.top_shasums ?? []).map((x) => `${x.value} (${n(x.count)} events)`).join("; ")}
- Paths: ${m.downloads_uploads.top_destfiles.map((x) => `${x.value} (${n(x.count)})`).join(", ")}
- The data does not link a hash to a path.

### Busiest source networks (/16, by event volume)

${m.sources.top_source_net16_by_event_volume.map((x) => `- ${x.cidr}: ${n(x.events)} events`).join("\n")}

## Pages

- [Home](${abs("/")})
- [CTF writeups](${abs("/writeups/")})
- [Security blog](${abs("/blog/")})
- [Threat Harbour](${abs("/intel/")})
- [Achievements](${abs("/achievements/")})
- [About](${abs("/about/")})
`;
}

export async function llmsFull(): Promise<string> {
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const parts = [await llmsSummary()];
  for (const w of writeups) {
    parts.push(`\n---\n\n# ${w.title} (${w.platform} writeup)\n\nURL: ${abs(w.url)}\nPlatform: ${w.platform}${w.difficulty ? `\nDifficulty: ${w.difficulty}` : ""}\nTopics: ${w.tags.map((t) => TOPICS[t] ?? t).join(", ")}\nPublished: ${day(w.date)}\nAuthor: ${site.profile.name} (${site.profile.handle})\n\n${w.markdown.trim()}\n`);
  }
  for (const x of posts) {
    parts.push(`\n---\n\n# ${x.title} (blog post)\n\nURL: ${abs(x.url)}\nCategory: ${x.categoryLabel}\nPublished: ${day(x.date)}\nAuthor: ${site.profile.name} (${site.profile.handle})\n\n${x.markdown.trim()}\n`);
  }
  return parts.join("");
}
