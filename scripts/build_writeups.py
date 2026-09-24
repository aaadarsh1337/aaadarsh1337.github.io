#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_writeups.py
=================
Converts ctf-writeups markdown into static HTML matching the portfolio
blueprint theme.

Generates a clean editorial article page for each challenge.

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
from html.parser import HTMLParser
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

EVENT_LABELS = {
    "tryhackme": "TryHackMe",
    "pwnable_kr": "pwnable.kr",
    "picoctf": "picoCTF",
    "hackerholidays": "Hacker Holidays",
}

SKIP_DIRS = {".git", ".github", "node_modules", "__pycache__"}

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


def event_label(event: str) -> str:
    return EVENT_LABELS.get(event, display_name(event))


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
            "sane_lists",
        ],
        extension_configs={
            "codehilite": {
                "guess_lang": False,
                "noclasses": False,       # use CSS classes (styled by write_pygments_css)
                "css_class": "highlight",
            },
            "toc": {"permalink": False},
        },
        output_format="html5",
    )


FLAG_RE = re.compile(r"(THM\{[^}]*\}|flag\{[^}]*\}|picoCTF\{[^}]*\}|HTB\{[^}]*\})", re.IGNORECASE)


def strip_leading_h1(value: str) -> str:
    value = re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", value, count=1, flags=re.S | re.I)
    return re.sub(r"<h1([^>]*)>(.*?)</h1>", r"<h2\1>\2</h2>", value, flags=re.S | re.I)


def enhance_html(body_html: str, title: str) -> str:
    """Reader upgrades, Tokyo Night tokens intact. Headings untouched.
    - flag blockquotes -> <blockquote class="flag">
    - bare <img> -> <figure> with alt-text caption
    """
    def _flag_bq(m):
        inner = m.group(1)
        if FLAG_RE.search(re.sub(r"<[^>]+>", "", inner)):
            return f"<blockquote class=\"flag\">{inner}</blockquote>"
        return m.group(0)
    body_html = re.sub(r"<blockquote>(.*?)</blockquote>", _flag_bq, body_html, flags=re.S | re.I)

    def _challenge_heading(match):
        attrs, inner = match.group(1), match.group(2)
        if "href=" in inner and "challenge-link" not in attrs:
            attrs += ' class="challenge-link"'
        return f"<h2{attrs}>{inner}</h2>"

    body_html = re.sub(r"<h2([^>]*)>(.*?)</h2>", _challenge_heading, body_html, count=1, flags=re.S | re.I)

    def _fig(m):
        attrs, alt, src = m.group(1), m.group(2), m.group(3)
        alt_esc = html.escape(alt.strip())
        if not alt_esc:
            return m.group(0)
        return (f"<figure class=\"md-fig\"><img{attrs}alt=\"{alt_esc}\" src=\"{src}\" loading=\"lazy\" decoding=\"async\">"
                f"<figcaption>{alt_esc}</figcaption></figure>")
    body_html = re.sub(
        r"<img((?:(?!\bsrc=)[^>])*)alt=\"([^\"]*)\"[^>]*src=\"([^\"]+)\"[^>]*>",
        _fig, body_html, flags=re.I)
    body_html = re.sub(
        r"<img((?:(?!\balt=)[^>])*)src=\"([^\"]+)\"[^>]*alt=\"([^\"]*)\"[^>]*>",
        lambda m: (f"<figure class=\"md-fig\"><img{m.group(1)}src=\"{m.group(2)}\" loading=\"lazy\" decoding=\"async\">"
                   f"<figcaption>{html.escape(m.group(3).strip())}</figcaption></figure>"
                   if m.group(3).strip() else m.group(0)),
        body_html, flags=re.I)
    body_html = re.sub(
        r"<img((?:(?!\bloading=)[^>])*)src=\"([^\"]+)\"([^>]*?)/>",
        lambda m: f"<img{m.group(1)}src=\"{m.group(2)}\"{m.group(3)} loading=\"lazy\" decoding=\"async\" />",
        body_html, flags=re.I)
    return body_html


TERMINAL_LANGS = {"bash", "sh", "shell", "console", "zsh"}
OUTPUT_LANGS = {"text", "txt", "output", "log", ""}


def extract_fence_langs(body_md: str) -> list:
    """Opening-fence languages only (closers skipped via in/out state),
    so langs align 1:1 with rendered code blocks."""
    langs = []
    in_fence = False
    for m in re.finditer(r"^[ \t]*```[ \t]*([\w+-]*)[ \t]*$", body_md, re.M):
        if not in_fence:
            langs.append((m.group(1) or "").lower())
            in_fence = True
        else:
            in_fence = False
    return langs


