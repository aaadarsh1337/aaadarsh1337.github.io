#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_writeups.py
=================
Converts ctf-writeups markdown into static HTML matching the portfolio
blueprint theme.

Includes a sidebar file list (each file links to GitHub).

Usage (local):
    pip install markdown pygments
    python3 build_writeups.py --source ../ctf-writeups --out ./writeups

Output:
    writeups/
      index.html
      css/style.css
      TryHackMe/Binary_Heaven/index.html
      ...
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:
    import markdown
    from markdown.extensions.fenced_code import FencedCodeExtension
    from markdown.extensions.tables import TableExtension
    from markdown.extensions.toc import TocExtension
    from markdown.extensions.codehilite import CodeHiliteExtension
except ImportError:
    raise SystemExit("Install deps first:  pip install markdown pygments")

WRITEUP_NAMES = [
    "notes.md", "NOTES.md", "writeup.md", "WRITEUP.md",
    "README.md", "readme.md", "solution.md", "SOLUTION.md",
]

EVENT_ORDER = [
    "tryhackme",
    "pwnable_kr",
    "picoctf",
    "hackerholidays"
]

SKIP_DIRS = {".git", ".github", "node_modules", "__pycache__"}

TEXT_EXT = {
    "md", "markdown", "txt", "py", "c", "h", "cpp", "hpp", "js", "ts",
    "json", "html", "css", "sh", "bash", "yml", "yaml", "toml", "ini",
    "cfg", "conf", "xml", "sql", "rs", "go", "java", "rb", "pl", "asm",
    "s", "makefile", "dockerfile", "log", "csv",
    # kept in sync with READABLE_EXT in js/main.js
    "mjs", "cjs", "tsx", "jsx", "htm", "scss", "sass", "less",
    "cc", "cs", "zsh", "ps1", "tsv", "r", "lua", "swift", "kt",
    "kts", "vue", "svelte", "graphql", "proto", "env",
}


def find_writeups(source: Path):
    results = []
    for root, dirs, files in os.walk(source):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        root_path = Path(root)
        rel = root_path.relative_to(source)
        parts = rel.parts

        md_file = None
        for candidate in WRITEUP_NAMES:
            if candidate in files:
                md_file = root_path / candidate
                break
        if not md_file:
            mds = [f for f in files if f.lower().endswith(".md")]
            if len(mds) == 1:
                md_file = root_path / mds[0]
            else:
                continue

        if len(parts) == 0:
            event, name = "Root", md_file.stem
        elif len(parts) == 1:
            event, name = "General", parts[0]
        else:
            event, name = parts[0], "/".join(parts[1:])

        results.append({
            "event": event,
            "name": name,
            "display_name": display_name(name),
            "folder": root_path,
            "md_path": md_file,
            "rel": rel.as_posix() if str(rel) != "." else name,
            "url_path": rel.as_posix() if str(rel) != "." else name,
        })

    # Day numbers (e.g. "# Day 14 - ...") drive ordering within an event,
    # so HackerHolidays reads Day 0, Day 1, ... even as new rooms land.
    day_re = re.compile(r"^\s*#\s*day\s*(\d+)", re.IGNORECASE | re.MULTILINE)
    for w in results:
        try:
            head = w["md_path"].read_text(encoding="utf-8", errors="replace")[:2000]
        except OSError:
            head = ""
        m = day_re.search(head)
        w["day"] = int(m.group(1)) if m else None

    def sort_key(w):
        return (
            w["event"].lower(),
            w["day"] if w["day"] is not None else float("inf"),
            w["name"].lower(),
        )
    results.sort(key=sort_key)
    return results


