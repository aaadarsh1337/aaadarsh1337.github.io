#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import shutil
from pathlib import Path

try:
    import markdown
    from markdown.extensions.codehilite import CodeHiliteExtension
    from markdown.extensions.fenced_code import FencedCodeExtension
    from markdown.extensions.sane_lists import SaneListExtension
    from markdown.extensions.tables import TableExtension
    from markdown.extensions.toc import TocExtension
except ImportError as exc:
    raise SystemExit("Install blog dependencies first: pip install markdown Pygments") from exc

try:
    from build_writeups import sanitize_html, write_pygments_css
except ImportError as exc:
    raise SystemExit("build_blog.py must be run from the scripts directory context") from exc


CATEGORY_LABELS = {
    "malware-analysis": "Malware analysis",
    "reverse-engineering": "Reverse engineering",
    "cloud-security": "Cloud security",
    "incident-response": "Incident response",
    "tooling": "Security tooling",
    "notes": "Security notes",
}
CATEGORY_ORDER = list(CATEGORY_LABELS)
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", str(value).strip().lower()).strip("-")
    return value or "untitled"


def category_label(category: str) -> str:
    return CATEGORY_LABELS.get(category, category.replace("-", " ").title())


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta = {}
    for line in parts[1].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip().lower()
        value = value.strip()
        if value.startswith(('"', "'")) and value.endswith(('"', "'")):
            value = value[1:-1]
        if key in {"title", "date", "category", "summary", "description", "slug", "cover"}:
            meta[key] = value
        elif key == "tags":
            meta[key] = [tag.strip().strip("\"'") for tag in value.strip("[]").split(",") if tag.strip()]
        elif key in {"draft", "featured"}:
            meta[key] = value.lower() in {"true", "yes", "1"}
    return meta, parts[2].lstrip("\n")


def parse_date(value: str, path: Path) -> dt.date:
    try:
        return dt.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return dt.date.fromtimestamp(path.stat().st_mtime)


def strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", value)).strip()


def excerpt_from_html(value: str, limit: int = 190) -> str:
    for match in re.finditer(r"<p[^>]*>(.*?)</p>", value, re.S | re.I):
        text = html.unescape(strip_html(match.group(1)))
        if len(text) >= 60:
            return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"
    return ""


