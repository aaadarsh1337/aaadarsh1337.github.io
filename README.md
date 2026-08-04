# Portfolio

A static, self-updating portfolio site. It has no backend — repositories
are pulled live from the GitHub REST API in the browser, so adding a new
repo to your GitHub account is enough to make it show up here after a
refresh. Everything else editable (name, bio, skills, certs, contact info)
lives in one file: `js/config.js`.

## Structure

```
portfolio/
├── index.html          Page structure — you shouldn't need to touch this
├── css/style.css        Visual styling — "blueprint" theme + JetBrains Mono
├── js/config.js          <-- EDIT THIS for all your content
├── js/main.js            Rendering + GitHub API logic
├── assets/
│   ├── avatar-placeholder.svg   replace with your real photo
│   └── cert-placeholder.svg     replace with real cert badges, or reuse
└── README.md            this file
```

## What to edit (start here)

Open `js/config.js`. Every field marked `EDIT ME` or `PLACEHOLDER` is meant
to be replaced.

### 1. Profile / identity
- `profile.name` — your real name
- `profile.handle` — primary handle (shown in the top-left box)
- `profile.tagline` — short one-liner under your name
- `profile.location` — city / country
- `profile.currentFocus` — what you're focused on right now
- `profile.avatar` — path to your photo (drop a file into `assets/` first)
- `profile.handles` — array of all your usernames. Add as many as you want:
  ```js
  { platform: "GitHub", handle: "aaadarsh1337", url: "https://github.com/aaadarsh1337" }
  ```
  Leave `url` as `""` if you don't want that chip to be a link.
- `profile.bio` — array of paragraphs (strings)
- `profile.resumeUrl` — link to a hosted PDF. Leave `""` to hide the button.

### 2. Skills
Add / remove whole categories or individual items. Buttons and chips are
generated automatically from the `skills` array.

### 3. Certificates
Duplicate one block per certificate:

```js
{
  name: "TryHackMe Jr Penetration Tester",
  issuer: "TryHackMe",
  date: "2025",
  credentialUrl: "https://...",
  image: "assets/thm-jr.png"   // drop the image into assets/ first
}
```

Order in the array = order on the page.

### 4. Contact
Just display links — there is no contact form. Fill in the fields you want
shown; leave any you don't use as `""` and they stay hidden.
`extraLinks` is for anything else:

```js
extraLinks: [
  { label: "Twitter / X", url: "https://x.com/..." }
]
```

### 5. Reordering GitHub repository cards
In `github.pinnedRepos`, list repo **names** in the exact order you want
them to appear at the top. Everything not listed still appears, sorted by
most-recently-updated.

```js
pinnedRepos: ["my-best-writeup", "ctf-notes", "dashboard-pentest"]
```

Use `hiddenRepos` to permanently hide repos (e.g. this site itself).

## Adding real images

Drop image files into `assets/` (e.g. `assets/me.jpg`, `assets/cert-oscp.png`)
and point to them from `config.js` (`profile.avatar`, `certificates[i].image`).

## How the file reader works

Clicking "Browse files" on a repo card fetches that repo's file tree from
the GitHub API. Clicking a file:
- Text/source types (`.py`, `.md`, `.js`, `.txt`, `.json`, etc.) are fetched
  from `raw.githubusercontent.com` and rendered inline with Markdown +
  syntax highlighting.
- Everything else (images, binaries, PDFs, archives…) shows a redirect
  card straight to that file on GitHub.

The readable-extensions list lives near the top of `js/main.js`
(`READABLE_EXT`) if you ever want to add or remove types.

## Running it locally

From inside the `portfolio/` folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser. It works on phones too —
the top-left panel collapses into a hamburger menu under ~760px width.

## Deploying to GitHub Pages

1. Create a repo named exactly `<your-username>.github.io`.
2. Push the **contents** of the `portfolio/` folder to that repo's default
   branch (not the folder itself — the files should sit at the repo root).
3. In Settings → Pages, confirm it's building from that branch.
4. Site is live at `https://<your-username>.github.io`.

## Notes / limits

- GitHub API allows 60 unauthenticated requests per hour per IP. Normal
  portfolio traffic is fine; heavy file browsing in a short window can
  hit the limit and show a friendly retry message.
- This is a fully static site — no backend, nothing is stored.