def tag_code_blocks(body_html: str, langs: list) -> str:
    """Label each highlight div: terminal (commands) vs output vs code."""
    idx = 0

    def _tag(m):
        nonlocal idx
        lang = langs[idx] if idx < len(langs) else ""
        idx += 1
        low = lang.lower()
        if low in TERMINAL_LANGS:
            kind = "is-terminal"
        elif low in OUTPUT_LANGS:
            kind = "is-output"
        else:
            kind = "is-code"
        label = lang if lang else "output"
        return f'<div class="highlight {kind} lang-{html.escape(low or "plain")}" data-lang="{html.escape(label)}">'

    return re.sub(r'<div class="highlight">', _tag, body_html)


def excerpt_from_html(body_html: str, limit: int = 180) -> str:
    """First substantial paragraph as an SEO/search excerpt. Skips the tiny
    challenge-link line and empty intros."""
    import html as _html
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", body_html, re.S | re.I):
        if 'class="challenge-link"' in m.group(0):
            continue
        text = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        text = _html.unescape(re.sub(r"\s+", " ", text))
        if len(text) >= 40:
            return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"
    return ""


def make_og_image(title: str, event: str, dest: Path) -> bool:
    """1200x630 per-writeup social card in Tokyo Night tokens.
    Returns True on success, False when Pillow/fonts are unavailable."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import textwrap
    except ImportError:
        return False
    try:
        W, H = 1200, 630
        img = Image.new("RGB", (W, H), "#16161e")
        d = ImageDraw.Draw(img)
        # faint grid
        for x in range(0, W, 60):
            d.line([(x, 0), (x, H)], fill="#1c1e2b")
        for y in range(0, H, 60):
            d.line([(0, y), (W, y)], fill="#1c1e2b")
        d.rectangle([0, 0, 14, H], fill="#7dcfff")
        f_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        f_mono = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 34)
        f_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 28)
        d.text((80, 90), (event or "ctf").upper() + " · WRITEUP", font=f_mono, fill="#8b93c0")
        lines = textwrap.wrap(title, width=22)[:3]
        y = 170
        for ln in lines:
            d.text((80, y), ln, font=f_bold, fill="#c0caf5")
            y += 92
        d.text((80, H - 90), "aaadarsh1337.github.io", font=f_small, fill="#7dcfff")
        img.save(dest, "PNG")
        return True
    except Exception as e:
        print(f"  warning: og image failed for {title} ({e})")
        return False


# ---------------------------------------------------------------------------
# Build-time HTML sanitizer (stdlib only, no extra deps).
# Markdown output is trusted-author content, but a compromised source repo
# must not turn into stored XSS in static HTML. Strips executable elements
# (script/style/iframe/object/embed/base/link/meta), event-handler attributes
# (on*), and javascript:/data:text/html/vbscript: URLs. Allows everything
# else, including code-highlight spans, tables, and images.
# ---------------------------------------------------------------------------

_BLOCKED_TAGS = {"script", "style", "iframe", "object", "embed", "base", "link", "meta", "form", "input", "button"}
_DANGEROUS_SCHEMES = ("javascript:", "data:text/html", "vbscript:")


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out: list = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        low = tag.lower()
        if low in _BLOCKED_TAGS or self.skip_depth:
            if low in _BLOCKED_TAGS:
                self.skip_depth += 1
            return
        clean = []
        for k, v in attrs:
            kl = k.lower()
            if kl.startswith("on"):
                continue
            if kl in ("href", "src", "xlink:href") and isinstance(v, str):
                vv = v.strip().lower()
                if vv.startswith(_DANGEROUS_SCHEMES):
                    continue
            clean.append((k, v))
        attr_str = "".join(
            f' {k}="{html.escape(v, quote=True)}"' if v is not None else f" {k}"
            for k, v in clean
        )
        self.out.append(f"<{tag}{attr_str}>")

    def handle_startendtag(self, tag, attrs):
        low = tag.lower()
        if low in _BLOCKED_TAGS or self.skip_depth:
            return
        self.handle_starttag(tag, attrs)
        self.out.append("")  # handle_starttag already emitted; close below
        self.out[-2:] = [self.out[-2].rstrip(">") + " />"] if self.out[-2].endswith(">") else self.out[-2:]

    def handle_endtag(self, tag):
        low = tag.lower()
        if low in _BLOCKED_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if self.skip_depth:
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skip_depth:
            self.out.append(data)

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.skip_depth:
            self.out.append(f"&#{name};")

    def handle_comment(self, data):
        pass  # drop comments (conditional comments can hide payloads)

    def get_html(self):
        return "".join(self.out)


def sanitize_html(raw_html: str) -> str:
    """Strip executable constructs from rendered markdown HTML."""
    try:
        p = _Sanitizer()
        p.feed(raw_html)
        p.close()
        return p.get_html()
    except Exception:
        return html.escape(raw_html)


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
.highlight .c  { color: #8791b8; font-style: italic; }
.highlight .ch, .highlight .c1, .highlight .cm, .highlight .cs { color: #8791b8; font-style: italic; }
.highlight .cp, .highlight .cpf { color: #8b93c0; font-style: italic; }
.highlight .k, .highlight .kd, .highlight .kn, .highlight .kr, .highlight .kt, .highlight .kc, .highlight .kp { color: #bb9af7; }
.highlight .n, .highlight .na, .highlight .nb, .highlight .nc, .highlight .no, .highlight .nd, .highlight .ni, .highlight .ne, .highlight .nf, .highlight .nl, .highlight .nn, .highlight .nx, .highlight .py, .highlight .nt, .highlight .nv, .highlight .bp, .highlight .fm, .highlight .vc, .highlight .vg, .highlight .vi, .highlight .vm { color: #c0caf5; }
.highlight .nf { color: #7dcfff; }
.highlight .s, .highlight .sa, .highlight .sb, .highlight .sc, .highlight .dl, .highlight .sd, .highlight .s2, .highlight .se, .highlight .sh, .highlight .si, .highlight .sx, .highlight .sr, .highlight .s1, .highlight .ss { color: #9ece6a; }
.highlight .m, .highlight .mb, .highlight .mf, .highlight .mh, .highlight .mi, .highlight .mo, .highlight .il { color: #ff9e64; }
.highlight .o, .highlight .ow { color: #8b93c0; }
.highlight .err { color: #c0caf5; background: transparent; }
.highlight .g, .highlight .ge, .highlight .ges, .highlight .gr, .highlight .gh, .highlight .gi, .highlight .go, .highlight .gp, .highlight .gs, .highlight .gu, .highlight .gt, .highlight .gd { color: #c0caf5; }
.highlight .gi { color: #9ece6a; }
.highlight .gd { color: #f7768e; }
.highlight .w { color: #8791b8; }
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
  white-space: pre;
  word-break: normal;
}
.highlight code {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, monospace;
  font-size: 13.5px;
  line-height: 1.65;
}
"""
    try:
        dest_css.write_text(css + "\n" + extra, encoding="utf-8")
    except Exception as e:
        print(f"  warning: could not write pygments css ({e})")