def discover_posts(source: Path) -> list[dict]:
    posts_root = source / "posts"
    if not posts_root.is_dir():
        raise SystemExit(
            f"Blog source has no posts directory: {posts_root}\n"
            "Expected layout:\n"
            f"  {source}/\n"
            "  └── posts/\n"
            "      └── malware-analysis/\n"
            "          └── your-post.md\n"
            "Create posts/ in the security-blog repo (even if empty) and rebuild."
        )
    posts = []
    seen = set()
    for path in sorted(posts_root.rglob("*.md")):
        if any(part.startswith(".") for part in path.relative_to(posts_root).parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        meta, body = parse_frontmatter(text)
        if meta.get("draft"):
            continue
        relative = path.relative_to(posts_root)
        category = slugify(meta.get("category") or (relative.parts[0] if len(relative.parts) > 1 else "notes"))
        slug = slugify(meta.get("slug") or path.stem)
        url_path = f"{category}/{slug}"
        if url_path in seen:
            raise SystemExit(f"Duplicate blog URL: {url_path}")
        seen.add(url_path)
        title = meta.get("title") or slug.replace("-", " ").title()
        rendered, toc = render_markdown(body)
        summary = meta.get("summary") or meta.get("description") or excerpt_from_html(rendered)
        tags = [str(tag) for tag in meta.get("tags", []) if str(tag).strip()]
        date = parse_date(meta.get("date", ""), path)
        words = len(re.findall(r"\w+", body))
        posts.append({
            "title": title,
            "slug": slug,
            "category": category,
            "category_label": category_label(category),
            "url_path": url_path,
            "source_path": relative.as_posix(),
            "source_file": path,
            "date": date,
            "date_iso": date.isoformat(),
            "summary": summary,
            "tags": tags,
            "featured": bool(meta.get("featured")),
            "read_time": max(1, round(words / 220)),
            "body": rendered,
            "toc": toc,
        })
    return sorted(posts, key=lambda post: (post["date"], post["title"]), reverse=True)


def render_markdown(body: str) -> tuple[str, str]:
    renderer = markdown.Markdown(
        extensions=[
            FencedCodeExtension(),
            CodeHiliteExtension(guess_lang=False, noclasses=False, css_class="highlight"),
            TableExtension(),
            TocExtension(permalink=False, toc_depth="2-4"),
            SaneListExtension(),
        ]
    )
    rendered = renderer.convert(body)
    return strip_leading_h1(sanitize_html(rendered)), getattr(renderer, "toc", "") or ""


def strip_leading_h1(value: str) -> str:
    return re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", value, count=1, flags=re.S | re.I)


def page_prefix(depth: int) -> tuple[str, str]:
    return "../" * (depth + 1), "../" * depth


def page_shell(
    *,
    title: str,
    description: str,
    canonical: str,
    site_prefix: str,
    blog_prefix: str,
    github_url: str,
    body: str,
    jsonld: str,
    og_type: str = "website",
    page_scripts: str = "",
) -> str:
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}" />
<meta name="theme-color" content="#16161e" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" />
<link rel="canonical" href="{html.escape(canonical)}" />
<meta property="og:type" content="{html.escape(og_type)}" />
<meta property="og:title" content="{html.escape(title)}" />
<meta property="og:description" content="{html.escape(description)}" />
<meta property="og:url" content="{html.escape(canonical)}" />
<meta property="og:image" content="https://aaadarsh1337.github.io/assets/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{html.escape(title)}" />
<meta name="twitter:description" content="{html.escape(description)}" />
<meta name="twitter:image" content="https://aaadarsh1337.github.io/assets/og.png" />
<script type="application/ld+json">{jsonld}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2316161e'/%3E%3Crect x='13' y='4' width='6' height='24' fill='%237DCFFF'/%3E%3Crect x='4' y='13' width='24' height='6' fill='%237DCFFF'/%3E%3Crect x='14' y='6' width='4' height='20' fill='%2316161e'/%3E%3Crect x='6' y='14' width='20' height='4' fill='%2316161e'/%3E%3C/svg%3E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{site_prefix}css/tokens.css" />
<link rel="stylesheet" href="{site_prefix}blog/css/style.css" />
<link rel="stylesheet" href="{site_prefix}blog/css/pygments.css" />
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="lab-grid" aria-hidden="true"></div>
<header class="topbar">
  <div class="topbar__inner">
    <a class="topbar__brand" href="{blog_prefix}index.html"><span class="brand-mark">BLOG</span><span class="brand-text">Security writing</span></a>
    <nav class="topbar__nav" aria-label="Site navigation">
      <a class="topbar__link" href="{site_prefix}index.html">Portfolio</a>
      <a class="topbar__link" href="{site_prefix}writeups/">Writeups</a>
      <a class="topbar__link" href="{site_prefix}blog/" aria-current="page">Blog</a>
      <a class="topbar__link" href="{site_prefix}intel/">Intel</a>
      <a class="topbar__link" href="{html.escape(github_url)}" target="_blank" rel="noopener noreferrer">GitHub &#8599;</a>
    </nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="blog-footer"><span>Adarsh Pillai — security writing</span><span><a href="{site_prefix}index.html">Portfolio</a></span></footer>
{page_scripts}
</body>
</html>
'''


def jsonld_for(post: dict, canonical: str) -> str:
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["summary"],
        "datePublished": post["date_iso"],
        "author": {"@type": "Person", "name": "Adarsh Pillai", "url": "https://aaadarsh1337.github.io/"},
        "url": canonical,
        "keywords": post["tags"],
    }, ensure_ascii=False)


def card_html(post: dict, href_prefix: str = "", show_featured: bool = True) -> str:
    tags = "".join(f'<span class="blog-tag">{html.escape(tag)}</span>' for tag in post["tags"])
    featured = '<span class="blog-featured">Featured</span>' if show_featured and post.get("featured") else ""
    search = html.escape(" ".join([post["title"], post["summary"], post["category_label"], *post["tags"]]).lower())
    return f'''<a class="blog-card" href="{html.escape(href_prefix + post["url_path"] + "/")}" data-search="{search}" data-category="{html.escape(post["category"])}" data-tags="{html.escape(" ".join(post["tags"]).lower())}">
  <div class="blog-card__meta"><span class="blog-category">{html.escape(post["category_label"])}</span>{featured}<time datetime="{post["date_iso"]}">{post["date"].strftime("%b %d, %Y")}</time></div>
  <h2>{html.escape(post["title"])}</h2>
  <p>{html.escape(post["summary"])}</p>
  <div class="blog-card__foot"><span>{post["read_time"]} min read</span><span class="blog-card__tags">{tags}</span><span class="blog-card__arrow" aria-hidden="true">→</span></div>