def display_name(raw: str) -> str:
    """Turn a folder/slug name into a readable challenge title.
    Preserve uppercase acronyms (BOF, FD) and camelCase tokens."""
    acronyms = {"fd", "bof", "ctf", "xor", "crc", "sha", "md5", "rsa", "aes", "des", "otp"}
    words = raw.replace("_", " ").replace("-", " ").split()
    out = []
    for w in words:
        low = w.lower()
        if low in acronyms:                  # known acronym → uppercase
            out.append(low.upper())
        elif w.isupper() and len(w) <= 5:    # short all-caps acronym
            out.append(w)
        elif w.isupper():                    # longer all-caps → title case
            out.append(w.title())
        elif w.islower():                    # plain lowercase → title case
            out.append(w.capitalize())
        else:                                # already mixed/camel → keep
            out.append(w)
    return " ".join(out)


def md_to_html(text: str) -> str:
    # fenced_code + codehilite: use language tags like ```python
    # guess_lang=True helps when the fence has no language
    return markdown.markdown(
        text,
        extensions=[
            "fenced_code",
            "codehilite",
            "tables",
            "toc",
            "nl2br",
            "sane_lists",
        ],
        extension_configs={
            "codehilite": {
                "guess_lang": True,
                "noclasses": False,       # use CSS classes (styled by write_pygments_css)
                "css_class": "highlight",
            },
            "toc": {"permalink": False},
        },
        output_format="html5",
    )


def write_pygments_css(dest_css: Path) -> None:
    """Write a Tokyo-Night-matching stylesheet for highlighted code blocks.

    Instead of the stock monokai palette (blue/pink), we emit a custom
    token palette tuned to the portfolio theme: indigo text on near-black,
    magenta keywords, green strings, blue functions, orange numbers, red
    for errors. This keeps code blocks reading as part of the site rather
    than a jarring third-party theme.
    """
    # foreground, background (unused tokens keep the default foreground)
    css = """
.highlight { color: #c0caf5; background: #1a1b26; }
.highlight .hll { background: #24283b; }
.highlight .c  { color: #616a92; font-style: italic; }
.highlight .ch, .highlight .c1, .highlight .cm, .highlight .cs { color: #616a92; font-style: italic; }
.highlight .cp, .highlight .cpf { color: #8b93c0; font-style: italic; }
.highlight .k, .highlight .kd, .highlight .kn, .highlight .kr, .highlight .kt, .highlight .kc, .highlight .kp { color: #bb9af7; }
.highlight .n, .highlight .na, .highlight .nb, .highlight .nc, .highlight .no, .highlight .nd, .highlight .ni, .highlight .ne, .highlight .nf, .highlight .nl, .highlight .nn, .highlight .nx, .highlight .py, .highlight .nt, .highlight .nv, .highlight .bp, .highlight .fm, .highlight .vc, .highlight .vg, .highlight .vi, .highlight .vm { color: #c0caf5; }
.highlight .nf { color: #7dcfff; }
.highlight .s, .highlight .sa, .highlight .sb, .highlight .sc, .highlight .dl, .highlight .sd, .highlight .s2, .highlight .se, .highlight .sh, .highlight .si, .highlight .sx, .highlight .sr, .highlight .s1, .highlight .ss { color: #9ece6a; }
.highlight .m, .highlight .mb, .highlight .mf, .highlight .mh, .highlight .mi, .highlight .mo, .highlight .il { color: #ff9e64; }
.highlight .o, .highlight .ow { color: #8b93c0; }
.highlight .err { color: #f7768e; background-color: #2b1f2e; }
.highlight .g, .highlight .ge, .highlight .ges, .highlight .gr, .highlight .gh, .highlight .gi, .highlight .go, .highlight .gp, .highlight .gs, .highlight .gu, .highlight .gt, .highlight .gd { color: #c0caf5; }
.highlight .gi { color: #9ece6a; }
.highlight .gd { color: #f7768e; }
.highlight .w { color: #616a92; }
"""
    extra = """
.highlight {
  background: #1a1b26 !important;
  border: 1px solid #292e42;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 0 0 1.3em;
  border-radius: 2px;
}
.highlight pre {
  background: transparent !important;
  border: none !important;
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.highlight code {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, monospace;
  font-size: 13.5px;
  line-height: 1.6;
}
"""
    try:
        dest_css.write_text(css + "\n" + extra, encoding="utf-8")
    except Exception as e:
        print(f"  warning: could not write pygments css ({e})")