def copy_assets(folder: Path, dest: Path, referenced_html: str = ""):
    dest.mkdir(parents=True, exist_ok=True)
    # Only ship images the rendered page actually references, so stale
    # screenshots in the source tree never bloat the published site.
    refs = set()
    for m in re.finditer(r'src="([^"]+)"', referenced_html or ""):
        src = m.group(1)
        if src.startswith(("http://", "https://", "data:", "//", "/")):
            continue
        refs.add(src.split("#", 1)[0].split("?", 1)[0])
    ref_names = {Path(r).name for r in refs}
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
                rel_posix = rel.as_posix()
                if referenced_html and rel_posix not in refs and f not in ref_names:
                    continue
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


PAGE_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#16161e" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" />
<link rel="canonical" href="{canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:image" content="{og_image}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{og_image}" />
<script type="application/ld+json">{jsonld}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2316161e'/%3E%3Crect x='13' y='4' width='6' height='24' fill='%237DCFFF'/%3E%3Crect x='4' y='13' width='24' height='6' fill='%237DCFFF'/%3E%3Crect x='14' y='6' width='4' height='20' fill='%2316161e'/%3E%3Crect x='6' y='14' width='20' height='4' fill='%2316161e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css_prefix}../css/tokens.css" />
<link rel="stylesheet" href="{css_prefix}css/style.css" />
<link rel="stylesheet" href="{css_prefix}css/pygments.css" />
</head>
<body>
{skip_link}
<div class="lab-grid" aria-hidden="true"></div>