</a>'''


def filter_chunks(categories: list[str], active: str = "") -> str:
    chips = [f'<button type="button" class="blog-filter{" active" if not active else ""}" data-category="" aria-pressed="{"true" if not active else "false"}">All writing</button>']
    for category in categories:
        selected = category == active
        chips.append(f'<button type="button" class="blog-filter{" active" if selected else ""}" data-category="{html.escape(category)}" aria-pressed="{"true" if selected else "false"}">{html.escape(category_label(category))}</button>')
    return "".join(chips)


def count_label(count: int) -> str:
    return f"{count} post" + ("" if count == 1 else "s")


def listing_body(posts: list[dict], categories: list[str], active: str = "", category_description: str = "", blog_prefix: str = "../") -> str:
    title = category_label(active) if active else "Security writing, in public."
    subtitle = category_description or "Malware analysis, reverse engineering, defensive notes, and experiments from a working security notebook."
    show_featured = len(posts) > 1
    cards = "".join(card_html(post, "../" if active else "", show_featured) for post in posts) or '<div class="blog-empty" id="blogEmpty" hidden><h2>No posts match</h2><p>Try a different search or clear the category filter.</p></div>'
    if posts:
        cards += '<div class="blog-empty" id="blogEmpty" hidden><h2>No posts match</h2><p>Try a different search or clear the category filter.</p></div>'
    breadcrumb = (
        f'<div class="article-breadcrumb"><a href="{blog_prefix}index.html">← All writing</a><span>/</span><span>{html.escape(category_label(active))}</span></div>'
        if active else ""
    )
    return f'''<div class="blog-page">
  {breadcrumb}
  <header class="blog-hero">
    <p class="fig-label">BLOG · {html.escape(category_label(active) if active else "WRITING")}</p>
    <h1>{html.escape(title)}</h1>
     <p class="blog-hero__sub">{html.escape(subtitle)}</p>
   </header>
  <div class="blog-tools"><label class="visually-hidden" for="postSearch">Search writing</label><input id="postSearch" type="search" placeholder="Search titles, topics, and summaries…" autocomplete="off" /><span id="postCount" class="blog-count" role="status">{count_label(len(posts))}</span></div>
  <div class="blog-filters" role="group" aria-label="Filter writing by category">{filter_chunks(categories, active)}</div>
  <div class="blog-grid" id="postGrid">{cards}</div>
