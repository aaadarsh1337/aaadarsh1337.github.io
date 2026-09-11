# aaadarsh1337.github.io

Personal portfolio of **Adarsh Pillai (@aaadarsh1337)** — offensive security, reverse engineering, and CTFs.

**Live site:** [https://aaadarsh1337.github.io/](https://aaadarsh1337.github.io/)  
**Writeups:** [https://aaadarsh1337.github.io/writeups/](https://aaadarsh1337.github.io/writeups/)

Static site on GitHub Pages. No backend, no build step for the main site — just HTML/CSS/JS plus a Python generator for `/writeups/`.

---

## What's on the site

| Section | Source | What it does |
|---------|--------|--------------|
| **01 · About / Hero** | `js/config.js` → `profile`, `stats` | Bio, tagline, location, résumé button, stats band |
| **02 · Skillset** | `js/config.js` → `skills` | Offensive sec / languages / tools / currently learning |
| **03 · Achievements** | `js/config.js` → `achievements` | CTF placements, THM rank, with proof links |
| **04 · Repositories** | GitHub REST API + `js/config.js` → `github`, `flagship` | Flagship spotlight (Threat Harbour w/ live metrics) + pinned repos sorted by recent push, with language / stars / push date |
| **05 · Certificates** | `js/config.js` → `certificates` | Card grid, verification links, local copies in `cybersecurity-achievements` as fallback |
| **06 · Contact** | `js/config.js` → `contact` | Email / LinkedIn / Discord only (socials live in Links panel) |
| **CTF Writeups** | Generated `/writeups/` | 22+ static pages grouped by event (TryHackMe, pwnable.kr, picoCTF, HackerHolidays), with search + difficulty badges |

Interactive extras (all in `js/main.js`, no framework):

- **⌘K command palette** (`Ctrl+K`) — jump to sections, open repos, search writeups via `writeups/search.json`
- **Repo file browser** — per-repo tree modal; readable files open inline, binaries link out to GitHub
- **File viewer modal** — renders code/text with highlighting inside the site
- **Links panel** — all socials/handles from `linkPanel` in one place
- **Live GitHub data** — repo cards fetch `repos` + `languages` from `api.github.com`, cached in-session; degrades gracefully offline/rate-limited

Design: Tokyo Night-inspired (near-black indigo `#16161e`, cyan `#7DCFFF` accents, Space Grotesk + Inter + JetBrains Mono).

---

## Project structure

```
├── index.html                  # Portfolio single page (sections 01–06, modals, palette)
├── 404.html                    # Styled 404 → Portfolio / All writeups
├── css/style.css               # All portfolio styling
├── js/
│   ├── config.js               # ★ ONLY file you edit for routine updates
│   └── main.js                 # Rendering, GitHub API, modals, palette, writeups search
├── assets/
│   ├── avatar.webp / avatar.jpg
│   └── certificate.png         # Placeholder cert badge
├── writeups/                   # GENERATED — do not hand-edit (see below)
│   ├── index.html              # Event-grouped cards + live filter
│   ├── search.json             # Title/event/url index for ⌘K palette
│   ├── sitemap-writeups.xml
│   ├── css/style.css + pygments.css
│   └── hackerholidays/ picoctf/ pwnable_kr/ tryhackme/  # one folder per challenge
├── scripts/
│   ├── build_writeups.py       # Markdown → static HTML generator
│   ├── style.css               # Writeups theme source (copied to writeups/css/)
│   └── difficulty_cache.json   # Verified difficulty labels (fallback when offline)
├── .github/workflows/deploy-writeups.yml  # Daily + on-push writeups rebuild
├── sitemap.xml  robots.txt  .nojekyll
```

---

## Customizing (routine updates)

Everything content-driven lives in **`js/config.js`** — bio, skills, achievements, certs, socials, pinned repos, flagship copy. The site renders from that object; nothing else needs to change.

```js
github:      { username, hiddenRepos, pinnedRepos }  // repo tiles + ordering
flagship:    { repo, tagline, metricsUrl, fallbackStats, links }  // hero card in Repositories
profile:     { name, tagline, location, bio[], resumeUrl, avatar }
linkPanel:   [...]   // Links popup
skills:      [...]   // categories → chips
achievements: [...]  // { title, detail, date, url }
stats:       [...]   // 3–4 hero numbers
certificates:[...]   // { name, issuer, date, credentialUrl, image }
contact:     { email, linkedin, discord }
```

No build step — edit, commit, push, GitHub Pages deploys.

---

## CTF writeups pipeline

Source of truth: [`ctf-writeups`](https://github.com/aaadarsh1337/ctf-writeups) (Markdown, one folder per challenge).

Generator: `scripts/build_writeups.py` (requires `markdown`, `pygments`):

```bash
pip install markdown pygments
python3 scripts/build_writeups.py --source ../ctf-writeups --out ./writeups
```

What the build does:

- Finds writeups (`notes.md` / `writeup.md` / `README.md` / single `*.md` per folder)
- Renders Markdown → HTML with fenced code, tables, TOC, Tokyo Night Pygments theme
- Emits per-challenge page with sidebar (challenge meta, file list, GitHub folder/markdown links), prev/next pager, JSON-LD `TechArticle` + canonical/OG tags
- Builds `writeups/index.html` (event sections, live filter), `search.json`, `sitemap-writeups.xml`
- Copies challenge images preserving relative paths; sidebar lists all sibling files
- Difficulty badges are **source-grounded only**: frontmatter `difficulty:` wins → live platform pull (pwnable.kr bottle list, THM room JSON-LD `educationalLevel`, other pages' JSON-LD) → `difficulty_cache.json` → author-stated in text → no badge

Automation (`.github/workflows/deploy-writeups.yml`):

- Daily cron (`0 6 * * *`), manual `workflow_dispatch`, push to `scripts/build_writeups.py` / `style.css` / workflow file, or `repository_dispatch: writeups-updated` from the source repo
- Checks out both repos, builds, commits `writeups/` back with `chore: rebuild writeups from ctf-writeups` (skips empty commits)

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

SEO/perf notes: canonical URLs, OG/Twitter cards, `Person` + `TechArticle` JSON-LD, `sitemap.xml` + `robots.txt`, deferred CDN scripts (`marked` + `highlight.js` + `DOMPurify`), preloaded fonts, WebP avatar with JPG fallback.

---

## Related repos

- [ctf-writeups](https://github.com/aaadarsh1337/ctf-writeups) — writeup Markdown (source of truth)
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