<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="{home_href}">
      <span class="brand-mark">CTF</span>
      <span class="brand-text">Writeups</span>
    </a>
    <nav class="topbar__nav" aria-label="Site navigation">
      <a class="topbar__link" href="{site_prefix}index.html">Portfolio</a>
      <a class="topbar__link" href="{site_prefix}writeups/" aria-current="page">Writeups</a>
      <a class="topbar__link" href="{site_prefix}blog/">Blog</a>
      <a class="topbar__link" href="{site_prefix}intel/">Intel</a>
      <a class="topbar__link" href="{github_repo}" target="_blank" rel="noopener noreferrer">GitHub &#8599;</a>
    </nav>
  </div>
</header>

<main id="{main_id}">
{body}
</main>
{page_scripts}
</body>
</html>
"""

WRITEUP_BODY = """
<div class="writeup-page">
  <article class="writeup-article" id="writeup-article" aria-label="Writeup article">
    <header class="writeup-hero">
      <p class="fig-label">{event} &middot; CTF writeup</p>
      <h1>{name}</h1>
      <div class="writeup-meta">
        <span>{day_prefix}{reading_time} min read</span>
        <span class="writeup-meta__separator">&middot;</span>
        {diff_block}{tag_block}
        <a class="writeup-source" href="{md_github}" target="_blank" rel="noopener noreferrer">Source &#8599;</a>
      </div>
    </header>
    <div class="writeup-content">
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


# ---------------------------------------------------------------------------
# Source-grounded category tags.
# Same philosophy as difficulty: explicit beats inferred, never guessed.
# Order: frontmatter `tags:` wins (normalized through TAG_ALIASES) ->
# keyword + filename + event scoring -> `misc` fallback (always 1+ tags,
# so the index filter and search.json stay complete for future writeups).
# To tag a new writeup explicitly, add to its markdown frontmatter:
#   ---
#   tags: [rev]
#   ---
# ---------------------------------------------------------------------------

TAG_ORDER = ["rev", "pwn", "web", "crypto", "forensics", "cloud", "osint", "misc"]

TAG_ALIASES = {
    "rev": "rev", "re": "rev", "reverse": "rev", "reversing": "rev",
    "reverse-engineering": "rev", "reverse engineering": "rev",
    "pwn": "pwn", "binexp": "pwn", "exploit": "pwn", "exploitation": "pwn",
    "binary-exploitation": "pwn", "binary exploitation": "pwn",
    "web": "web", "web-exploitation": "web", "web exploitation": "web",
    "crypto": "crypto", "cryptography": "crypto", "crypt": "crypto",
    "forensics": "forensics", "forensic": "forensics", "dfir": "forensics",
    "stego": "forensics", "steganography": "forensics",
    "cloud": "cloud",
    "osint": "osint",
    "misc": "misc", "general": "misc", "other": "misc",
}

# (regex, weight) per tag. Distinctive tool/technique names weigh more than
# generic words; per-term hits are capped so one repeated word can't dominate.
TAG_SIGNALS = {
    "rev": [
        (r"reverse.engineering|reversing", 3),
        (r"\bghidra\b", 3), (r"binary[\s-]?ninja", 3), (r"\bida\b", 2),
        (r"\bradare2?\b", 2), (r"\bobjdump\b", 2), (r"\bstrings\b", 1),
        (r"decompil", 2), (r"disassembl", 2), (r"\bilspy\b|\bdnspy\b", 3),
        (r"\bopcode\b", 2),
        (r"crackme", 3), (r"keygen", 2), (r"\.xpi\b", 2),
        (r"browser extension", 2), (r"widechar", 2), (r"\bxor\b", 1),
    ],
    "pwn": [
        # NOTE: bare "got" is deliberately NOT matched here — it collides
        # with the English word "got". Uppercase GOT is counted separately
        # (case-sensitive) in resolve_tags.
        (r"pwntools", 3), (r"shellcode", 3), (r"\brop\b", 3), (r"ret2", 3),
        (r"\bplt\b", 2), (r"\btcache\b", 3),
        (r"heap exploit", 3), (r"buffer overflow", 3), (r"stack overflow", 2),
        (r"format.string", 2), (r"\blibc\b", 2),
        (r"segmentation fault|segfault", 2), (r"pwndbg|\bgdb\b", 2),
        (r"binary exploitation", 4), (r"pwnable", 2),
    ],
    "web": [
        (r"\bburp\b", 3), (r"\bsqli\b|sql injection", 3),
        (r"\bxss\b|cross.site.script", 3), (r"\bssti\b|template injection", 3),
        (r"\blfi\b|\brfi\b|file inclusion", 3),
        (r"command injection", 3),
        (r"path traversal|zip slip", 3), (r"webshell|reverse shell", 2),
        (r"vulnerable.*upload|upload.*vulnerab", 2),
        (r"\bffuf\b|\bgobuster\b|\bnikto\b", 2),
        (r"upload.*portal|portal.*upload", 2),
    ],
    "crypto": [
        (r"\brsa\b", 3), (r"\baes\b", 3), (r"fernet", 3), (r"cipher", 2),
        (r"decrypt", 2), (r"seed.phrase", 3), (r"key vault|keyvault", 2),
        (r"hashcat|john.*ripper", 2),
    ],
    "forensics": [
        (r"\bpcap\b|wireshark", 3), (r"volatility", 3), (r"autopsy", 3),
        (r"binwalk", 2), (r"steghide|stegseek|zsteg", 3), (r"\bexif\b", 2),
        (r"memory dump|\.e01\b|disk image", 2),
    ],
    "cloud": [
        (r"\bazure\b", 3), (r"\bsas token\b", 3),
        (r"storage account|storage container|\bblob\b", 2),
        (r"\baws\b|\bgcp\b", 2),
    ],
    "osint": [
        (r"\bosint\b", 3), (r"sherlock", 2),
        (r"username.*search|email.*lookup", 2),
    ],
}