def copy_assets(folder: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    # Copy images anywhere under the challenge folder, preserving structure,
    # so relative image links in markdown keep working after the build.
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        root_path = Path(root)
        for f in files:
            if f.startswith("."):
                continue
            if Path(f).suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}:
                src = root_path / f
                rel = src.relative_to(folder)
                target = dest / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, target)


def list_files_recursive(folder: Path, source: Path):
    """All files under challenge folder, relative to source repo root."""
    out = []
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for f in sorted(files):
            if f.startswith("."):
                continue
            p = Path(root) / f
            rel = p.relative_to(source).as_posix()
            rel_to_challenge = p.relative_to(folder).as_posix()
            out.append({
                "name": f,
                "rel_repo": rel,
                "rel_local": rel_to_challenge,
                "ext": p.suffix.lstrip(".").lower() or p.name.lower(),
            })
    return out


def file_kind(entry: dict) -> str:
    ext = entry["ext"]
    name = entry["name"].lower()
    if ext in ("md", "markdown") or name in WRITEUP_NAMES:
        return "md"
    if ext in TEXT_EXT or name in ("makefile", "dockerfile", "procfile", "license"):
        return ext or "text"
    return "bin"


def render_file_list(files: list, gh_base: str, branch: str) -> str:
    if not files:
        return '<p class="dim">No files.</p>'
    rows = []
    for f in files:
        kind = file_kind(f)
        label = "md" if kind == "md" else ("github" if kind == "bin" else kind)
        kind_class = "readable" if kind != "bin" else "unreadable"
        url = f"{gh_base}/blob/{branch}/{f['rel_repo']}"
        rows.append(
            f'<a class="file-item {kind_class}" href="{html.escape(url)}" '
            f'target="_blank" rel="noopener">'
            f'<span class="name">{html.escape(f["rel_local"])}</span>'
            f'<span class="kind">{html.escape(label)}</span>'
            f"</a>"
        )
    return '<div class="file-list">' + "".join(rows) + "</div>"


PAGE_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#16161e" />
<link rel="canonical" href="{canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{canonical}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<script type="application/ld+json">{jsonld}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2316161e'/%3E%3Crect x='13' y='4' width='6' height='24' fill='%237DCFFF'/%3E%3Crect x='4' y='13' width='24' height='6' fill='%237DCFFF'/%3E%3Crect x='14' y='6' width='4' height='20' fill='%2316161e'/%3E%3Crect x='6' y='14' width='20' height='4' fill='%2316161e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css_prefix}css/style.css" />
<link rel="stylesheet" href="{css_prefix}css/pygments.css" />
</head>
<body>
<div class="lab-grid" aria-hidden="true"></div>

<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="{home_href}">
      <span class="brand-mark">CTF</span>
      <span class="brand-text">Writeups</span>
    </a>
    <div class="topbar__spacer"></div>
    <div class="topbar__actions">
      {topbar_extra}
      <a class="btn btn--ghost" href="{portfolio_url}">&#8592; Portfolio</a>
      <a class="btn btn--ghost" href="{github_repo}" target="_blank" rel="noopener">Repo &#8599;</a>
    </div>
  </div>
</header>

<main>
{body}
</main>
</body>
</html>
"""

WRITEUP_BODY = """
<div class="reader-layout reader-layout--static">
  <aside class="sidebar">
    <div class="sidebar__challenge">
      <p class="tb-label">CHALLENGE</p>
      <h2>{name}</h2>
      <p class="side-path">{event}</p>
      <p class="side-meta">{day_prefix}{reading_time} min read &middot; {file_count} files</p>{diff_block}
    </div>
    <div class="sidebar__files">
      <p class="tb-label">FILES</p>
      {file_list}
    </div>
    <div class="sidebar__foot">
      <a class="btn btn--ghost btn--small sidebar-gh-btn" href="{folder_github}" target="_blank" rel="noopener">Open folder &#8599;</a>
      <a class="btn btn--ghost btn--small sidebar-gh-btn" href="{md_github}" target="_blank" rel="noopener">View markdown &#8599;</a>
    </div>
  </aside>
  <article class="reader">
    <div class="reader__toolbar">
      <div class="reader__crumb">
        <span class="tb-label">READING</span>
        <span>{md_name}</span>
      </div>
      <a class="btn btn--ghost btn--small" href="{md_github}" target="_blank" rel="noopener">Source &#8599;</a>
    </div>
    <div class="reader__body">
      <div class="md-render">
{content}
      </div>
{pager}
    </div>
  </article>
