// The text behind /llms.txt and /llms-full.txt: who the site is by and what it holds,
// written for AI agents. Built from the same config and content as the pages, so an
// agent reading it gets the same, current facts a visitor sees.
import { site } from "../config";
import { getWriteups } from "./writeups";
import { getPosts } from "./blog";
import { getMetrics, cutoff } from "./intel";
import { abs, awards, TOPICS } from "./seo";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "undated");

export async function llmsSummary(): Promise<string> {
  const p = site.profile;
  const [writeups, posts] = await Promise.all([getWriteups(), getPosts()]);
  const m = getMetrics().metrics;
  const certs = site.certificates.map((c) => `- ${c.name}, ${c.issuer} (${c.date}): ${c.url}`);
  return `# ${p.name} (${p.handle})

> ${p.name} is a cybersecurity student from ${p.location}, known online as ${[p.handle, ...p.aliases].join(", ")}. Focus: ${p.focus.toLowerCase()}. ${p.teamRole[0].toUpperCase() + p.teamRole.slice(1)} of the CTF team ${p.team}. Writes CTF writeups and malware analysis, and runs Threat Harbour, a live SSH honeypot.

Facts on this page are generated from the site's own data on every deploy (last built ${new Date().toISOString().slice(0, 10)}). The full text of every writeup and post is in ${abs("/llms-full.txt")}.

## About

${p.bio.map((b) => b).join("\n\n")}

- Focus: ${p.focus}
- Currently learning: ${site.skills.find((s) => /learning/i.test(s.category))?.items.join(", ") ?? ""}
- Team: ${p.team} (${p.teamRole})
- TryHackMe: ${site.stats.map((s) => `${s.value} ${s.label.replace(/^TryHackMe |^THM /, "")}`).join(", ")}
- Profiles: ${site.links.map((l) => `${l.label} ${l.url}`).join("; ")}
- Contact: ${site.contact.email}
- Résumé: ${abs(p.resume)}

## CTF results with ${p.team}

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
- As of ${cutoff(m).toISOString().slice(0, 16).replace("T", " ")} UTC: ${m.totals.total_events.toLocaleString("en-US")} SSH events from ${m.sources.unique_source_ips.toLocaleString("en-US")} source IPs since ${m.observation_period.start}.
- Source: ${site.flagship.links.github}

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
