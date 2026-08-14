# CTF Writeups Reader

Static site that lists challenges from your `ctf-writeups` GitHub repo and
renders markdown writeups on-page. Scripts, binaries, and other files link
out to GitHub.

## Setup

1. Edit `js/config.js` (username, repo, branch, portfolioUrl).
2. Preview:
   ```bash
   python3 -m http.server 8001
   ```
3. Deploy: copy into your portfolio as `/writeups/`.

## Repo layout

```
ctf-writeups/
â”œâ”€â”€ picoCTF/
â”‚   â””â”€â”€ tea-cash/
â”‚       â”œâ”€â”€ notes.md
â”‚       â”œâ”€â”€ exploit.py
â”‚       â””â”€â”€ libc.so.6
â””â”€â”€ pwnable_kr/
    â””â”€â”€ bof/
        â””â”€â”€ notes.md
```

Top-level folders become event filters. Folders with `.md` become cards.
