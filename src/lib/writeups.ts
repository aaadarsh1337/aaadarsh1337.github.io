// CTF writeups from the ctf-writeups repo (synced into content-src/).
//
// Layout of the source repo:  <platform>/<challenge>/notes.md  (+ any files)
// Each folder becomes /writeups/<platform>/<challenge>/, the same URL as the
// previous site, so existing links keep working.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { frontmatter, render, type Rendered } from "./markdown";
import { site } from "../config";
import difficultyCache from "../data/difficulty-cache.json";

const ROOT = join(process.cwd(), "content-src/ctf-writeups");
const NOTE_FILES = ["notes.md", "NOTES.md", "writeup.md", "WRITEUP.md", "README.md", "readme.md", "solution.md", "SOLUTION.md"];
const SKIP = new Set([".git", ".github", "node_modules", "__pycache__"]);

export const PLATFORM_LABELS: Record<string, string> = {
  tryhackme: "TryHackMe",
  pwnable_kr: "pwnable.kr",
  picoctf: "picoCTF",
  hackerholidays: "Hacker Holidays",
  rerange: "ReRange",
};

export type Tier = "easy" | "medium" | "hard";
export interface Attachment { path: string; name: string; dir: string; size: number; kind: string; url: string; self: boolean }
export interface Writeup {
  id: string;              // "ReRange/Steganography" — also the URL path
  url: string;             // "/writeups/ReRange/Steganography/"
  title: string;           // frontmatter title, verbatim
  platform: string;        // display label
  platformId: string;      // folder name
  date: Date | null;
  difficulty: string | null;
  tier: Tier | null;
  tags: string[];
  source: string;          // GitHub tree URL of the folder
  attachments: Attachment[];
  body: Rendered;
  prev?: Pick<Writeup, "title" | "url">;
  next?: Pick<Writeup, "title" | "url">;
}

// ---------------------------------------------------------------------------
// Difficulty: frontmatter wins, then the verified cache, else no badge.
export function tierFor(label: string): Tier {
  const low = label.toLowerCase();
  if (/grotesque|hacker|secret|advanced|hard|insane|expert/.test(low)) return "hard";
  if (/rookiss|intermediate|medium|moderate/.test(low)) return "medium";
  if (/toddler|beginner|easy|intro/.test(low)) return "easy";
  return "medium";
}