</div>
"""

def parse_frontmatter(text: str):
    """Minimal YAML frontmatter support (no extra deps). Returns meta, body."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    raw, body = parts[1], parts[2]
    meta: dict = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip().lower()
        v = v.strip().strip('"').strip("'")
        if k in ("title", "date", "difficulty", "excerpt", "event"):
            meta[k] = v
        elif k == "tags":
            meta[k] = [t.strip() for t in v.strip("[]").split(",") if t.strip()]
    return meta, body.lstrip("\n")


# ---------------------------------------------------------------------------
# Source-grounded difficulty.
# Labels come from the challenge platforms themselves, never guessed:
# - pwnable.kr  -> bottle category, parsed live from https://pwnable.kr/play.php
# - TryHackMe   -> room educationalLevel (Beginner/Intermediate/Advanced),
#                  parsed live from the room page's schema.org JSON-LD
# - any site    -> schema.org educationalLevel/difficulty from the challenge
#                  page's JSON-LD (works for HTB, picoCTF-gym mirrors, ...)
# Fallbacks, in order: scripts/difficulty_cache.json (values previously
# verified against the live platforms), then an explicit statement in the
# writeup itself ("medium challenge", negation-aware), then no badge.
# frontmatter `difficulty:` always wins and accepts any custom string.
# ---------------------------------------------------------------------------

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}

CHALLENGE_URL_RE = re.compile(r"https?://[^\s)>\]]+")
SKIP_HOSTS = (
    "github.com", "raw.githubusercontent", "youtube.com", "youtu.be",
    "discord", "medium.com", "google.", "facebook.com", "twitter.com",
    "x.com", "linkedin.com", "instagram.com", "pinterest.com",
    "cloudflare", "gstatic", "w3.org", "wikipedia.org",
    "challenge-files", "cdn.discordapp",
)
SKIP_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".pdf", ".zip")


