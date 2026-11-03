// What search engines and AI agents are told about the site: the person behind it,
// search-friendly descriptions, and plain titles. All facts come from config.ts and
// the content repos, so the sitemap, structured data and llms.txt can't drift apart.
import { site } from "../config";
import type { Writeup } from "./writeups";

export const abs = (path: string) => new URL(path, site.url).href;
export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;

/** Titles from content may carry an em or en dash ("Honeypot Worm — bendi.py");
 *  everywhere the site writes a title it reads "Honeypot Worm: bendi.py" instead. */
export const plainTitle = (s: string) => s.replace(/\s+[—–]\s+/g, ": ").replace(/[—–]/g, "-");

/** Where each page's share card is rendered (scripts/og-cards.mjs). */
export const cardFor = {
  writeup: (id: string) => `/og/writeups/${id}.png`,
  post: (category: string, slug: string) => `/og/blog/${category}/${slug}.png`,
};

export const TOPICS: Record<string, string> = {
  rev: "reverse engineering", pwn: "binary exploitation", crypto: "cryptography", web: "web exploitation",
  forensics: "forensics", osint: "OSINT", cloud: "cloud security", misc: "misc",
};

const rankOf = (detail: string) => detail.match(/#(\d+)/)?.[1];
export const awards = () => site.achievements.map((a) => {
  const r = rankOf(a.detail);
  const rest = a.detail.replace(/^.*?#\d+\s*/, "").trim();
  return `${r ? `#${r} ` : ""}${rest ? `${rest} ` : ""}at ${a.title} with ${site.profile.team}`.replace(/\s+/g, " ");
});

/** The schema.org Person: name, every handle, the work, and every other profile. */
export function person() {
  const p = site.profile;
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: p.name,
    alternateName: [p.handle, ...p.aliases],
    url: site.url,
    image: abs(p.avatarFallback),
    description: `Cybersecurity student focused on ${p.focus.toLowerCase()}, CTFs with ${p.team} (${p.teamRole}), malware analysis and the Threat Harbour SSH honeypot.`,
    knowsAbout: ["Reverse engineering", "Binary exploitation", "Malware analysis", "Capture the flag (CTF)", "Threat intelligence", "Honeypots", "OSINT", "Web exploitation"],
    memberOf: { "@type": "Organization", name: p.team, description: "CTF team" },
    homeLocation: { "@type": "Country", name: p.location },
    award: awards(),
    sameAs: site.links.map((l) => l.url),
  };
}
export const personRef = () => ({ "@type": "Person", "@id": PERSON_ID, name: site.profile.name, url: site.url });

export function website() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.profile.name,
    alternateName: site.profile.handle,
    url: site.url,
    inLanguage: "en",
    author: personRef(),
  };
}

const an = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

/** "Ransim 1: a Medium reverse engineering and cryptography challenge on ReRange,
 *  solved step by step. The task: “Reverse this ransomware sim…”" */
export function writeupDescription(w: Writeup): string {
  const topics = w.tags.map((t) => TOPICS[t] ?? t);
  const what = topics.length > 1 ? `${topics.slice(0, -1).join(", ")} and ${topics.at(-1)}` : topics[0] ?? "security";
  const kind = w.difficulty ? `${w.difficulty} ${what}` : what;
  let text = `${w.title}: ${an(kind)} ${kind} challenge on ${w.platform}, solved step by step.`;
  // the challenge's own prompt, when the writeup quotes it, says what it's actually about
  const quote = w.body.html.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/)?.[1];
  const task = quote ? strip(quote) : "";
  if (task && !/flag\{|ReRange\{|picoCTF\{/i.test(task) && task.length <= 150) text += ` The task: “${task}”`;
  return text;
}