// ---------------------------------------------------------------------------
// Tags: frontmatter `tags:` wins; otherwise keyword scoring ported from the
// old build_writeups.py so existing writeups keep the same categories.
export const TAG_ORDER = ["rev", "pwn", "web", "crypto", "forensics", "cloud", "osint", "misc"];
const TAG_ALIASES: Record<string, string> = {
  re: "rev", reverse: "rev", reversing: "rev", "reverse-engineering": "rev",
  binexp: "pwn", exploit: "pwn", exploitation: "pwn", "binary-exploitation": "pwn",
  "web-exploitation": "web", cryptography: "crypto", crypt: "crypto",
  forensic: "forensics", dfir: "forensics", stego: "forensics", steganography: "forensics",
  general: "misc", other: "misc",
};
const SIGNALS: Record<string, [RegExp, number][]> = {
  rev: [[/reverse.engineering|reversing/g, 3], [/\bghidra\b/g, 3], [/binary[\s-]?ninja/g, 3], [/\bida\b/g, 2], [/\bradare2?\b/g, 2],
    [/\bobjdump\b/g, 2], [/\bstrings\b/g, 1], [/decompil/g, 2], [/disassembl/g, 2], [/\bilspy\b|\bdnspy\b/g, 3], [/\bopcode\b/g, 2],
    [/crackme/g, 3], [/keygen/g, 2], [/\.xpi\b/g, 2], [/browser extension/g, 2], [/widechar/g, 2], [/\bxor\b/g, 1]],
  pwn: [[/pwntools/g, 3], [/shellcode/g, 3], [/\brop\b/g, 3], [/ret2/g, 3], [/\bplt\b/g, 2], [/\btcache\b/g, 3], [/heap exploit/g, 3],
    [/buffer overflow/g, 3], [/stack overflow/g, 2], [/format.string/g, 2], [/\blibc\b/g, 2], [/segmentation fault|segfault/g, 2],
    [/pwndbg|\bgdb\b/g, 2], [/binary exploitation/g, 4], [/pwnable/g, 2]],
  web: [[/\bburp\b/g, 3], [/\bsqli\b|sql injection/g, 3], [/\bxss\b|cross.site.script/g, 3], [/\bssti\b|template injection/g, 3],
    [/\blfi\b|\brfi\b|file inclusion/g, 3], [/command injection/g, 3], [/path traversal|zip slip/g, 3], [/webshell|reverse shell/g, 2],
    [/vulnerable.*upload|upload.*vulnerab/g, 2], [/\bffuf\b|\bgobuster\b|\bnikto\b/g, 2], [/upload.*portal|portal.*upload/g, 2]],
  crypto: [[/\brsa\b/g, 3], [/\baes\b/g, 3], [/fernet/g, 3], [/cipher/g, 2], [/decrypt/g, 2], [/seed.phrase/g, 3],
    [/key vault|keyvault/g, 2], [/hashcat|john.*ripper/g, 2]],
  forensics: [[/\bpcap\b|wireshark/g, 3], [/volatility/g, 3], [/autopsy/g, 3], [/binwalk/g, 2], [/steghide|stegseek|zsteg/g, 3],
    [/\bexif\b/g, 2], [/memory dump|\.e01\b|disk image/g, 2]],
  cloud: [[/\bazure\b/g, 3], [/\bsas token\b/g, 3], [/storage account|storage container|\bblob\b/g, 2], [/\baws\b|\bgcp\b/g, 2]],
  osint: [[/\bosint\b/g, 3], [/sherlock/g, 2], [/username.*search|email.*lookup/g, 2]],
};
const EVENT_HINTS: [string, string, number][] = [["pwnable", "pwn", 3], ["rev", "rev", 3], ["reverse", "rev", 3], ["crypt", "crypto", 2],
  ["forens", "forensics", 3], ["osint", "osint", 3], ["binary", "rev", 2], ["binary", "pwn", 1]];
const FILE_HINTS: [RegExp, string, number][] = [[/\.pcap(ng)?$/, "forensics", 4], [/(exploit|solve|payload).*\.py$/, "pwn", 2], [/\.xpi$|\.apk$/, "rev", 2]];

function normalizeTags(raw: unknown): string[] {
  const out: string[] = [];
  for (const t of Array.isArray(raw) ? raw : []) {
    let slug = String(t).trim().toLowerCase().replace(/ /g, "-");
    slug = TAG_ALIASES[slug] ?? slug;
    if (slug && !out.includes(slug) && (TAG_ORDER.includes(slug) || /^[a-z0-9][a-z0-9-]{0,19}$/.test(slug))) out.push(slug);
  }
  return out.slice(0, 2);
}

function resolveTags(meta: Record<string, unknown>, body: string, files: string[], event: string, name: string): string[] {
  const fm = normalizeTags(meta.tags);
  if (fm.length) return fm;
  const head = body.slice(0, 12000);
  const hay = `${event} ${name} ${head}`.toLowerCase();
  const scores: Record<string, number> = Object.fromEntries(TAG_ORDER.filter((t) => t !== "misc").map((t) => [t, 0]));
  for (const [pat, tag, w] of EVENT_HINTS) if (`${event} ${name}`.toLowerCase().includes(pat)) scores[tag] += w;
  for (const f of files) for (const [pat, tag, w] of FILE_HINTS) if (pat.test(f.toLowerCase())) scores[tag] += w;
  for (const [tag, signals] of Object.entries(SIGNALS)) {
    for (const [pat, w] of signals) {
      const hits = hay.match(pat)?.length ?? 0;
      if (hits) scores[tag] += Math.min(hits, 4) * w;
    }
  }
  const got = head.match(/\bGOT\b/g)?.length ?? 0;   // uppercase only: "got" is English
  if (got) scores.pwn += Math.min(got, 4) * 2;
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] <= 0) return ["misc"];
  const tags = [ranked[0][0]];
  if (ranked[1] && ranked[1][1] >= Math.max(2, 0.25 * ranked[0][1])) tags.push(ranked[1][0]);
  return tags;
}