def fetch_html(url: str, timeout: int = 10, max_bytes: int = 150_000):
    """Fetch a page for scraping. Returns text or None on any failure."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ctype = r.headers.get("Content-Type", "")
            if not any(t in ctype for t in ("html", "text", "json")):
                # Unknown type: peek anyway, JSON-LD may hide anywhere.
                pass
            raw = r.read(max_bytes)
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return None


def _walk_jsonld(node, keys):
    vals = []
    if isinstance(node, dict):
        for k, v in node.items():
            if k in keys and isinstance(v, str) and v.strip():
                vals.append(v.strip())
            else:
                vals.extend(_walk_jsonld(v, keys))
    elif isinstance(node, list):
        for item in node:
            vals.extend(_walk_jsonld(item, keys))
    return vals


def jsonld_levels(html_text: str):
    """Pull educationalLevel/difficulty out of schema.org JSON-LD blocks."""
    found = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text, re.S | re.I,
    ):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        found.extend(_walk_jsonld(data, ("educationalLevel", "difficulty")))
    return found


def challenge_urls(body_md: str):
    """Challenge-link candidates: known platforms first, then anything else."""
    urls = []
    for m in CHALLENGE_URL_RE.finditer(body_md):
        u = m.group(0).rstrip(".,;:'\"!)")
        host = urlparse(u).hostname or ""
        if any(s in host for s in SKIP_HOSTS):
            continue
        if u.lower().split("?")[0].endswith(SKIP_SUFFIXES):
            continue
        if u not in urls:
            urls.append(u)

    def platform_rank(u):
        h = (urlparse(u).hostname or "").lower()
        if "pwnable.kr" in h:
            return 0
        if "tryhackme.com" in h and "/room/" in u:
            return 1
        if "picoctf" in h or "cylabacademy" in h or "hackthebox" in h:
            return 2
        return 3

    return sorted(urls, key=platform_rank)


def pwnable_bottles(play_html: str):
    """Map challenge slug -> bottle from the live pwnable.kr listing."""
    text = re.sub(r"<[^>]+>", " ", play_html)
    m = re.search(r"catches the bug(.*)images from", text, re.S)
    region = m.group(1) if m else text
    parts = re.split(r"\[(Toddler's Bottle|Rookiss|Grotesque|Hacker's Secret)\]", region)
    bottles = {}
    for i in range(1, len(parts), 2):
        bottles[parts[i]] = parts[i + 1] if i + 1 < len(parts) else ""
    return bottles


def bottle_for_slug(bottles: dict, slug: str):
    """Find the single bottle whose listing contains this challenge slug."""
    if not bottles or not slug:
        return None
    hits = [b for b, content in bottles.items() if slug.lower() in content.lower()]
    return hits[0] if len(hits) == 1 else None


def tier_for(label: str) -> str:
    """Badge color tier for a platform-native label."""
    low = label.lower()
    if any(k in low for k in ("grotesque", "hacker", "secret", "advanced", "hard", "insane", "expert")):
        return "hard"
    if any(k in low for k in ("rookiss", "intermediate", "medium", "moderate")):
        return "medium"
    if any(k in low for k in ("toddler", "beginner", "easy", "intro")):
        return "easy"
    return "medium"


def author_stated_level(body_md: str):
    """Explicit difficulty statement in the writeup itself (negation-aware)."""
    head = body_md[:4000]
    text = re.sub(r"\b(not|n't|never|no)\b[^.\n]{0,20}\b(easy|medium|hard|beginner|intermediate|advanced)\b", "", head, flags=re.I)
    if re.search(r"\b(insane|expert|very hard|really hard|quite hard|super hard|advanced|hard challenge|difficult|tough)\b", text, re.I):
        return "Hard"
    if re.search(r"\b(medium|moderate|intermediate|medium challenge)\b", text, re.I):
        return "Medium"
    if re.search(r"\b(easy|beginner|trivial|straightforward|simple|easy challenge|very easy)\b", text, re.I):
        return "Easy"
    return None


def resolve_difficulty(meta: dict, body_md: str, url_path: str, slug: str,
                       play_bottles: dict, cache: dict):
    """Returns (label, tier, provenance) or (None, None, provenance).

    Order: frontmatter override -> live platform pull -> verified cache ->
    author's own statement -> no badge.
    """
    if meta.get("difficulty"):
        v = meta["difficulty"].strip()
        if v:
            return v, tier_for(v), "frontmatter"

    for u in challenge_urls(body_md):
        host = (urlparse(u).hostname or "").lower()
        label = None
        if "pwnable.kr" in host:
            label = bottle_for_slug(play_bottles or {}, slug)
            if label:
                return label, tier_for(label), "pwnable.kr/play.php"
        elif "tryhackme.com" in host and "/room/" in u:
            html = fetch_html(u)
            if html:
                levels = jsonld_levels(html)
                if levels:
                    return levels[0], tier_for(levels[0]), "THM room JSON-LD"
        else:
            html = fetch_html(u)
            if html:
                levels = jsonld_levels(html)
                if levels:
                    return levels[0], tier_for(levels[0]), "page JSON-LD"

    key = (url_path or "").rstrip("/")
    if key in cache and cache[key].get("label"):
        return cache[key]["label"], tier_for(cache[key]["label"]), "verified cache"

    stated = author_stated_level(body_md)
    if stated:
        return stated, tier_for(stated), "author-stated"

    return None, None, "none"


INDEX_BODY = """
<div class="page">
  <header class="page-hero">
    <p class="fig-label">CTF WRITEUPS</p>
    <h1>Challenge notes &amp; writeups</h1>
    <p class="page-sub">Every writeup shows each command and its output, step by step &middot; static pages generated from markdown</p>
    <div class="search-row">
      <label class="visually-hidden" for="searchInput">Filter writeups</label>
      <input type="search" id="searchInput" placeholder="Filter by name, event..." autocomplete="off" />
      <span class="search-meta" id="searchMeta" role="status">{count} writeups</span>
    </div>
  </header>

  <nav class="section-jump" id="sectionJump">
    <p class="tb-label">JUMP TO</p>
    <div class="section-jump__links">
{jump_links}
    </div>
  </nav>

