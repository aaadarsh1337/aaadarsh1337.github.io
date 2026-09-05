// =====================================================================
// PORTFOLIO CONFIG
// This is the only file you should need to touch for routine updates:
// new certs, new skills, changed bio, new socials, etc.
// The site reads this object and renders everything dynamically —
// nothing else needs to change.
// =====================================================================

window.PORTFOLIO_CONFIG = {

  // --- GitHub -----------------------------------------------------
  github: {
    username: "aaadarsh1337",
    // Repos you never want shown on the site
    hiddenRepos: ["aaadarsh1337.github.io", "aaadarsh1337"],
    // Repo names to always show first, in the exact order you list them.
    // Everything not listed here follows by most-recently-updated.
    // Example: pinnedRepos: ["my-best-project", "ctf-writeups", "pentest-notes"]
    pinnedRepos: ["ctf-writeups", "security-automation-toolkit", "picoctf-lab-notes", "tryhackme-lab-notes", "practical-ethical-hacking-notes", "ctf-learning-archive", "cybersecurity-achievements" ]
  },

  // --- Identity -----------------------------------------------------
  profile: {
    name: "ADARSH PILLAI",                                   // EDIT ME — full name
    handle: "aaadarsh1337",
    tagline: "Offensive security · reverse engineering · CTF",  // EDIT ME
    location: "India",                                         // EDIT ME
    // Short phrase for the top-left LOC / FOCUS boxes and the hero meta line
    currentFocus: "Offensive",
    avatar: "assets/avatar.jpg",                   // EDIT ME: swap the file or path
    // All your platform handles — shown as chips under the tagline.
    // Add / remove freely. Leave url blank if you don't want it clickable

    bio: [
      "",
      "I’m aaadarsh1337 | jackthereaper1337 | Hasher2009, a cybersecurity enthusiast and CTF player who loves turning ideas into working tools. I’m especially interested in penetration testing, reverse engineering, and building custom security utilities—from quick scripts for CTF challenges to more structured tools for learning and automation.",
      "Most of what I do is hands-on: I break down problems, explore how systems behave, and document what I learn along the way—whether it’s through clean code, notes, or practical experiments. My goal is to keep leveling up by tackling real challenges, studying the “why” behind the behavior, and continuously improving my workflow.",
      "On this portfolio, you’ll find projects and repositories focused on security tooling, CTF write-ups, and cybersec learning notes, plus the small experiments that help me get better every step of the way."
    ],
    resumeUrl: "https://github.com"   // EDIT ME: link to a hosted PDF resume. Leave blank and the button hides itself.
  },
// --- Links (button-based reveal) -----------------------------------
  // All profile, social, and platform handles. Shown in the "Links" panel.
  linkPanel: [
    { label: "GitHub",      detail: "@aaadarsh1337",  url: "https://github.com/aaadarsh1337" },
    { label: "TryHackMe", detail: "THM", url: "https://tryhackme.com/p/aaadarsh1337" },
    { label: "PicoCTF", detail: "PICO", url: "https://learn.cylabacademy.org/users/jackthereaper1337" },
    { label: "pwn.college",     detail: "PWN", url: "https://pwn.college/hacker/192643" },
    { label: "CTFtime",     detail: "CTFs",  url: "https://ctftime.org/user/265799" },
    { label: "LinkedIn",    detail: "Adarsh Pillai",  url: "https://linkedin.com/in/aaadarsh1337" },
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
      items: ["Web: Burp Suite, FFUF, Nikto", "Network: nmap, Wireshark", "Binary: Ghidra, Binary Ninja, pwntools, pwndbg", "Forensics: Autopsy, Binwalk"]
    },
    {
      category: "Currently Learning",
      items: ["Forensics", "Blockchain", "Cloud", "Assembly for RE"]
    }
  ],

  achievements: [
    {
      title: "z0d1ak CTF 2026",
      detail: "404squad - #75 Overall; #13 Human Division",
      date: "2026",
      url: "https://github.com/aaadarsh1337/cybersecurity-achievements/tree/main/z0d1ak-ctf"
    },
    {
      title: "Vulnerability disclosure",
      detail: "Coming soon",
      date: "2026",
      url: ""                    // advisory, report, or writeup
    },
    {
      title: "TryHackMe",
      detail: "Top 2% Global; 100+ Rooms Completed",
      date: "2026",
      url: "https://tryhackme.com/p/aaadarsh1337"                               // no link = text only
    }
  ],
  // --- Certificates ---------------------------------------------------
  // Duplicate the object below for each certificate. Order = display order.
  certificates: [
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
    linkedin: "https://linkedin.com/in/aaadarsh1337",        // leave blank to hide
    discord: "https://discord.com/users/15248404499301847090" // leave blank to hide
  }

};
