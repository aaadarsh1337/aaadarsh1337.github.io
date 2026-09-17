// =====================================================================
// PORTFOLIO CONFIG
// This is the only file you should need to touch for routine updates:
// new certs, new skills, changed bio, new socials, etc.
// The site reads this object and renders everything dynamically —
// nothing else needs to change.
// =====================================================================

window.PORTFOLIO_CONFIG = {

  // --- GitHub -----------------------------------------------------
  // Anonymous API requests only (60/hr). No token field: a token committed
  // here would ship to every visitor of this public site.
  github: {
    username: "aaadarsh1337",
    // Repos you never want shown on the site
    hiddenRepos: ["aaadarsh1337.github.io", "aaadarsh1337", "threat-harbour"],
    // Repo names to always show first, in the exact order you list them.
    // Everything not listed here follows by most-recently-updated.
    // Example: pinnedRepos: ["my-best-project", "ctf-writeups", "pentest-notes"]
    // Note: threat-harbour lives above as the flagship spotlight, so it is
    // hidden from the normal tiles (hiddenRepos wins) and not pinned here.
    pinnedRepos: ["ctf-writeups", "security-automation-toolkit", "tryhackme-lab-notes", "cybersecurity-achievements"]
  },

  // --- Flagship spotlight -------------------------------------------
  // Rendered as a hero card at the top of the Repositories section.
  // Edit copy freely. Live sensor numbers are fetched from metricsUrl
  // (with the fallbackStats below shown if the fetch fails/offline).
  flagship: {
    repo: "threat-harbour",
    badge: "Flagship project",
    name: "Threat Harbour",
    tagline: "Live SSH honeypot · daily threat-intel leaderboard",
    description: "A Cowrie SSH sensor on Oracle Cloud Free Tier that publishes a fresh leaderboard of real attacker credentials every 24 hours — the usernames, passwords, and commands bots actually try against SSH servers in the wild.",
    highlights: [
      "Daily GitHub Actions pipeline parses Cowrie logs on-box, commits aggregates only",
      "Grafana + Loki + Promtail monitor stack, localhost-bound via SSH tunnel",
      "Reproducible offline analysis in scripts/ with full methodology docs"
    ],
    stack: ["Cowrie 3.x", "Oracle Cloud", "Grafana + Loki", "GitHub Actions", "Python"],
    metricsUrl: "https://raw.githubusercontent.com/aaadarsh1337/threat-harbour/main/analysis/metrics.json",
    fallbackStats: [
      { value: "174,927", label: "events captured" },
      { value: "2,112", label: "unique source IPs" },
      { value: "28,501", label: "sessions" },
      { value: "daily", label: "leaderboard refresh" }
    ],
    links: {
      github: "https://github.com/aaadarsh1337/threat-harbour",
      leaderboard: "https://github.com/aaadarsh1337/threat-harbour#collected-data--refreshed-every-24-hours-last-run-08-09-2026-utc",
      docs: "https://github.com/aaadarsh1337/threat-harbour/tree/main/docs"
    }
  },

  // --- Identity -----------------------------------------------------
  profile: {
    name: "ADARSH PILLAI",                                   // EDIT ME — full name
    handle: "aaadarsh1337",
    tagline: "Offensive security · Reverse Engineering · CTF",  // EDIT ME
    location: "India",                                         // EDIT ME
    // Short phrase for the top-left LOC / FOCUS boxes and the hero meta line
    currentFocus: "Offensive",
    avatar: "assets/avatar.webp",                   // EDIT ME: swap the file or path (JPG fallback: assets/avatar.jpg)
    // All your platform handles — shown as chips under the tagline.
    // Add / remove freely. Leave url blank if you don't want it clickable

    bio: [
      "I’m Adarsh Pillai — aaadarsh1337, jackthereaper1337, or Hasher2009 online. I’m a cybersecurity student with a longstanding interest in offensive security and a growing focus on reverse engineering. What started as curiosity about computers became something I spend much of my free time on: solving challenges, experimenting with tools, and understanding the details behind how things work.",
      "As one of the three co-founders and a core member of 404squad, I organize our near-weekly CTF participation and primarily work on misc and rev challenges. Building a team that consistently shows up, learns together, and enjoys the process matters to me as much as the competition itself.",
      "Outside CTFs, I’m usually digging further into reverse engineering or working on security projects of my own. I enjoy having something unfamiliar to figure out, whether that means tracing a binary, testing an approach, or writing a tool to make progress. This site collects that work, along with the notes and writeups I produce along the way."
    ],
    resumeUrl: ""   // EDIT ME: link to a hosted PDF resume. Leave blank and the button hides itself.
  },
// --- Links (button-based reveal) -----------------------------------
  // All profile, social, and platform handles. Shown in the "Links" panel.
  linkPanel: [
    { label: "GitHub",      detail: "@aaadarsh1337",  url: "https://github.com/aaadarsh1337" },
    { label: "TryHackMe", detail: "THM", url: "https://tryhackme.com/p/aaadarsh1337" },
    { label: "PicoCTF", detail: "PICO", url: "https://learn.cylabacademy.org/users/jackthereaper1337" },
    { label: "pwn.college",     detail: "PWN", url: "https://pwn.college/hacker/192643" },
    { label: "CTFtime",     detail: "CTFs",  url: "https://ctftime.org/user/265799" },
    { label: "Discord",     detail: "Hit Me Up",       url: "https://discord.com/users/15248404499301847090" },
    { label: "Twitter / X", detail: "@aaadarsh1337",   url: "https://x.com/aaadarsh1337" },
    { label: "Email",       detail: "GMail", url: "mailto:adarshpillai1337@gmail.com" }
  ],

  // --- Skillset (button-based reveal) --------------------------------
  // Add or remove categories/items freely — the buttons and chips are
  // generated from this array.
  skills: [
    {
      category: "Offensive Security",
      items: ["Web Exploitation", "Network Security", "Reverse Engineering", "Binary Exploitation", "OSINT"]
    },
    {
      category: "Languages",
      items: ["Python", "Bash", "C", "SQL", "GoLang"]
    },
    {
      category: "Tools",
      items: ["Web: Burp Suite, ffuf, Nuclei", "Network: Nmap, Wireshark", "Binary: Ghidra, Binary Ninja, pwntools, pwndbg", "Forensics: Autopsy, Binwalk"]
    },
    {
      category: "Currently Learning",
      items: ["Forensics", "Blockchain", "Cloud", "Assembly for RE"]
    }
  ],

  achievements: [
    {
      title: "TFC CTF 2026",
      detail: "404squad - #23 Human Division; #172 Overall",
      date: "2026",
      url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/TFCCTF"
    },
    {
      title: "z0d1ak CTF 2026",
      detail: "404squad - #13 Human Division; #75 Overall",
      date: "2026",
      url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/z0d1ak-ctf"
    },
    {
      title: "TryHackMe",
      detail: "Top 2% Global; 100+ Rooms Completed",
      date: "2026",
      url: "https://tryhackme.com/p/aaadarsh1337"                               // no link = text only
    }
  ],

  // --- Stats band (glanceable numbers under the hero) ------------------
  // ONLY what you list here is shown — add or delete rows freely.
  // Keep it to 3-4 essentials so it reads at a glance.
  stats: [
    { value: "Top 2%", label: "TryHackMe global" },
    { value: "100+", label: "THM rooms done" },
    { value: "22", label: "CTF writeups" }
  ],
  // --- Certificates ---------------------------------------------------
  // Duplicate the object below for each certificate. Order = display order.
  certificates: [
    {
      name: "TFC CTF",
      issuer: "TFC",
      date: "2026",
      credentialUrl: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/TFCCTF/tfc-ctf-26-diploma-adarsh-pillai.png",
      image: "assets/certificate.png"        // drop a real badge into assets/ and point here
    },
    {
      name: "z0d1ak CTF",
      issuer: "z0d1ak",
      date: "2026",
      credentialUrl: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/z0d1ak-ctf/z0d1ak-certificate-adarsh-pillai.pdf",                          // verification link (optional)
      image: "assets/certificate.png"        // drop a real badge into assets/ and point here
    },
    {
      name: "HACKER HOLIDAYS",
      issuer: "TryHackMe",
      date: "2026",
      credentialUrl: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-THCFDTXKFZ.pdf",                          // verification link (optional)
      image: "assets/certificate.png"        // drop a real badge into assets/ and point here
    },
    {
      name: "ADVENT OF CYBER 3",
      issuer: "TryHackMe",
      date: "2021",
      credentialUrl: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-KMESEDNQTS.pdf",                          // verification link (optional)
      image: "assets/certificate.png"        // drop a real badge into assets/ and point here
    },
    {
      name: "PRACTICAL ETHICAL HACKING",
      issuer: "TCM Security & Udemy",
      date: "2021",
      credentialUrl: "https://www.udemy.com/certificate/UC-17b88a43-ad89-4b6a-a73a-ce3f22cdc753/",                          // verification link (optional)
      image: "assets/certificate.png"        // drop a real badge into assets/ and point here
    }
  ],

  // --- Contact (display only — no form) -------------------------------
  // Only genuine "reach me" methods live here. Social/profile links are in
  // linkPanel (shown via the "Links" button) to keep the two concerns separate.
  contact: {
    email: "adarshpillai1337@gmail.com",        // EDIT ME
    discord: "https://discord.com/users/15248404499301847090" // leave blank to hide
  }

};