</div>'''


def article_body(post: dict, site_prefix: str, blog_prefix: str, source_href: str | None, previous: dict | None, next_post: dict | None) -> str:
    toc = post["toc"] or "<p>No sections yet.</p>"
    tags = "".join(f'<span class="blog-tag">{html.escape(tag)}</span>' for tag in post["tags"])
    source_link = f'<a class="article-source" href="{html.escape(source_href)}" target="_blank" rel="noopener noreferrer">View source ↗</a>' if source_href else ""
    pager = []
    if previous:
        pager.append(f'<a class="article-pager article-pager--previous" href="{blog_prefix}{previous["url_path"]}/"><span>← Previous</span><strong>{html.escape(previous["title"])}</strong></a>')
    if next_post:
        pager.append(f'<a class="article-pager article-pager--next" href="{blog_prefix}{next_post["url_path"]}/"><span>Next →</span><strong>{html.escape(next_post["title"])}</strong></a>')
    pager_nav = f'<nav class="article-pager-row" aria-label="Article navigation">{"".join(pager)}</nav>' if pager else ""
    return f'''<div class="article-page">
  <div class="article-breadcrumb"><a href="{blog_prefix}index.html">← All writing</a><span>/</span><span>{html.escape(post["category_label"])}</span></div>
  <header class="article-header">
    <p class="article-kicker">{html.escape(post["category_label"])} · {post["date"].strftime("%B %d, %Y")}</p>
    <h1>{html.escape(post["title"])}</h1>
    <p class="article-dek">{html.escape(post["summary"])}</p>
    <div class="article-meta"><span>{post["read_time"]} min read</span><span class="article-meta__tags">{tags}</span>{source_link}</div>
  </header>
  <details class="article-toc article-toc--mobile"><summary>On this page</summary>{toc}</details>
  <div class="article-layout">
    <article class="article-body"><div class="md-render">{post["body"]}</div></article>
    <aside class="article-sidebar"><nav class="article-toc" aria-label="On this page"><p class="tb-label">ON THIS PAGE</p>{toc}</nav></aside>
  </div>
  {pager_nav}