TAG_EVENT_HINTS = [
    ("pwnable", "pwn", 3),
    ("rev", "rev", 3), ("reverse", "rev", 3),
    ("crypt", "crypto", 2),
    ("forens", "forensics", 3),
    ("osint", "osint", 3),
    ("binary", "rev", 2), ("binary", "pwn", 1),
]

TAG_FILE_HINTS = [
    (r"\.pcap(ng)?$", "forensics", 4),
    (r"(exploit|solve|payload).*\.py$", "pwn", 2),
    (r"\.xpi$|\.apk$", "rev", 2),
]


def normalize_tags(raw) -> list:
    """Lowercase + alias-map a frontmatter tag list. Keeps unknown tags only
    if they look like safe slugs (so future categories don't break the UI)."""
    out = []
    for t in raw or []:
        slug = str(t).strip().lower().replace(" ", "-")
        slug = TAG_ALIASES.get(slug, slug)
        if not slug or slug in out:
            continue
        if slug in TAG_ORDER or re.fullmatch(r"[a-z0-9][a-z0-9-]{0,19}", slug):
            out.append(slug)
    return out[:2]


def resolve_tags(meta: dict, body_md: str, files: list, event: str, name: str):
    """Returns (tags, provenance). Always 1+ tags; second tag only when it
    scores >= max(2, 25% of the top score)."""
    fm = normalize_tags(meta.get("tags"))
    if fm:
        return fm, "frontmatter"

    hay = f"{event} {name} {body_md[:12000]}".lower()
    scores: dict = {t: 0 for t in TAG_ORDER if t != "misc"}
    for pat, tag, w in TAG_EVENT_HINTS:
        if pat in f"{event} {name}".lower():
            scores[tag] = scores.get(tag, 0) + w
    for entry in files or []:
        fname = str(entry.get("rel_local", "")).lower()
        for pat, tag, w in TAG_FILE_HINTS:
            if re.search(pat, fname):
                scores[tag] = scores.get(tag, 0) + w
    for tag, signals in TAG_SIGNALS.items():
        for pat, w in signals:
            hits = len(re.findall(pat, hay))
            if hits:
                scores[tag] = scores.get(tag, 0) + min(hits, 4) * w
    # Uppercase GOT, counted case-sensitively: bare lowercase "got" is
    # usually just English ("we got the flag").
    got_hits = len(re.findall(r"\bGOT\b", body_md[:12000]))
    if got_hits:
        scores["pwn"] = scores.get("pwn", 0) + min(got_hits, 4) * 2

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    if not ranked or ranked[0][1] <= 0:
        return ["misc"], "misc-fallback"
    top_tag, top_score = ranked[0]
    tags = [top_tag]
    if len(ranked) > 1:
        second, second_score = ranked[1]
        if second_score >= max(2, 0.25 * top_score):
            tags.append(second)
    return tags, "auto"


