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
    hiddenRepos: ["aaadarsh1337.github.io", "portfolio"],
    // Repo names to always show first, in the exact order you list them.
    // Everything not listed here follows by most-recently-updated.
    // Example: pinnedRepos: ["my-best-project", "ctf-writeups", "pentest-notes"]
    pinnedRepos: ["picoCTF", "CourseNotes-cybersec", "CustomTools", "certificates" ]
  },

  // --- Identity -----------------------------------------------------
  profile: {
    name: "ADARSH PILLAI",                                   // EDIT ME — full name
    handle: "aaadarsh1337",
    tagline: "Cybersecurity enthusiast · CTF player · Code tinkerer",  // EDIT ME
    location: "India",                                         // EDIT ME
    // Short phrase for the top-left LOC / FOCUS boxes and the hero meta line
    currentFocus: "Offensive",
    avatar: "assets/avatar.jpg",                   // EDIT ME: swap the file or path
    // All your platform handles — shown as chips under the tagline.
    // Add / remove freely. Leave url blank if you don't want it clickable.
    handles: [
      { platform: "GitHub",   handle: "aaadarsh1337",        url: "https://github.com/aaadarsh1337" },
      { platform: "PicoCTF",  handle: "jackthereaper1337",   url: "https://learn.cylabacademy.org/users/jackthereaper1337" },
      { platform: "TryHackMe", handle: "aaadarsh1337",       url: "https://tryhackme.com/p/aaadarsh1337" }
    ],
    bio: [
      "I’m aaadarsh1337 | jackthereaper1337 | Hasher2009, a cybersecurity enthusiast and CTF player who loves turning ideas into working tools. I’m especially interested in penetration testing, reverse engineering, and building custom security utilities—from quick scripts for CTF challenges to more structured tools for learning and automation.",
      "Most of what I do is hands-on: I break down problems, explore how systems behave, and document what I learn along the way—whether it’s through clean code, notes, or practical experiments. My goal is to keep leveling up by tackling real challenges, studying the “why” behind the behavior, and continuously improving my workflow.",
      "On this portfolio, you’ll find projects and repositories focused on security tooling, CTF write-ups, and cybersec learning notes, plus the small experiments that help me get better every step of the way."
    ],
    resumeUrl: ""   // EDIT ME: link to a hosted PDF resume. Leave blank and the button hides itself.
  },

  // --- Skillset (button-based reveal) --------------------------------
  // Add or remove categories/items freely — the buttons and chips are
  // generated from this array.
  skills: [
    {
      category: "Offensive Security",
      items: ["Web Exploitation", "Recon & enumeration", "Reverse Engineering", "Binary Exploitation"]
    },
    {
      category: "Languages",
      items: ["Python", "Bash", "C", "SQL"]
    },
    {
      category: "Tools & Platforms",
      items: ["PicoCTF", "TryHackMe", "GitHub"]
    },
    {
      category: "Currently Learning",
      items: ["Forensics", "Blockchain", "Cloud"]
    }
  ],

  // --- Certificates ---------------------------------------------------
  // Duplicate the object below for each certificate. Order = display order.
  certificates: [
    {
      name: "ADVENT OF CYBER 3",
      issuer: "TryHackMe",
      date: "2021",
      credentialUrl: "https://github.com/aaadarsh1337/certificates/AOC3.png",                          // verification link (optional)
      image: "assets/AOC3.png"        // drop a real badge into assets/ and point here
    },
    {
      name: "PRACTICAL ETHICAL HACKING",
      issuer: "TCM Security & Udemy",
      date: "2021",
      credentialUrl: "https://github.com/aaadarsh1337/certificates/course.jpg",                          // verification link (optional)
      image: "assets/course.jpg"        // drop a real badge into assets/ and point here
    }
  ],

  // --- Contact (display only — no form) -------------------------------
  contact: {
    email: "adarshpillai1337@gmail.com",        // EDIT ME
    github: "https://github.com/aaadarsh1337",
    tryhackme: "https://tryhackme.com/p/aaadarsh1337",
    picoctf: "https://learn.cylabacademy.org/users/jackthereaper1337",
    linkedin: "",                    // leave blank to hide
    extraLinks: []                   // e.g. [{ label: "Twitter / X", url: "https://..." }]
  }

};