</div>'''


def copy_post_assets(post: dict, destination: Path) -> None:
    source_dir = post["source_file"].parent
    for asset in source_dir.rglob("*"):
        if not asset.is_file() or asset.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        target = destination / asset.relative_to(source_dir)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset, target)


def build(source: Path, out: Path, portfolio_url: str, github_user: str, github_repo: str) -> None:
    if out.exists() and out.name != "blog":
        raise SystemExit(f"Refusing to wipe unexpected output directory: {out}")
    posts = discover_posts(source)
    categories = [category for category in CATEGORY_ORDER if any(post["category"] == category for post in posts)]
    categories.extend(sorted({post["category"] for post in posts} - set(categories)))
    if out.exists():
        shutil.rmtree(out)
    (out / "css").mkdir(parents=True)
    (out / "js").mkdir(parents=True)
    style_source = Path(__file__).parent / "blog-style.css"
    if not style_source.exists():
        raise SystemExit("blog-style.css missing next to build_blog.py")
    shutil.copy2(style_source, out / "css" / "style.css")
    write_pygments_css(out / "css" / "pygments.css")
    (out / "js" / "blog.js").write_text(BLOG_JS, encoding="utf-8")
    portfolio_base = portfolio_url.rstrip("/")
    blog_base = portfolio_base + "/blog"
    github_url = f"https://github.com/{github_user}/{github_repo}" if github_repo else ""
    search_entries = []
    for index, post in enumerate(posts):
        depth = len(Path(post["url_path"]).parts)
        site_prefix, blog_prefix = page_prefix(depth)
        destination = out / post["url_path"]
        destination.mkdir(parents=True, exist_ok=True)
        copy_post_assets(post, destination)
        source_href = f"https://github.com/{github_user}/{github_repo}/blob/main/posts/{post['source_path']}" if github_repo else None
        previous = posts[index + 1] if index + 1 < len(posts) else None
        next_post = posts[index - 1] if index > 0 else None
        article = article_body(post, site_prefix, blog_prefix, source_href, previous, next_post)
        canonical = f"{blog_base}/{post['url_path']}/"
        page = page_shell(title=f"{post['title']} — Security writing", description=post["summary"], canonical=canonical, site_prefix=site_prefix, blog_prefix=blog_prefix, github_url=github_url, body=article, jsonld=jsonld_for(post, canonical), og_type="article", page_scripts=f'<script src="{site_prefix}blog/js/blog.js" defer></script>')
        (destination / "index.html").write_text(page, encoding="utf-8")
        search_entries.append({"title": post["title"], "category": post["category_label"], "url": post["url_path"] + "/", "summary": post["summary"], "tags": post["tags"], "date": post["date_iso"]})
    site_prefix, blog_prefix = page_prefix(0)
    index_body = listing_body(posts, categories)
    index_canonical = blog_base + "/"
    index_jsonld = json.dumps({"@context": "https://schema.org", "@type": "Blog", "name": "Adarsh Pillai — Security writing", "description": "Malware analysis, reverse engineering, and defensive security notes.", "url": index_canonical, "author": {"@type": "Person", "name": "Adarsh Pillai", "url": portfolio_base + "/"}}, ensure_ascii=False)
    index_page = page_shell(title="Security writing — Adarsh Pillai", description="Malware analysis, reverse engineering, and defensive security notes.", canonical=index_canonical, site_prefix=site_prefix, blog_prefix=blog_prefix, github_url=github_url, body=index_body, jsonld=index_jsonld, page_scripts=f'<script src="{site_prefix}blog/js/blog.js" defer></script>')
    (out / "index.html").write_text(index_page, encoding="utf-8")
    for category in categories:
        category_posts = [post for post in posts if post["category"] == category]
        category_dir = out / category
        category_dir.mkdir(parents=True, exist_ok=True)
        category_depth = 1
        category_site_prefix, category_blog_prefix = page_prefix(category_depth)
        category_body = listing_body(category_posts, categories, category, f"Notes and analysis filed under {category_label(category).lower()}.")
        category_canonical = f"{blog_base}/{category}/"
        category_page = page_shell(title=f"{category_label(category)} — Security writing", description=f"Security writing filed under {category_label(category).lower()}.", canonical=category_canonical, site_prefix=category_site_prefix, blog_prefix=category_blog_prefix, github_url=github_url, body=category_body, jsonld=index_jsonld, page_scripts=f'<script src="{category_site_prefix}blog/js/blog.js" defer></script>')
        (category_dir / "index.html").write_text(category_page, encoding="utf-8")
    (out / "search.json").write_text(json.dumps(search_entries, ensure_ascii=False), encoding="utf-8")
    print(f"wrote blog: {len(posts)} posts, {len(categories)} categories")


BLOG_JS = r'''(function () {
  var search = document.getElementById("postSearch");
  var grid = document.getElementById("postGrid");
  var count = document.getElementById("postCount");
  var active = "";
  function norm(value) { return (value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); }
  function apply() {
    if (!grid) return;
    var query = norm(search ? search.value : "");
    var shown = 0;
    grid.querySelectorAll(".blog-card").forEach(function (card) {
      var category = card.getAttribute("data-category") || "";
      var text = norm(card.getAttribute("data-search") || card.textContent);
      var show = (!active || category === active) && (!query || text.indexOf(query) !== -1);
      card.hidden = !show;
      if (show) shown++;
    });
    var empty = document.getElementById("blogEmpty");
    if (empty) empty.hidden = shown !== 0;
    if (count) count.textContent = shown + (shown === 1 ? " post" : " posts");
  }
  if (search) search.addEventListener("input", apply);
  document.querySelectorAll(".blog-filter").forEach(function (button) {
    button.addEventListener("click", function () {
      active = button.getAttribute("data-category") || "";
      document.querySelectorAll(".blog-filter").forEach(function (item) {
        var on = item === button;
        item.classList.toggle("active", on);
        item.setAttribute("aria-pressed", on ? "true" : "false");
      });
      apply();
    });
  });
  var hosts = [];
  document.querySelectorAll(".article-body div.highlight").forEach(function (host) { hosts.push(host); });
  document.querySelectorAll(".article-body pre").forEach(function (pre) {
    if (!pre.closest("div.highlight")) hosts.push(pre);
  });
  hosts.forEach(function (host) {
    var code = host.querySelector("code");
    if (!code || host.querySelector(".copy-btn")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";
    button.setAttribute("aria-label", "Copy code to clipboard");
    button.addEventListener("click", function () {
      var text = code.innerText;
      function done(ok) {
        button.textContent = ok ? "copied" : "copy failed";
        setTimeout(function () { button.textContent = "copy"; }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
    host.appendChild(button);
  });
})();
'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--portfolio-url", default="https://aaadarsh1337.github.io/")
    parser.add_argument("--github-user", default="aaadarsh1337")
    parser.add_argument("--github-repo", default="security-blog")
    args = parser.parse_args()
    build(Path(args.source).resolve(), Path(args.out).resolve(), args.portfolio_url, args.github_user, args.github_repo)


if __name__ == "__main__":
    main()
