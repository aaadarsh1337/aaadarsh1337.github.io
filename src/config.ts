// =====================================================================
// SITE CONFIG — the one file to edit for routine updates:
// bio, skills, CTF results, certificates, links, flagship copy.
//
// Writeups and blog posts are NOT here: they come from the ctf-writeups and
// security-blog repos and are counted automatically. Threat Harbour numbers
// come from the sensor's metrics.json at build time.
// =====================================================================

export const site = {
  url: "https://aaadarsh1337.github.io",
  github: {
    user: "aaadarsh1337",
    // Repos never shown in the repository list (the flagship has its own page).
    hiddenRepos: ["aaadarsh1337.github.io", "aaadarsh1337", "threat-harbour"],
    // Shown first, in this order; the rest follow by most recent push.
    pinnedRepos: ["ctf-writeups", "security-automation-toolkit", "tryhackme-lab-notes", "cybersecurity-achievements"],
  },

  profile: {
    name: "Adarsh Pillai",
    handle: "aaadarsh1337",
    aliases: ["jackthereaper1337", "Hasher2009"],
    tagline: ["Offensive security", "Reverse Engineering", "CTF"],
    location: "India",
    timezone: "Asia/Kolkata",
    focus: "Reverse Engineering",
    team: "404squad",
    teamRole: "co-founder",
    avatar: "/assets/avatar.webp",
    avatarFallback: "/assets/avatar.jpg",
    resume: "/assets/resume.pdf",
    // Shown verbatim on the home page. The first paragraph is set as a lede.
    bio: [
      "I’m Adarsh Pillai — aaadarsh1337, jackthereaper1337, or Hasher2009 online. I’m a cybersecurity student with a longstanding interest in offensive security and a growing focus on reverse engineering. What started as curiosity about computers became something I spend much of my free time on: solving challenges, experimenting with tools, and understanding the details behind how things work.",
      "As one of the three co-founders and a core member of 404squad, I organize our near-weekly CTF participation and primarily work on misc and rev challenges. Building a team that consistently shows up, learns together, and enjoys the process matters to me as much as the competition itself.",
      "Outside CTFs, I’m usually digging further into reverse engineering or working on security projects of my own. I enjoy having something unfamiliar to figure out, whether that means tracing a binary, testing an approach, or writing a tool to make progress. This site collects that work, along with the notes and writeups I produce along the way.",
    ],
    // Phrases in the bio that become links (first occurrence only, text unchanged).
    bioLinks: [
      { text: "404squad", href: "/achievements/" },
      { text: "security projects of my own", href: "/intel/" },
      { text: "writeups", href: "/writeups/" },
    ],
    motto: "secrets die here",
  },

  // Glanceable numbers. The writeup count is added automatically.
  stats: [
    { value: "Top 2%", label: "TryHackMe global" },
    { value: "100+", label: "THM rooms done" },
  ],

  skills: [
    { category: "Offensive Security", items: ["Reverse Engineering", "Binary Exploitation", "OSINT", "Web Exploitation", "Network Security"] },
    { category: "Languages", items: ["Python", "Bash", "C", "SQL", "GoLang"] },
    { category: "Tools", items: ["Binary: Ghidra, Binary Ninja, pwntools, pwndbg", "Forensics: Autopsy, Binwalk", "Web: Burp Suite, ffuf, Nuclei", "Network: Nmap, Wireshark"] },
    { category: "Currently Learning", items: ["VM Reversing", "Embedded Security", "Malware Analysis", "Firmware Analysis"] },
  ],

  // Team placements, in the order played. `url` = proof.
  achievements: [
    { title: "Lun4R CTF 2026 - Finals", detail: "404squad - #9 Overall", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/Lun4R-finals" },
    { title: "H7CTF 2026", detail: "404squad - #58 Overall", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/H7CTF" },
    { title: "Lun4R CTF 2026 - Qualifiers", detail: "404squad - #2 Overall", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/Lun4R-quals" },
    { title: "PwnSec CTF 2026", detail: "404squad - #6 Human Division of 237 teams", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/PwnSec" },
    { title: "TFC CTF 2026", detail: "404squad - #23 Human Division; #172 Overall", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/TFCCTF" },
    { title: "z0d1ak CTF 2026", detail: "404squad - #13 Human Division; #75 Overall", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/z0d1ak-ctf" },
  ],

  certificates: [
    { name: "PwnSec CTF", issuer: "PwnSec", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/PwnSec/006_404squad.pdf" },
    { name: "Lun4R CTF - Finals", issuer: "ROOT RIET", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/Lun4R-finals/Adarsh%20Pillai%20(404squad).pdf" },
    { name: "Lun4R CTF - Qualifiers", issuer: "ROOT RIET", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/Lun4R-quals/LUN4R_CTF_2026_Certificate_Adarsh_Pillai.jpg" },
    { name: "H7CTF", issuer: "H7CTF / ABU", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/H7CTF/certificate_H7CTF26-46VN-V3V2-32HK.png" },
    { name: "TFC CTF", issuer: "TFC", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/TFCCTF/tfc-ctf-26-diploma-adarsh-pillai.png" },
    { name: "z0d1ak CTF", issuer: "z0d1ak", date: "2026", url: "https://github.com/aaadarsh1337/cybersecurity-achievements/blob/main/z0d1ak-ctf/z0d1ak-certificate-adarsh-pillai.pdf" },
    { name: "Hacker Holidays", issuer: "TryHackMe", date: "2026", url: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-THCFDTXKFZ.pdf" },
    { name: "Advent of Cyber 3", issuer: "TryHackMe", date: "2021", url: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-KMESEDNQTS.pdf" },
    { name: "Practical Ethical Hacking", issuer: "TCM Security & Udemy", date: "2021", url: "https://www.udemy.com/certificate/UC-17b88a43-ad89-4b6a-a73a-ce3f22cdc753/" },
  ],

  links: [
    { label: "GitHub", detail: "@aaadarsh1337", url: "https://github.com/aaadarsh1337" },
    { label: "TryHackMe", detail: "aaadarsh1337", url: "https://tryhackme.com/p/aaadarsh1337" },
    { label: "PicoCTF", detail: "jackthereaper1337", url: "https://learn.cylabacademy.org/users/jackthereaper1337" },
    { label: "pwn.college", detail: "hacker/192643", url: "https://pwn.college/hacker/192643" },
    { label: "CTFtime", detail: "user/265799", url: "https://ctftime.org/user/265799" },
    { label: "Twitter / X", detail: "@aaadarsh1337", url: "https://x.com/aaadarsh1337" },
  ],

  contact: {
    email: "adarshpillai1337@gmail.com",
    discord: "https://discord.com/users/15248404499301847090",
  },

  flagship: {
    name: "Threat Harbour",
    tagline: "SSH honeypot · daily threat-intel leaderboard",
    description: "A Cowrie SSH sensor on Oracle Cloud Free Tier that publishes a fresh leaderboard of real attacker credentials every 24 hours — the usernames, passwords, and commands bots actually try against SSH servers in the wild.",
    highlights: [
      "Daily GitHub Actions pipeline parses Cowrie logs on-box, commits aggregates only",
      "Grafana + Loki + Promtail monitor stack, localhost-bound via SSH tunnel",
      "Reproducible offline analysis in scripts/ with full methodology docs",
    ],
    stack: ["Cowrie 3.x", "Oracle Cloud", "Grafana + Loki", "GitHub Actions", "Python"],
    links: {
      github: "https://github.com/aaadarsh1337/threat-harbour",
      docs: "https://github.com/aaadarsh1337/threat-harbour/tree/main/docs",
    },
  },
} as const;
