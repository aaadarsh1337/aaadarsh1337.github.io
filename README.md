# aaadarsh1337.github.io

Personal portfolio of **Adarsh Pillai (@aaadarsh1337)** — offensive security, reverse engineering, and CTFs.

**Live site:** [https://aaadarsh1337.github.io/](https://aaadarsh1337.github.io/)  
**Writeups:** [https://aaadarsh1337.github.io/writeups/](https://aaadarsh1337.github.io/writeups/)

**Blog:** [https://aaadarsh1337.github.io/blog/](https://aaadarsh1337.github.io/blog/)

Static site on GitHub Pages. No backend and no build step for the main site; Python generators build `/writeups/`, `/blog/`, and `/intel/` from their source repositories.

---

## What's on the site

| Section | Source | What it does |
|---------|--------|--------------|
| **01 · About / Hero** | `js/config.js` → `profile`, `stats` | Bio, tagline, location, résumé button, stats band |
| **02 · Skillset** | `js/config.js` → `skills` | Offensive sec / languages / tools / currently learning |
| **03 · Achievements** | `js/config.js` → `achievements` | CTF placements, THM rank, with proof links |
| **04 · Case study** | `js/config.js` → `flagship` | Threat Harbour SSH honeypot case study with live sensor metrics and links |
| **05 · Writing** | `blog/search.json` | Latest security note + link to the full writing archive |
| **06 · Repositories** | GitHub REST API + `js/config.js` → `github` | Supporting public repos sorted by recent push, with language / stars / push date |
| **07 · Certificates** | `js/config.js` → `certificates` | Card grid, verification links, local copies in `cybersecurity-achievements` as fallback |
| **08 · Contact** | `js/config.js` → `contact` | Email / Discord only (socials live in Links panel) |
| **CTF Writeups** | Generated `/writeups/` | 22+ static pages grouped by event (TryHackMe, pwnable.kr, picoCTF, HackerHolidays), with search + category tag filter + difficulty badges |
| **Security Blog** | Generated `/blog/` | Editorial writing hub with malware-analysis category pages, search, tags, article TOC, and related-post navigation |
| **Threat Intel** | Generated `/intel/` | Daily Threat Harbour dashboard (KPIs, timeline, credential/command leaderboards, takeaways) + vendored `data.json` |

Interactive extras (all in `js/main.js`, no framework):

- **⌘K command palette** (`Ctrl+K`) — jump to sections, open repos, search writeups and blog posts via local indexes
- **Repo file browser** — per-repo tree modal; readable files open inline, binaries link out to GitHub
- **File viewer modal** — renders code/text with highlighting inside the site
- **Links panel** — all socials/handles from `linkPanel` in one place
- **Live GitHub data** — repo cards fetch repository metadata from `api.github.com`, cached in-session; degrades gracefully offline/rate-limited

Design: Tokyo Night-inspired (near-black indigo `#16161e`, cyan `#7DCFFF` accents, Space Grotesk + Inter + JetBrains Mono).

---

## Project structure

```
├── index.html                  # Portfolio single page (sections 01–08, modals, palette)
├── 404.html                    # Styled 404 → Portfolio / Writeups / Blog
├── css/style.css               # All portfolio styling
├── js/
│   ├── config.js               # ★ ONLY file you edit for routine updates
│   └── main.js                 # Rendering, GitHub API, modals, palette, writeups search
├── assets/
│   ├── avatar.webp / avatar.jpg
│   ├── og.png                   # 1200×630 social card
│   └── certificate.png         # Placeholder cert badge
├── intel/                      # GENERATED — do not hand-edit (see below)
│   ├── index.html              # Threat Harbour dashboard (KPIs, timeline, leaderboards)
│   ├── data.json               # Vendored metrics.json snapshot this render came from
│   └── css/style.css + js/intel.js  # Theme + filter/copy (external for strict CSP)
├── blog/                       # GENERATED — do not hand-edit (see below)
│   ├── index.html              # Writing hub with search and category filters
│   ├── malware-analysis/       # Category archive and article pages
│   └── search.json             # Lightweight index for the portfolio command palette
├── scripts/
│   ├── build_writeups.py       # Markdown → static HTML generator
│   ├── build_intel.py          # metrics.json → static /intel/ dashboard (stdlib only)
│   ├── build_blog.py           # Markdown → static /blog/ generator
│   ├── style.css               # Writeups theme source (copied to writeups/css/)
│   ├── intel-style.css         # Intel theme source (copied to intel/css/)
│   ├── blog-style.css          # Blog theme source (copied to blog/css/)
│   └── difficulty_cache.json   # Verified difficulty labels (fallback when offline)
├── .github/workflows/deploy-writeups.yml  # Daily + on-push writeups rebuild
├── .github/workflows/deploy-intel.yml      # Daily 07:00 UTC + on-push intel rebuild
├── .github/workflows/deploy-blog.yml       # Daily + dispatch blog rebuild
├── robots.txt  .nojekyll
```

---

## Customizing (routine updates)

Everything content-driven lives in **`js/config.js`** — bio, skills, achievements, certs, socials, pinned repos, flagship copy. The site renders from that object; nothing else needs to change.

```js
github:      { username, hiddenRepos, pinnedRepos }  // repo tiles + ordering
flagship:    { repo, tagline, metricsUrl, fallbackStats, links }  // case-study card
profile:     { name, tagline, location, bio[], resumeUrl, avatar }
linkPanel:   [...]   // Links popup
skills:      [...]   // categories → chips
achievements: [...]  // { title, detail, date, url }
stats:       [...]   // 3–4 hero numbers
certificates:[...]   // { name, issuer, date, credentialUrl, image }
contact:     { email, discord }
```

No build step — edit, commit, push, GitHub Pages deploys.

---

## CTF writeups pipeline

Source of truth: [`ctf-writeups`](https://github.com/aaadarsh1337/ctf-writeups) (Markdown, one folder per challenge).

Generator: `scripts/build_writeups.py` (requires `markdown`, `pygments`, `pillow`):

```bash
pip install markdown pygments pillow
python3 scripts/build_writeups.py --source ../ctf-writeups --out ./writeups
```

What the build does:

- Finds writeups (`notes.md` / `writeup.md` / `README.md` / single `*.md` per folder)
- Renders Markdown → HTML with fenced code, tables, TOC, Tokyo Night Pygments theme
- Emits per-challenge pages with a clean editorial reading layout, challenge metadata, source link, code-copy controls, prev/next pager, JSON-LD `TechArticle` + canonical/OG tags
- Builds `writeups/index.html` (event sections, live filter), `search.json`, `js/filter.js`
- Copies challenge images preserving relative paths; articles keep the reading surface focused without a file drawer or reader chrome
- Difficulty badges are **source-grounded only**: frontmatter `difficulty:` wins → live platform pull (pwnable.kr bottle list, THM room JSON-LD `educationalLevel`, other pages' JSON-LD) → `difficulty_cache.json` → author-stated in text → no badge
- Category tags are **automatic**: frontmatter `tags: [rev]` wins → keyword + filename + event scoring (`rev` / `pwn` / `web` / `crypto` / `forensics` / `cloud` / `osint`, else `misc`) → index filter chips + article metadata badges + `search.json` refresh every build, so new writeups (and new categories) appear with zero template changes

Automation (`.github/workflows/deploy-writeups.yml`):

- Daily cron (`0 6 * * *`), manual `workflow_dispatch`, push to `scripts/build_writeups.py` / `style.css` / workflow file, or `repository_dispatch: writeups-updated` from the source repo
- Checks out both repos, builds, commits `writeups/` back with `chore: rebuild writeups from ctf-writeups` (skips empty commits)

---

## Security blog pipeline

The blog is generated from the separate public repository [`aaadarsh1337/security-blog`](https://github.com/aaadarsh1337/security-blog). The portfolio repository stores only the generated `/blog/` output, so posts can be edited independently of the site code.

### One-time GitHub setup

1. Create a new **public** repository named `security-blog` under `aaadarsh1337`.
2. Add a `posts/` directory and your first Markdown post:

```text
security-blog/
└── posts/
    └── malware-analysis/
        └── first-analysis.md
```

3. Push it to `main`:

```bash
git clone https://github.com/aaadarsh1337/security-blog.git
cd security-blog
mkdir -p posts/malware-analysis
# add your Markdown files
git add posts
git commit -m "docs: add malware analysis note"
git push -u origin main
```

4. In the portfolio repository, open **Actions → Build security blog → Run workflow** once. The workflow checks out `security-blog`, generates `/blog/`, and commits the result back to this repository.

The workflow also runs daily. It listens for a `blog-updated` repository dispatch, but the daily schedule and manual run require no extra token setup.

### Post frontmatter

Every post is a Markdown file under `posts/<category>/`. The generator supports these fields:

```markdown
---
title: A clear, specific title
date: 2026-09-24
category: malware-analysis
tags: [windows, loader, defense]
summary: One sentence used on cards and search.
featured: false
draft: false
---

Start the article here.
```

Supported initial categories are `malware-analysis`, `reverse-engineering`, `cloud-security`, `incident-response`, `tooling`, and `notes`. A post with `draft: true` is skipped.

### Local preview

From this portfolio repository:

```bash
python3 -m pip install "markdown==3.7" "Pygments==2.19.1"
python3 scripts/build_blog.py \
  --source ../security-blog \
  --out blog \
  --portfolio-url "https://aaadarsh1337.github.io/" \
  --github-user "aaadarsh1337" \
  --github-repo "security-blog"
python3 -m http.server 8000
# open http://localhost:8000/blog/
```

The generator creates the writing hub, category archives, article pages, and `search.json`. Images placed beside a Markdown post are copied into that article’s output directory.

### Optional instant publishing

The daily workflow is the simplest setup. For instant rebuilds, add a workflow to `security-blog` that dispatches `blog-updated` to this repository. Store a token as the `PORTFOLIO_DISPATCH_TOKEN` secret in the source repository; do not put it in Markdown or commit it.

```yaml
name: Notify portfolio blog
on:
  push:
    branches: [main]
    paths: ["posts/**"]
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch portfolio rebuild
        env:
          DISPATCH_TOKEN: ${{ secrets.PORTFOLIO_DISPATCH_TOKEN }}
        run: |
          curl --fail-with-body -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer $DISPATCH_TOKEN" \
            https://api.github.com/repos/aaadarsh1337/aaadarsh1337.github.io/dispatches \
            -d '{"event_type":"blog-updated"}'
```

Use a classic personal access token with the `repo` scope, stored only as the `PORTFOLIO_DISPATCH_TOKEN` secret in `security-blog`. The scheduled build remains the fallback if the dispatch secret is unavailable.

### Writing safely

Publish hashes, behavior, defensive detections, and reproducibility notes. Keep live malware, weaponized payloads, private infrastructure details, and unnecessary personal data out of public posts. The blog is for defensive education and research documentation.

---

## Local development

Main site needs no tooling — open `index.html` or serve it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Writeups preview:

```bash
pip install markdown pygments
python3 scripts/build_writeups.py --source ../ctf-writeups --out ./writeups
python3 -m http.server 8000
# → http://localhost:8000/writeups/
```

SEO/perf notes: canonical URLs, OG/Twitter cards, `Person` + `TechArticle` + `BlogPosting` JSON-LD, `robots.txt`, strict CSP meta tags, SRI-pinned CDN helpers (`marked` + `highlight.js` + `DOMPurify`, lazy-loaded from `js/main.js`), preloaded fonts, WebP avatar with JPG fallback. No sitemap is shipped (search engines discover pages via links; avoids daily-churn commits).

---

## Related repos

- [ctf-writeups](https://github.com/aaadarsh1337/ctf-writeups) — writeup Markdown (source of truth)
- [security-blog](https://github.com/aaadarsh1337/security-blog) — malware-analysis and security writing source
- [threat-harbour](https://github.com/aaadarsh1337/threat-harbour) — flagship: Cowrie SSH honeypot + daily threat-intel leaderboard
- [security-automation-toolkit](https://github.com/aaadarsh1337/security-automation-toolkit) — small tools and automation
- [cybersecurity-achievements](https://github.com/aaadarsh1337/cybersecurity-achievements) — certs / diplomas archive
- More notes/labs: `picoctf-lab-notes`, `tryhackme-lab-notes`, `practical-ethical-hacking-notes`, `ctf-learning-archive`

---

## On AI assistance

I'm a **cybersecurity student**, not a full-time web developer. Parts of this site's structure, layout, and tooling were built with help from AI assistants so I could ship a clear portfolio without turning it into a web-dev project.

- AI helped with HTML/CSS/JS structure, static generation, and polish
- **Content is mine** — writeups, notes, tools, certificates, and project work
- Security learning and CTF methodology are my own effort

I care more about the work behind the links than hand-rolling every CSS rule.

---

## Contact

Links and handles are on the [site](https://aaadarsh1337.github.io/) — or via `js/config.js` → `contact` / `linkPanel`.