INDEX_BODY = """
<div class="page">
  <header class="page-hero">
    <p class="fig-label">CTF WRITEUPS</p>
    <h1>Challenge notes &amp; writeups</h1>
    <p class="page-sub">Every writeup shows each command and its output, step by step</p>
    <div class="search-row">
      <label class="visually-hidden" for="searchInput">Filter writeups</label>
      <input type="search" id="searchInput" placeholder="Filter by name, event, tag..." autocomplete="off" />
      <span class="search-meta" id="searchMeta" role="status">{count} writeups</span>
    </div>
    <div class="tag-filters" id="tagFilters" role="group" aria-label="Filter by category">
{tag_filters}
    </div>
  </header>

  <nav class="section-jump" id="sectionJump">
    <p class="tb-label">JUMP TO</p>
    <div class="section-jump__links">
{jump_links}
    </div>
  </nav>

  <div class="writeup-empty" id="writeupEmpty" hidden>No writeups match that filter. Try a different search or clear the tag.</div>

{sections}
</div>
"""


# Live-filter for the writeups index. Kept here (not inline in HTML) so the
# pages can ship a strict Content-Security-Policy without 'unsafe-inline'.
# build() writes this to writeups/js/filter.js.
FILTER_JS = """(function () {
  var input = document.getElementById("searchInput");
  var activeTag = "";
  function norm(s) {
    return (s || "").toLowerCase().replace(/[_\\-]+/g, " ").replace(/\\s+/g, " ").trim();
  }
  function applyFilter() {
    var q = input ? norm(input.value) : "";
    var total = 0;
    document.querySelectorAll(".writeup-card").forEach(function (card) {
      var hay = norm(card.getAttribute("data-search") || card.textContent);
      var tags = (card.getAttribute("data-tags") || "").split(/\\s+/);
      var tagOk = !activeTag || tags.indexOf(activeTag) !== -1;
      var textOk = !q || hay.indexOf(q) !== -1;
      var show = tagOk && textOk;
      card.style.display = show ? "" : "none";
      if (show) total++;
    });
    document.querySelectorAll(".writeup-section").forEach(function (sec) {
      var any = Array.prototype.some.call(sec.querySelectorAll(".writeup-card"), function (c) {
        return c.style.display !== "none";
      });
      sec.style.display = any ? "" : "none";
    });
    var empty = document.getElementById("writeupEmpty");
    if (empty) empty.hidden = total !== 0;
    var jump = document.getElementById("sectionJump");
    if (jump) jump.hidden = total === 0;
    var meta = document.getElementById("searchMeta");
    if (meta) meta.textContent = total + " writeup" + (total === 1 ? "" : "s");
  }
  if (input) input.addEventListener("input", applyFilter);
  document.querySelectorAll("#tagFilters .tag-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var tag = chip.getAttribute("data-tag") || "";
      activeTag = (activeTag === tag) ? "" : tag;
      document.querySelectorAll("#tagFilters .tag-chip").forEach(function (c) {
        var on = activeTag && c.getAttribute("data-tag") === activeTag;
        c.classList.toggle("active", !!on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      applyFilter();
    });
  });
})();
"""


PAGE_JS = """(function () {
  function flash(btn, ok) {
    var original = btn.getAttribute("data-label") || "copy";
    btn.textContent = ok ? "copied" : "copy failed";
    setTimeout(function () { btn.textContent = original; }, 1400);
  }
  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, true); }, function () { flash(btn, false); });
      return;
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(area);
    flash(btn, ok);
  }
  document.querySelectorAll(".writeup-content div.highlight").forEach(function (host) {
    var code = host.querySelector("code");
    if (!code || host.querySelector(".copy-btn")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";
    button.setAttribute("data-label", "copy");
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", function () { copyText(code.innerText, button); });
    host.appendChild(button);
  });
})();
"""


