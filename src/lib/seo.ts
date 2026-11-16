// What search engines and AI agents are told about the site: the person behind it,
// search-friendly descriptions, and plain titles. All facts come from config.ts and
// the content repos, so the sitemap, structured data and llms.txt can't drift apart.
import { site } from "../config";

export const abs = (path: string) => new URL(path, site.url).href;
export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;
export const GROUP_ID = `${site.url}/heap0verflow/#group`;
export const TEAM_ID = `${site.url}/heap0verflow/#h3ap`;

/** Heap0verflow and its CTF team, for search engines: what the /heap0verflow/ page says. */
export function group() {
  const p = site.profile, g = p.group;
  return [
    {
      "@type": "Organization", "@id": GROUP_ID, name: g.name, url: g.website || abs(g.page),
      description: `${g.name} is a small, ${g.kind}. Its members compete in CTFs as ${p.team} and collaborate on security research and bug bounty hunting. It is not a company and offers no services.`,
      foundingDate: "2026-11", sameAs: [g.linkedin, ...(g.website ? [g.website] : [])],
      subOrganization: { "@id": TEAM_ID }, member: { "@id": PERSON_ID },
    },
    {
      "@type": "SportsTeam", "@id": TEAM_ID, name: p.team, alternateName: p.formerTeam.name, sport: "Capture the flag (CTF)",
      url: p.ctftimeTeam, parentOrganization: { "@id": GROUP_ID },
      description: `${g.name}’s CTF team, for members only. Known as ${p.formerTeam.name} until ${g.formed}.`,
    },
  ];
}

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
    description: `${p.group.role} with ${p.group.name}, an ${p.group.kind}, and a cybersecurity student. Plays CTFs for ${p.team}; former ${p.formerTeam.role} of ${p.formerTeam.name}. Malware analysis and the Threat Harbour SSH honeypot.`,
    knowsAbout: ["Reverse engineering", "Binary exploitation", "Malware analysis", "Capture the flag (CTF)", "Threat intelligence", "Honeypots", "OSINT", "Web exploitation"],
    // a member, not an employee: Heap0verflow is a group, not a company
    memberOf: [
      { "@type": "Organization", "@id": GROUP_ID, name: p.group.name, url: p.group.website || abs(p.group.page) },
      { "@type": "SportsTeam", "@id": TEAM_ID, name: p.team, alternateName: p.formerTeam.name, url: p.ctftimeTeam },
    ],
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