{sections}
</div>
<script>
(function () {{
  var input = document.getElementById("searchInput");
  if (!input) return;
  function norm(s) {{
    return (s || "").toLowerCase().replace(/[_\\-]+/g, " ").replace(/\\s+/g, " ").trim();
  }}
  input.addEventListener("input", function () {{
    var q = norm(input.value);
    var total = 0;
    document.querySelectorAll(".writeup-section").forEach(function (sec) {{
      var visible = 0;
      sec.querySelectorAll(".writeup-card").forEach(function (card) {{
        var hay = norm(card.getAttribute("data-search") || card.textContent);
        var show = !q || hay.indexOf(q) !== -1;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      }});
      sec.style.display = visible ? "" : "none";
      total += visible;
    }});
    var meta = document.getElementById("searchMeta");
    if (meta) meta.textContent = total + " writeup" + (total === 1 ? "" : "s");
  }});
}})();
</script>
"""


def build(source: Path, out: Path, portfolio_url: str, github_user: str, github_repo: str, branch: str):
    # Safety guard: never wipe an unexpected directory.
    if out.exists() and out.name != "writeups":
        raise SystemExit(f"Refusing to wipe unexpected output dir: {out} (expected .../writeups)")
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    css_src = Path(__file__).parent / "style.css"
    if not css_src.exists():
        css_src = Path(__file__).parent / "writeups-style.css"
    (out / "css").mkdir(parents=True, exist_ok=True)
    if not css_src.exists():
        raise SystemExit("style.css missing next to build_writeups.py")
    shutil.copy2(css_src, out / "css" / "style.css")
    write_pygments_css(out / "css" / "pygments.css")
    print("  wrote  css/pygments.css")

    writeups = find_writeups(source)
    gh_base = f"https://github.com/{github_user}/{github_repo}"
    site_base = portfolio_url.rstrip("/") + "/writeups"

    # Verified fallback labels (checked against the live platforms).
    # Used only when the live pull is unreachable; edit freely.
    cache_path = Path(__file__).parent / "difficulty_cache.json"
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        cache = {}

    # pwnable.kr bottle listing, fetched once per build.
    play_html = fetch_html("https://pwnable.kr/play.php")
    play_bottles = pwnable_bottles(play_html) if play_html else {}
    if play_bottles:
        print(f"  live pwnable.kr bottles: {len(play_bottles)} categories")
    else:
        print("  warning: pwnable.kr unreachable, using verified cache")

    def canonical_for(url_path: str) -> str:
        url_path = (url_path or "").rstrip("/")
        return f"{site_base}/{url_path}/" if url_path else f"{site_base}/"

    def jsonld_for(title: str, description: str, url: str) -> str:
        return json.dumps({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": title,
            "description": description,
            "url": url,
            "author": {"@type": "Person", "name": "Adarsh Pillai", "url": portfolio_url},
        }, ensure_ascii=False)

    for i, w in enumerate(writeups):
        text = w["md_path"].read_text(encoding="utf-8", errors="replace")
        meta, body_md = parse_frontmatter(text)
        title = meta.get("title") or w["display_name"]
        body_html = md_to_html(body_md)

        dest_dir = out / Path(w["url_path"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        copy_assets(w["folder"], dest_dir)

        depth = len(Path(w["url_path"]).parts)
        css_prefix = "../" * depth
        home_href = css_prefix + "index.html"

        rel_md = w["md_path"].relative_to(source).as_posix()
        folder_gh = (
            f"{gh_base}/tree/{branch}/{w['url_path']}"
            if w["url_path"]
            else f"{gh_base}/tree/{branch}"
        )
        md_gh = f"{gh_base}/blob/{branch}/{rel_md}"

        files = list_files_recursive(w["folder"], source)
        file_list_html = render_file_list(files, gh_base, branch)
        w["_file_count"] = len(files)
        words = len(re.findall(r"\w+", body_md))
        w["_reading_time"] = max(1, round(words / 200))
        slug = w["url_path"].rstrip("/").split("/")[-1]
        diff_label, diff_tier, diff_prov = resolve_difficulty(
            meta, body_md, w["url_path"], slug, play_bottles, cache)
        w["_difficulty"] = diff_label
        w["_tier"] = diff_tier or "medium"
        if diff_label:
            diff_badge = f'<span class="diff diff-{w["_tier"]}">{html.escape(diff_label)}</span>'
            diff_block = f'<span class="side-diffwrap">{diff_badge}</span>'
        else:
            diff_badge = ""
            diff_block = ""

        # Previous / next writeup navigation (flat order across events).
        prev_w = writeups[i - 1] if i > 0 else None
        next_w = writeups[i + 1] if i < len(writeups) - 1 else None
        pager = []
        for label, target in (("Previous", prev_w), ("Next", next_w)):
            if target is None:
                pager.append('<span class="pager-item pager-item--disabled"></span>')
            else:
                target_href = css_prefix + target["url_path"].rstrip("/") + "/index.html"
                pager.append(
                    f'<a class="pager-item pager-item--{label.lower()}" href="{html.escape(target_href)}">'
                    f'<span class="pager-label">{label}</span>'
                    f'<span class="pager-name">{html.escape(target["display_name"])}</span>'
                    f'<span class="pager-event">{html.escape(target["event"])}</span>'
                    f"</a>"
                )
        pager_html = '<nav class="writeup-pager" aria-label="Writeup navigation">' + "".join(pager) + "</nav>"

        page_title = f"{title} · {w['event']}"
        page_desc = meta.get("excerpt") or f"CTF writeup: {title} ({w['event']})"
        canonical = canonical_for(w["url_path"])
        day_prefix = f"Day {w['day']} &middot; " if w.get("day") is not None else ""
        body = WRITEUP_BODY.format(
            home_href=home_href,
            name=html.escape(title),
            event=html.escape(w["event"]),
            day_prefix=day_prefix,
            reading_time=w["_reading_time"],
            file_count=len(files),
            diff_block=diff_block,
            folder_github=folder_gh,
            md_github=md_gh,
            md_name=html.escape(w["md_path"].name),
            content=body_html,
            file_list=file_list_html,
            pager=pager_html,
        )
        page = PAGE_SHELL.format(
            title=html.escape(page_title),
            description=html.escape(page_desc),
            canonical=canonical,
            jsonld=jsonld_for(page_title, page_desc, canonical),
            css_prefix=css_prefix,
            home_href=home_href,
            portfolio_url=portfolio_url,
            github_repo=gh_base,
            body=body,
            topbar_extra=f'<a class="btn btn--ghost" href="{home_href}">&#8592; All writeups</a>',
        )
        (dest_dir / "index.html").write_text(page, encoding="utf-8")
        print(f"  wrote  {w['url_path']}/index.html  ({len(files)} files listed)  difficulty: {diff_label or '-'} ({diff_prov})")

    by_event = {}
    for w in writeups:
        by_event.setdefault(w["event"], []).append(w)

    jump_links = []
    sections_html = []

    def event_sort_key(name: str):
        try:
            return (0, EVENT_ORDER.index(name))
        except ValueError:
            return (1, name.lower())

    for event in sorted(by_event.keys(), key=event_sort_key):
        items = by_event[event]
        slug = "sec-" + re.sub(r"[^a-z0-9]+", "-", event.lower()).strip("-")
        jump_links.append(
            f'<a class="section-jump__link" href="#{slug}">{html.escape(event)} ({len(items)})</a>'
        )
        cards = []
        for w in items:
            href = w["url_path"].rstrip("/") + "/index.html"
            search = html.escape(f"{w['event']} {w['name']} {w['display_name']} {w['url_path']}")
            file_count = w.get("_file_count", 0)
            read_min = w.get("_reading_time", 1)
            diff = w.get("_difficulty")
            tier = w.get("_tier", "medium")
            diff_badge = f'<span class="diff diff-{tier}">{html.escape(diff)}</span>' if diff else ""
            cards.append(
                f'<a class="writeup-card" href="{html.escape(href)}" data-search="{search}">'
                f'<div class="writeup-card__top"><h3>{html.escape(w["display_name"])}</h3>{diff_badge}</div>'
                f'<div class="meta"><span class="md-badge">writeup</span><span>{file_count} file{"s" if file_count != 1 else ""}</span><span>{read_min} min read</span></div>'
                f"</a>"
            )
        sections_html.append(
            f'<section class="writeup-section" id="{slug}">'
            f'<div class="writeup-section__head">'
            f'<h2 class="writeup-section__title">{html.escape(event)}</h2>'
            f'<span class="writeup-section__count">{len(items)} writeup{"s" if len(items) != 1 else ""}</span>'
            f"</div>"
            f'<div class="writeup-grid">{"".join(cards)}</div>'
            f"</section>"
        )

    index_body = INDEX_BODY.format(
        count=len(writeups),
        jump_links="\n".join(jump_links),
        sections="\n".join(sections_html),
    )
    index_canonical = canonical_for("")
    index_page = PAGE_SHELL.format(
        title="CTF Writeups — aaadarsh1337",
        description="CTF writeups and challenge notes by Adarsh Pillai",
        canonical=index_canonical,
        jsonld=jsonld_for("CTF Writeups", "CTF writeups and challenge notes", index_canonical),
        css_prefix="",
        home_href="index.html",
        portfolio_url=portfolio_url,
        github_repo=gh_base,
        body=index_body,
        topbar_extra="",
    )
    (out / "index.html").write_text(index_page, encoding="utf-8")
    print(f"  wrote  index.html ({len(writeups)} writeups)")

    # Lightweight search index for the main-site command palette (Ctrl+K).
    search_index = [
        {
            "title": w["display_name"],
            "event": w["event"],
            "url": w["url_path"].rstrip("/") + "/",
            "difficulty": w.get("_difficulty"),
            "day": w.get("day"),
        }
        for w in writeups
    ]
    (out / "search.json").write_text(json.dumps(search_index, ensure_ascii=False), encoding="utf-8")
    print(f"  wrote  search.json ({len(search_index)} entries)")

    # Sitemap for writeups (main sitemap references this via CI or manual merge)
    today = date.today().isoformat()
    urls = [canonical_for("")] + [canonical_for(w["url_path"]) for w in writeups]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append(f"  <url><loc>{html.escape(u)}</loc><lastmod>{today}</lastmod></url>")
    sitemap.append("</urlset>")
    (out / "sitemap-writeups.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
    print(f"  wrote  sitemap-writeups.xml ({len(urls)} urls)")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--portfolio-url", default="https://aaadarsh1337.github.io/")
    p.add_argument("--github-user", default="aaadarsh1337")
    p.add_argument("--github-repo", default="ctf-writeups")
    p.add_argument("--branch", default="main")
    args = p.parse_args()

    source = Path(args.source).resolve()
    out = Path(args.out).resolve()
    if not source.is_dir():
        raise SystemExit(f"Source not found: {source}")

    print(f"Building from {source} → {out}")
    build(source, out, args.portfolio_url, args.github_user, args.github_repo, args.branch)
    print("Done.")


if __name__ == "__main__":
    main()