def tag_filter_chips(writeups: list) -> list:
    counts: dict = {}
    for w in writeups:
        for t in w.get("_tags", ["misc"]):
            counts[t] = counts.get(t, 0) + 1
    ordered = [t for t in TAG_ORDER if t in counts]
    ordered += sorted([t for t in counts if t not in TAG_ORDER])
    chips = []
    for t in ordered:
        chips.append(
            f'<button type="button" class="tag-chip" '
            f'data-tag="{html.escape(t)}" aria-pressed="false">'
            f'{html.escape(t)} <span class="tag-chip__count">{counts[t]}</span></button>'
        )
    return chips


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
    (out / "js").mkdir(parents=True, exist_ok=True)
    (out / "js" / "filter.js").write_text(FILTER_JS, encoding="utf-8")
    print("  wrote  js/filter.js")
    (out / "js" / "page.js").write_text(PAGE_JS, encoding="utf-8")
    print("  wrote  js/page.js")

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
        body_html = strip_leading_h1(tag_code_blocks(
            enhance_html(sanitize_html(md_to_html(body_md)), title),
            extract_fence_langs(body_md)))

        dest_dir = out / Path(w["url_path"])
        dest_dir.mkdir(parents=True, exist_ok=True)
        copy_assets(w["folder"], dest_dir, body_html)

        depth = len(Path(w["url_path"]).parts)
        css_prefix = "../" * depth
        home_href = css_prefix + "index.html"

        rel_md = w["md_path"].relative_to(source).as_posix()
        md_gh = f"{gh_base}/blob/{branch}/{rel_md}"

        files = list_files_recursive(w["folder"], source)
        words = len(re.findall(r"\w+", body_md))
        w["_reading_time"] = max(1, round(words / 200))
        slug = w["url_path"].rstrip("/").split("/")[-1]
        diff_label, diff_tier, diff_prov = resolve_difficulty(
            meta, body_md, w["url_path"], slug, play_bottles, cache)
        w["_difficulty"] = diff_label
        w["_tier"] = diff_tier or "medium"
        if diff_label:
            diff_badge = f'<span class="diff diff-{w["_tier"]}">{html.escape(diff_label)}</span>'
            diff_block = f'<span class="writeup-meta__difficulty">{diff_badge}</span>'
        else:
            diff_badge = ""
            diff_block = ""

        w["_tags"], tag_prov = resolve_tags(meta, body_md, files, w["event"], w["name"])
        tag_badges = "".join(
            f'<span class="tag tag-{html.escape(t) if t in TAG_ORDER else "misc"}">{html.escape(t)}</span>'
            for t in w["_tags"]
        )
        tag_block = f'<span class="writeup-meta__tags">{tag_badges}</span>' if tag_badges else ""

        # Previous / next writeup navigation (same event only).
        siblings = [x for x in writeups if x["event"] == w["event"]]
        pos = siblings.index(w)
        prev_w = siblings[pos - 1] if pos > 0 else None
        next_w = siblings[pos + 1] if pos < len(siblings) - 1 else None
        pager = []
        for label, target in (("Previous", prev_w), ("Next", next_w)):
            if target is None:
                pager.append('<span class="pager-item pager-item--disabled"></span>')
            else:
                target_href = css_prefix + target["url_path"].rstrip("/") + "/"
                pager.append(
                    f'<a class="pager-item pager-item--{label.lower()}" href="{html.escape(target_href)}">'
                    f'<span class="pager-label">{label}</span>'
                    f'<span class="pager-name">{html.escape(target["display_name"])}</span>'
                    f'<span class="pager-event">{html.escape(event_label(target["event"]))}</span>'
                    f"</a>"
                )
        pager_html = '<nav class="writeup-pager" aria-label="Writeup navigation">' + "".join(pager) + "</nav>"

        event_name = event_label(w["event"])
        page_title = f"{title} · {event_name}"
        excerpt = meta.get("excerpt") or excerpt_from_html(body_html)
        w["_excerpt"] = excerpt
        page_desc = excerpt or f"CTF writeup: {title} ({event_name})"
        canonical = canonical_for(w["url_path"])
        # Per-writeup social card; falls back to the shared site card when
        # Pillow/fonts are unavailable (e.g. minimal CI env).
        og_path = f"{site_base}/{w['url_path'].rstrip('/')}/og.png"
        if make_og_image(title, w["event"], dest_dir / "og.png"):
            og_image = og_path
        else:
            og_image = "https://aaadarsh1337.github.io/assets/og.png"
        w["_og"] = og_image
        day_prefix = f"Day {w['day']} &middot; " if w.get("day") is not None else ""
        body = WRITEUP_BODY.format(
            name=html.escape(title),
            event=html.escape(event_name),
            day_prefix=day_prefix,
            reading_time=w["_reading_time"],
            diff_block=diff_block,
            tag_block=tag_block,
            md_github=md_gh,
            content=body_html,
            pager=pager_html,
        )
        page = PAGE_SHELL.format(
            title=html.escape(page_title),
            description=html.escape(page_desc),
            og_image=og_image,
            canonical=canonical,
            jsonld=jsonld_for(page_title, page_desc, canonical),
            css_prefix=css_prefix,
            site_prefix=css_prefix + "../",
            home_href=home_href,
            github_repo=gh_base,
            body=body,
            skip_link='<a class="skip-link" href="#writeup-article">Skip to article</a>',
            main_id="main",
            page_scripts=f'<script src="{css_prefix}js/page.js" defer></script>',
        )
        (dest_dir / "index.html").write_text(page, encoding="utf-8")
        print(f"  wrote  {w['url_path']}/index.html  ({len(files)} files listed)  difficulty: {diff_label or '-'} ({diff_prov})  tags: {','.join(w['_tags'])} ({tag_prov})")

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
            f'<a class="section-jump__link" href="#{slug}">{html.escape(event_label(event))} ({len(items)})</a>'
        )
        cards = []
        for w in items:
            href = w["url_path"].rstrip("/") + "/"
            tags = w.get("_tags", ["misc"])
            search = html.escape(f"{w['event']} {w['name']} {w['display_name']} {w['url_path']} {' '.join(tags)}")
            read_min = w.get("_reading_time", 1)
            diff = w.get("_difficulty")
            tier = w.get("_tier", "medium")
            kicker_tags = " · ".join(
                f'<span class="k-tag">{html.escape(t)}</span>' for t in tags
            )
            kicker = f"{html.escape(event_label(w['event']))} · {kicker_tags}"
            meta_bits = []
            if w.get("day") is not None:
                meta_bits.append(f"Day {w['day']}")
            meta_bits.append(f"{read_min} min read")
            meta = html.escape(" · ".join(meta_bits))
            if diff:
                sub = (
                    f'<p class="writeup-card__foot">'
                    f'<span class="w-tier">{html.escape(diff)}</span>'
                    f"<span>{meta}</span>"
                    f"</p>"
                )
            else:
                sub = f'<p class="writeup-card__foot"><span>{meta}</span></p>'
            cards.append(
                f'<a class="writeup-card tier-{tier}" href="{html.escape(href)}" data-search="{search}" data-tags="{" ".join(html.escape(t) for t in tags)}">'
                f'<p class="writeup-card__kicker">{kicker}</p>'
                f'<h3>{html.escape(w["display_name"])}</h3>'
                f"{sub}"
                f'<span class="writeup-card__go" aria-hidden="true">→</span>'
                f"</a>"
            )
        sections_html.append(
            f'<section class="writeup-section" id="{slug}">'
            f'<div class="writeup-section__head">'
            f'<h2 class="writeup-section__title">{html.escape(event_label(event))}</h2>'
            f'<span class="writeup-section__count">{len(items)} writeup{"s" if len(items) != 1 else ""}</span>'
            f"</div>"
            f'<div class="writeup-grid">{"".join(cards)}</div>'
            f"</section>"
        )

    index_body = INDEX_BODY.format(
        count=len(writeups),
        jump_links="\n".join(jump_links),
        sections="\n".join(sections_html),
        tag_filters="\n".join(tag_filter_chips(writeups)),
    )
    index_canonical = canonical_for("")
    index_page = PAGE_SHELL.format(
        title="CTF Writeups — aaadarsh1337",
        description="CTF writeups and challenge notes by Adarsh Pillai",
        og_image="https://aaadarsh1337.github.io/assets/og.png",
        canonical=index_canonical,
        jsonld=jsonld_for("CTF Writeups", "CTF writeups and challenge notes", index_canonical),
        css_prefix="",
        site_prefix="../",
        home_href="index.html",
        github_repo=gh_base,
        body=index_body,
        skip_link='<a class="skip-link" href="#main">Skip to content</a>',
        main_id="main",
        page_scripts='<script src="js/filter.js" defer></script>',
    )
    (out / "index.html").write_text(index_page, encoding="utf-8")
    print(f"  wrote  index.html ({len(writeups)} writeups)")

    # Lightweight search index for the main-site command palette (Ctrl+K).
    search_index = [
        {
            "title": w["display_name"],
            "event": event_label(w["event"]),
            "url": w["url_path"].rstrip("/") + "/",
            "difficulty": w.get("_difficulty"),
            "tags": w.get("_tags", ["misc"]),
            "day": w.get("day"),
            "excerpt": w.get("_excerpt", ""),
        }
        for w in writeups
    ]
    (out / "search.json").write_text(json.dumps(search_index, ensure_ascii=False), encoding="utf-8")
    print(f"  wrote  search.json ({len(search_index)} entries)")


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
