# aaadarsh1337.github.io

Personal site of **Adarsh Pillai (@aaadarsh1337)**: CTF writeups, security writing, and the Threat Harbour honeypot.

**Live:** https://aaadarsh1337.github.io/

It is a static site built with [Astro](https://astro.build) and deployed to GitHub Pages by one workflow. The writeups and blog posts stay in their own repositories as plain Markdown. Every build pulls them in, so publishing never involves touching this repo.

---

## Where things come from

| What | Source | Edit |
|---|---|---|
| Bio, skills, CTF results, certificates, links, flagship copy | `src/config.ts` | this repo |
| CTF writeups → `/writeups/<platform>/<challenge>/` | [`ctf-writeups`](https://github.com/aaadarsh1337/ctf-writeups) | push Markdown there |
| Blog posts → `/blog/<category>/<slug>/` | [`security-blog`](https://github.com/aaadarsh1337/security-blog) | push Markdown there |
| Threat Harbour numbers → `/intel/` | `threat-harbour/analysis/metrics.json` | updates itself daily |
| Repository list on `/about/` | GitHub API, fetched at build | automatic |
| Résumé, avatar, social card | `public/assets/` | this repo |

Counts are computed from the content itself: the number of writeups, platforms and posts, plus the tag and difficulty filters.

---

## Publishing

### A new writeup

Create a folder in `ctf-writeups` as `<platform>/<challenge>/notes.md`:

```markdown
---
title: Steganography          # shown exactly as written
difficulty: Hard              # platform's own label: Easy / Medium / Hard, Toddler's Bottle, Rookiss, Intermediate…
date: 2026-10-08
tags: [rev]                   # optional; if left out, categories are inferred from the text
---

# Steganography
## Challenge: <https://rerange.org/challenges/>

Your writeup…
```

How the build treats the folder:

- **Images:** put them next to `notes.md` and reference them relatively (`![flag](flag.png)`). They become numbered figures, and the alt text becomes the caption.
- **Other files:** exploits, solvers and binaries in the folder appear in the article's `ls -lh` panel, linked to GitHub.
- **Challenge link:** a first heading of the form `## Challenge: <url>` (or `## Room link: <url>`) becomes the challenge link in the header.
- **Code blocks:** fenced code is highlighted and numbered, with a copy button. Supported languages include `bash`, `py`, `c`, `asm` and `js`. Anything else renders as plain text.
- **Flags:** a blockquote containing a flag (`flag{…}`, `THM{…}` and similar) gets a quiet callout style.
- **Navigation:** prev/next links move chronologically through the same platform.

Push to `main`. If the `PORTFOLIO_DISPATCH_TOKEN` secret is set in that repo, the site rebuilds within a minute or two. If it isn't, the daily build picks the change up.

### A new blog post

In `security-blog`, copy `posts/malware-analysis/template.md`, then fill in the frontmatter (`title`, `date`, `category`, `summary`, `tags`, `slug`) and set `draft: false`. Images go next to the post. Push, and the post goes live the same way as a writeup.

Known categories: `malware-analysis`, `reverse-engineering`, `cloud-security`, `incident-response`, `tooling`, `notes`. Any other folder name also works and is shown as written.

### Everything else

Edit `src/config.ts` and push. The workflow rebuilds and deploys.

---

## Local development

Requires Node 22.12+.

```bash
npm ci
npm run content    # clones ctf-writeups + security-blog into content-src/, fetches metrics + repos
npm run dev        # http://localhost:4321
npm run build      # → dist/
```

To preview writeups or posts you haven't pushed yet, point the sync at local checkouts:

```bash
WRITEUPS_DIR=../ctf-writeups BLOG_DIR=../security-blog npm run content
```

`OFFLINE=1 npm run content` skips the network. The build then uses the snapshots in `src/data/` (`intel-snapshot.json`, `repos-snapshot.json`).

---

## Deploying

`.github/workflows/deploy.yml` builds and deploys on each of these triggers:

- a push to `main`
- a manual run
- a `repository_dispatch` of `writeups-updated`, `blog-updated`, `threat-harbour-updated` or `intel-updated`
- daily at 07:17 UTC, after the sensor publishes

**One-time setup:** go to *Settings → Pages → Source* and select **GitHub Actions**.

The workflow also checks that every page carries no inline or remote script other than the single hashed theme snippet the CSP allows.

---

## Project map

```
src/
  config.ts              ★ the file you edit
  pages/                 routes (/, /writeups, /blog, /intel, /about, 404, *.json)
  layouts/Base.astro     <head>, CSP, theme, sidebar, footer
  components/            Moon (live phase), Article, Sidebar, Palette (⌘K), Blades (chart), …
  lib/
    markdown.ts          Markdown → HTML (highlighting, figures, listings, sanitising)
    writeups.ts          discovery, difficulty, tag inference, attachments, prev/next
    blog.ts  intel.ts  repos.ts  moon.ts  format.ts
  styles/                tokens.css (the design system) + global.css
  data/                  snapshots used when the network isn't available
scripts/sync-content.mjs pulls content + copies images to their public URLs
public/                  static files served as-is (assets/, favicon, robots.txt)
```

### Design notes

The look is "Lunar": a night field, moonlit type, one blue accent.

- **Type:** one face, Instrument Sans. Monospace appears only in real code. There are five size steps (`src/styles/tokens.css`).
- **Colour:**
  - Night is the default and dawn is the light theme; the visitor's choice is remembered.
  - Surfaces are separated by tone steps, never by lines or shadows.
  - Accents carry fixed meanings:
    - lily: hard, pwn, current page
    - lantern: medium, crypto
    - tide: rev, the sensor
    - sage: easy, verified
- **Home** (`src/components/home/B.astro`), in this order:
  - your name in Shippori Mincho, the bio in Newsreader, and the avatar as a framed print
  - stats
  - Latest: writeups and blog posts, newest first
  - Threat Harbour in detail, from the live `metrics.json`
  - CTF results
  - No writeup screenshots are used outside the writeups themselves.
- **About:** skills appear once, as "What I work with" (`src/components/Toolbox.astro`); skills that have writeups link to the filtered list. Each CTF result carries its own proof and certificate links; Certificates lists only the rest.
- **Moon:**
  - The textured moon in the top bar is tonight's real phase, computed in the visitor's browser, with its name written beside it.
  - Clicking it opens a "Tonight" card: phase, how much is lit, the moon's age, and the next full and new moon.
  - Difficulty is drawn as moon phases: crescent, half, full.
- **Writeups:** each one has a file listing beside the article. The contents rail is gone.
- **Shortcuts:** `/` or `⌘K` opens jump-search. On `/writeups/`, `/` focuses the filter instead.


All URLs from the previous version of the site still work, including `/writeups/search.json`, `/blog/search.json` and `/intel/data.json`.

---

## On AI assistance

I'm a **cybersecurity student**, not a full-time web developer. Parts of this site's structure, layout, and tooling were built with help from AI assistants so I could ship a clear portfolio without turning it into a web-dev project.

- AI helped with HTML/CSS/JS structure, static generation, and polish
- **Content is mine** — writeups, notes, tools, certificates, and project work
- Security learning and CTF methodology are my own effort

I care more about the work behind the links than hand-rolling every CSS rule.
