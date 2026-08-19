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
import os
import re
import shutil
from pathlib import Path

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

SKIP_DIRS = {".git", ".github", "node_modules", "__pycache__"}

TEXT_EXT = {
    "md", "markdown", "txt", "py", "c", "h", "cpp", "hpp", "js", "ts",
    "json", "html", "css", "sh", "bash", "yml", "yaml", "toml", "ini",
    "cfg", "conf", "xml", "sql", "rs", "go", "java", "rb", "pl", "asm",
    "s", "makefile", "dockerfile", "log", "csv",
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
            "folder": root_path,
            "md_path": md_file,
            "rel": rel.as_posix() if str(rel) != "." else name,
            "url_path": rel.as_posix() if str(rel) != "." else name,
        })

    results.sort(key=lambda w: (w["event"].lower(), w["name"].lower()))
    return results


def md_to_html(text: str) -> str:
    return markdown.markdown(
        text,
        extensions=[
            "fenced_code",
            "codehilite",
            TableExtension(),
            TocExtension(permalink=False),
            "nl2br",
            "sane_lists",
        ],
        output_format="html5",
    )


def copy_assets(folder: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    for item in folder.iterdir():
        if item.name.startswith("."):
            continue
        if item.is_dir() and item.name.lower() in ("images", "img", "assets", "screenshots"):
            target = dest / item.name
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(item, target)
        elif item.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}:
            shutil.copy2(item, dest / item.name)


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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css_prefix}css/style.css" />
</head>
<body>
<div class="blueprint-grid" aria-hidden="true"></div>

<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="{home_href}">
      <span class="brand-mark">CTF</span>
      <span class="brand-text">Writeups</span>
    </a>
    <div class="topbar__spacer"></div>
    <div class="topbar__actions">
      <a class="btn btn--ghost btn--small" href="{portfolio_url}">&#8592; Portfolio</a>
      <a class="btn btn--ghost btn--small" href="{github_repo}" target="_blank" rel="noopener">Repo &#8599;</a>
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
    <div class="sidebar__head">
      <a class="btn btn--ghost btn--small" href="{home_href}">&#8592; All writeups</a>
    </div>
    <div class="sidebar__challenge">
      <p class="tb-label">CHALLENGE</p>
      <h2>{name}</h2>
      <p class="side-path">{event}</p>
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
    </div>
  </article>
</div>
"""

INDEX_BODY = """
<div class="page">
  <header class="page-hero">
    <p class="fig-label">CTF WRITEUPS</p>
    <h1>Challenge notes &amp; writeups</h1>
    <p class="page-sub">Static pages generated from the writeups repo &middot; markdown stays the source of truth</p>
    <div class="search-row">
      <input type="search" id="searchInput" placeholder="Filter by name, event..." autocomplete="off" />
      <span class="search-meta" id="searchMeta">{count} writeups</span>
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

    writeups = find_writeups(source)
    gh_base = f"https://github.com/{github_user}/{github_repo}"

    for w in writeups:
        text = w["md_path"].read_text(encoding="utf-8", errors="replace")
        body_html = md_to_html(text)

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

        body = WRITEUP_BODY.format(
            home_href=home_href,
            name=html.escape(w["name"]),
            event=html.escape(w["event"]),
            folder_github=folder_gh,
            md_github=md_gh,
            md_name=html.escape(w["md_path"].name),
            content=body_html,
            file_list=file_list_html,
        )
        page = PAGE_SHELL.format(
            title=html.escape(f"{w['name']} · {w['event']}"),
            description=html.escape(f"CTF writeup: {w['name']} ({w['event']})"),
            css_prefix=css_prefix,
            home_href=home_href,
            portfolio_url=portfolio_url,
            github_repo=gh_base,
            body=body,
        )
        (dest_dir / "index.html").write_text(page, encoding="utf-8")
        print(f"  wrote  {w['url_path']}/index.html  ({len(files)} files listed)")

    by_event = {}
    for w in writeups:
        by_event.setdefault(w["event"], []).append(w)

    jump_links = []
    sections_html = []
    for event in sorted(by_event.keys(), key=str.lower):
        items = by_event[event]
        slug = "sec-" + re.sub(r"[^a-z0-9]+", "-", event.lower()).strip("-")
        jump_links.append(
            f'<a class="section-jump__link" href="#{slug}">{html.escape(event)} ({len(items)})</a>'
        )
        cards = []
        for w in items:
            href = w["url_path"].rstrip("/") + "/index.html"
            search = html.escape(f"{w['event']} {w['name']} {w['url_path']}")
            cards.append(
                f'<a class="writeup-card" href="{html.escape(href)}" data-search="{search}">'
                f"<h3>{html.escape(w['name'])}</h3>"
                f'<div class="meta"><span class="md-badge">writeup</span></div>'
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
    index_page = PAGE_SHELL.format(
        title="CTF Writeups",
        description="CTF writeups and challenge notes",
        css_prefix="",
        home_href="index.html",
        portfolio_url=portfolio_url,
        github_repo=gh_base,
        body=index_body,
    )
    (out / "index.html").write_text(index_page, encoding="utf-8")
    print(f"  wrote  index.html ({len(writeups)} writeups)")


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

    print(f"Building from {source} â†’ {out}")
    build(source, out, args.portfolio_url, args.github_user, args.github_repo, args.branch)
    print("Done.")


if __name__ == "__main__":
    main()
