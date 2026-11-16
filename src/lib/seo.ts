// What search engines and AI agents are told about the site: the person behind it,
// search-friendly descriptions, and plain titles. All facts come from config.ts and
// the content repos, so the sitemap, structured data and llms.txt can't drift apart.
import { site } from "../config";

export const abs = (path: string) => new URL(path, site.url).href;
export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;

/** Titles from content may carry an em or en dash ("Honeypot Worm \u2014 bendi.py");
 *  everywhere the site writes a title it reads "Honeypot Worm: bendi.py" instead. */
export const plainTitle = (s: string) => s.replace(/\s+[\u2014\u2013]\s+/g, ": ").replace(/[\u2014\u2013]/g, "-");

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
  return `${r ? `#${r} ` : ""}${rest ? `${rest} ` : ""}at ${a.title} with ${a.team}`.replace(/\s+/g, " ");
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
    description: `${p.company.role} at ${p.company.name}, and a cybersecurity student. Plays CTFs for ${p.team}; former ${p.formerTeam.role} of ${p.formerTeam.name}. Malware analysis and the Threat Harbour SSH honeypot.`,
    jobTitle: p.company.role,
    worksFor: { "@type": "Organization", name: p.company.name, url: p.company.url },
    knowsAbout: ["Reverse engineering", "Binary exploitation", "Malware analysis", "Capture the flag (CTF)", "Threat intelligence", "Honeypots", "OSINT", "Web exploitation"],
    memberOf: { "@type": "Organization", name: p.team, alternateName: p.formerTeam.name, url: p.ctftimeTeam, description: `${p.company.name}’s CTF team, formerly ${p.formerTeam.name}` },
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