// ---------------------------------------------------------------------------
const KIND: Record<string, string> = {
  py: "python", c: "c", h: "c", cpp: "c++", sh: "shell", js: "js", ts: "ts", go: "go", rs: "rust", md: "markdown", txt: "text",
  json: "json", yml: "yaml", yaml: "yaml", png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image",
  pdf: "pdf", zip: "archive", gz: "archive", tar: "archive", "7z": "archive", pcap: "pcap", pcapng: "pcap", bin: "binary",
  exe: "binary", so: "binary", elf: "binary", Challenge: "binary",
};
function kindOf(file: string): string {
  const ext = extname(file).slice(1);
  if (KIND[ext]) return KIND[ext];
  if (!ext) {
    // extension-less: ELF / binary sniff vs. text
    const buf = readFileSync(file).subarray(0, 1024);
    if (buf[0] === 0x7f && buf.toString("latin1", 1, 4) === "ELF") return "elf";
    return buf.includes(0) ? "binary" : "text";
  }
  return ext;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir).sort()) {
    if (e.startsWith(".") || SKIP.has(e)) continue;
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

function parseDate(v: unknown): Date | null {
  const m = typeof v === "string" && v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

let cache: Promise<Writeup[]> | undefined;
export const getWriteups = () => (cache ??= load());

async function load(): Promise<Writeup[]> {
  if (!existsSync(ROOT)) throw new Error("content-src/ctf-writeups missing — run `npm run content` first");
  const list: Writeup[] = [];
  const gh = `https://github.com/${site.github.user}/ctf-writeups`;

  for (const dir of walk(ROOT).map((f) => join(f, "..")).filter((d, i, a) => a.indexOf(d) === i)) {
    const rel = relative(ROOT, dir);
    const parts = rel.split("/");
    if (parts.length < 2) continue;
    const entries = readdirSync(dir);
    const note = NOTE_FILES.find((n) => entries.includes(n))
      ?? (entries.filter((e) => e.endsWith(".md")).length === 1 ? entries.find((e) => e.endsWith(".md")) : undefined);
    if (!note) continue;

    const { data, body } = frontmatter(readFileSync(join(dir, note), "utf8"));
    const [platformId, ...rest] = parts;
    const name = rest.join("/");
    const files = walk(dir);
    const id = rel;
    const difficulty = (typeof data.difficulty === "string" && data.difficulty)
      || (difficultyCache as Record<string, string>)[id] || null;
    const title = typeof data.title === "string" && data.title ? data.title : name.replace(/[_-]/g, " ");

    list.push({
      id,
      url: `/writeups/${id}/`,
      title,
      platform: PLATFORM_LABELS[platformId.toLowerCase()] ?? platformId.replace(/[_-]/g, " "),
      platformId,
      date: parseDate(data.date),
      difficulty,
      tier: difficulty ? tierFor(difficulty) : null,
      tags: resolveTags(data, body, files.map((f) => relative(dir, f)), platformId, name),
      source: `${gh}/tree/main/${id}`,
      attachments: files.map((f) => {
        const path = relative(dir, f);
        const slash = path.lastIndexOf("/");
        return {
          path, name: path.slice(slash + 1), dir: slash > 0 ? path.slice(0, slash) : "",
          size: statSync(f).size, kind: kindOf(f), url: `${gh}/blob/main/${relative(ROOT, f)}`, self: path === note,
        };
      }),
      body: await render(body),
    });
  }

  // Newest first overall; prev/next walk a platform in chronological order.
  const time = (w: Writeup) => w.date?.getTime() ?? 0;
  list.sort((a, b) => time(b) - time(a) || a.title.localeCompare(b.title));
  const byPlatform = new Map<string, Writeup[]>();
  for (const w of [...list].reverse()) byPlatform.set(w.platformId, [...(byPlatform.get(w.platformId) ?? []), w]);
  for (const series of byPlatform.values()) {
    series.forEach((w, i) => {
      if (series[i - 1]) w.prev = { title: series[i - 1].title, url: series[i - 1].url };
      if (series[i + 1]) w.next = { title: series[i + 1].title, url: series[i + 1].url };
    });
  }
  return list;
}

export const TIERS: Tier[] = ["easy", "medium", "hard"];
