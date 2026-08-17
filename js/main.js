// =====================================================================
// PORTFOLIO LOGIC
// Reads window.PORTFOLIO_CONFIG and renders every section. Repos and
// files are fetched live from the GitHub REST/raw APIs — no build step,
// no backend. Update config.js and refresh to see changes.
// =====================================================================

(function () {
  "use strict";

  const CFG = window.PORTFOLIO_CONFIG;

  // File extensions we render inline. Anything else redirects to GitHub.
  const READABLE_EXT = new Set([
    "md", "markdown", "txt", "py", "js", "mjs", "cjs", "ts", "tsx", "jsx",
    "json", "html", "htm", "css", "scss", "sass", "less", "yml", "yaml",
    "java", "c", "h", "cpp", "hpp", "cc", "cs", "go", "rs", "rb", "php",
    "sh", "bash", "zsh", "ps1", "sql", "xml", "ini", "cfg", "conf", "toml",
    "csv", "tsv", "log", "r", "pl", "lua", "swift", "kt", "kts", "vue",
    "svelte", "graphql", "proto", "env"
  ]);
  const READABLE_NO_EXT = new Set([
    "readme", "license", "makefile", "dockerfile", "gemfile", "procfile",
    "changelog", "contributing", "authors", "notice"
  ]);

  const LANG_HINT = {
    py: "python", js: "javascript", ts: "typescript", jsx: "javascript",
    tsx: "typescript", sh: "bash", bash: "bash", md: "markdown",
    yml: "yaml", yaml: "yaml", html: "html", htm: "html", css: "css",
    java: "java", c: "c", cpp: "cpp", h: "cpp", hpp: "cpp", go: "go",
    rs: "rust", rb: "ruby", php: "php", sql: "sql", json: "json",
    xml: "xml", kt: "kotlin", swift: "swift", cs: "csharp"
  };

  function ext(filename) {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function isReadable(filename) {
    const e = ext(filename);
    if (e && READABLE_EXT.has(e)) return true;
    if (!e && READABLE_NO_EXT.has(filename.toLowerCase())) return true;
    return false;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) { return iso || ""; }
  }

  // ---------------- Profile / Title block ----------------
  function renderProfile() {
    const p = CFG.profile;
    document.getElementById("tbName").textContent = p.name;
    document.getElementById("tbHandle").textContent = "@" + p.handle;
    document.getElementById("tbFocus").textContent = (p.currentFocus || "—").split("—")[0].trim().slice(0, 28) || "—";
    document.getElementById("tbLoc").textContent = p.location || "—";

    document.getElementById("heroName").textContent = p.name;
    document.getElementById("heroTagline").textContent = p.tagline;
    document.getElementById("heroLocation").textContent = p.location;
    document.getElementById("heroFocus").textContent = p.currentFocus;
    document.getElementById("avatarImg").src = p.avatar;
    document.getElementById("avatarImg").alt = p.name;

    const handlesEl = document.getElementById("heroHandles");
    handlesEl.innerHTML = "";
    (p.handles || []).forEach((h) => {
      const chip = document.createElement(h.url ? "a" : "span");
      chip.className = "handle-chip";
      if (h.url) {
        chip.href = h.url;
        chip.target = "_blank";
        chip.rel = "noopener";
      }
      chip.innerHTML = `<span class="platform">${escapeHtml(h.platform)}</span> <span class="name">${escapeHtml(h.handle)}</span>`;
      handlesEl.appendChild(chip);
    });

    const bioEl = document.getElementById("heroBio");
    bioEl.innerHTML = "";
    (p.bio || []).forEach((para) => {
      const el = document.createElement("p");
      el.textContent = para;
      bioEl.appendChild(el);
    });

    const resumeBtn = document.getElementById("resumeBtn");
    if (p.resumeUrl) {
      resumeBtn.href = p.resumeUrl;
    } else {
      resumeBtn.style.display = "none";
    }
  }

  // ---------------- Skillset ----------------
  function renderSkills() {
    const grid = document.getElementById("skillGrid");
    if (!grid) return;
    grid.innerHTML = "";

    (CFG.skills || []).forEach((group) => {
      const card = document.createElement("div");
      card.className = "skill-card";

      const title = document.createElement("h3");
      title.className = "skill-card__title";
      title.textContent = group.category;
      card.appendChild(title);

      const list = document.createElement("ul");
      list.className = "skill-card__list";
      (group.items || []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      card.appendChild(list);

      grid.appendChild(card);
    });
  }

  // ---------------- Certificates ----------------
  function renderCerts() {
    const grid = document.getElementById("certGrid");
    grid.innerHTML = "";
    (CFG.certificates || []).forEach((c) => {
      const card = document.createElement("div");
      card.className = "cert-card";
      card.innerHTML = `
        <img src="${escapeHtml(c.image || "assets/cert-placeholder.svg")}" alt="" />
        <div>
          <h3>${escapeHtml(c.name)}</a></h3>
          <div class="cert-meta">${escapeHtml(c.issuer || "")}${c.date ? " · " + escapeHtml(c.date) : ""}</div>
          ${c.credentialUrl ? `<a href="${escapeHtml(c.credentialUrl)}" target="_blank" rel="noopener">View certificate ↗</a>` : ""}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ---------------- Contact (display only) ----------------
  function renderContact() {
    const list = document.getElementById("contactList");
    const c = CFG.contact;
    const rows = [
      ["Email", c.email, c.email ? "mailto:" + c.email : ""],
      ["GitHub", c.github, c.github],
      ["TryHackMe", c.tryhackme, c.tryhackme],
      ["PicoCTF", c.picoctf, c.picoctf],
      ["LinkedIn", c.linkedin, c.linkedin]
    ].filter(([, val]) => val);
    (c.extraLinks || []).forEach((l) => rows.push([l.label, l.url, l.url]));

    list.innerHTML = rows.map(([k, display, href]) => `
      <div class="row">
        <span class="k">${escapeHtml(k)}</span>
        <a href="${escapeHtml(href)}" ${href.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'}>${escapeHtml(display)}</a>
      </div>
    `).join("");
  }

  // ---------------- Repositories (GitHub API) ----------------
  async function loadRepos() {
    const status = document.getElementById("repoStatus");
    const grid = document.getElementById("repoGrid");
    const username = CFG.github.username;

    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
      if (!res.ok) throw new Error("GitHub API responded " + res.status);
      let repos = await res.json();

      const hidden = new Set((CFG.github.hiddenRepos || []).map((s) => s.toLowerCase()));
      repos = repos.filter((r) => !hidden.has(r.name.toLowerCase()));

      const pinned = CFG.github.pinnedRepos || [];
      repos.sort((a, b) => {
        const pa = pinned.indexOf(a.name);
        const pb = pinned.indexOf(b.name);
        if (pa !== -1 || pb !== -1) {
          if (pa === -1) return 1;
          if (pb === -1) return -1;
          return pa - pb;
        }
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

      if (repos.length === 0) {
        status.textContent = "No public repositories found.";
        return;
      }

      status.textContent = `${repos.length} repositor${repos.length === 1 ? "y" : "ies"} · click one to browse its files`;
      grid.innerHTML = "";
      repos.forEach((repo) => grid.appendChild(renderRepoCard(repo)));
    } catch (err) {
      const username = CFG.github.username;
      status.innerHTML =
        'GitHub API isn\'t reachable right now (rate limit or network). ' +
        'You can still view the repos on GitHub: ' +
        '<a href="https://github.com/' + username + '?tab=repositories" target="_blank" rel="noopener">github.com/' +
        username + ' ↗</a>';
      console.error(err);
    }
  }

  function renderRepoCard(repo) {
    const card = document.createElement("div");
    card.className = "repo-card";
    card.innerHTML = `
      <h3>${escapeHtml(repo.name)}</h3>
      <p class="desc">${escapeHtml(repo.description || "No description yet.")}</p>
      <div class="repo-meta">
        ${repo.language ? `<span class="lang">${escapeHtml(repo.language)}</span>` : ""}
        <span>updated ${formatDate(repo.updated_at)}</span>
      </div>
      <button class="btn btn--ghost btn--small">Browse files →</button>
    `;
    card.querySelector("button").addEventListener("click", () => openTreeSheet(repo));
    return card;
  }

  // ---------------- Repo file tree modal ----------------
  const treeSheet = document.getElementById("treeSheet");
  const tsBody = document.getElementById("tsBody");

  function buildTree(files) {
    const root = { dirs: {}, files: [] };
    files.forEach((f) => {
      const parts = f.path.split("/");
      let node = root;
      parts.forEach((part, i) => {
        const isFile = i === parts.length - 1;
        if (isFile) {
          node.files.push({ name: part, path: f.path });
        } else {
          if (!node.dirs[part]) node.dirs[part] = { dirs: {}, files: [] };
          node = node.dirs[part];
        }
      });
    });
    return root;
  }

  function renderTreeNode(node, container, depth, repo, branch) {
    const indent = 14 + depth * 18;

    Object.keys(node.dirs).sort((a, b) => a.localeCompare(b)).forEach((dirName) => {
      const dirRow = document.createElement("div");
      dirRow.className = "tree-item tree-dir";
      dirRow.style.paddingLeft = indent + "px";
      dirRow.innerHTML = `<span class="path"><span class="dir-arrow">▸</span>${escapeHtml(dirName)}/</span>`;

      const childWrap = document.createElement("div");
      childWrap.className = "tree-children";

      dirRow.addEventListener("click", () => {
        const isOpen = childWrap.classList.toggle("open");
        dirRow.querySelector(".dir-arrow").textContent = isOpen ? "▾" : "▸";
      });

      container.appendChild(dirRow);
      container.appendChild(childWrap);
      renderTreeNode(node.dirs[dirName], childWrap, depth + 1, repo, branch);
    });

    node.files.sort((a, b) => a.name.localeCompare(b.name)).forEach((f) => {
      const readable = isReadable(f.name);
      const row = document.createElement("div");
      row.className = "tree-item " + (readable ? "readable" : "unreadable");
      row.style.paddingLeft = indent + "px";
      row.innerHTML = `<span class="path">${escapeHtml(f.name)}</span><span class="kind">${readable ? "inline" : "github ↗"}</span>`;
      row.addEventListener("click", () => openFileSheet(repo, f.path, branch, readable));
      container.appendChild(row);
    });
  }

  function openTreeSheet(repo) {
    closeFileSheet();
    document.getElementById("tsRepo").textContent = repo.name;
    document.getElementById("tsGithubLink").href = repo.html_url;
    tsBody.innerHTML = `<p class="dim">&gt; fetching file tree_</p>`;
    treeSheet.classList.add("open");
    treeSheet.setAttribute("aria-hidden", "false");

    const branch = repo.default_branch || "main";
    fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/git/trees/${branch}?recursive=1`)
      .then((r) => {
        if (!r.ok) throw new Error("tree fetch failed " + r.status);
        return r.json();
      })
      .then((data) => {
        const files = (data.tree || []).filter((n) => n.type === "blob");
        if (files.length === 0) {
          tsBody.innerHTML = `<p class="dim">No files found (empty repo, or API limit reached).</p>`;
          return;
        }
        const root = buildTree(files);
        const list = document.createElement("div");
        list.className = "tree-list";
        renderTreeNode(root, list, 0, repo, branch);
        tsBody.innerHTML = "";
        tsBody.appendChild(list);
      })
      .catch((err) => {
        tsBody.innerHTML = `<p class="dim">Couldn't load the file tree (rate limit or network). <a href="${repo.html_url}" target="_blank" rel="noopener">Open on GitHub instead ↗</a></p>`;
        console.error(err);
      });
  }

  document.getElementById("tsClose").addEventListener("click", closeTreeSheet);
  document.getElementById("treeSheetBackdrop").addEventListener("click", closeTreeSheet);
  function closeTreeSheet() {
    treeSheet.classList.remove("open");
    treeSheet.setAttribute("aria-hidden", "true");
  }

  // ---------------- File viewer modal ----------------
  const fileSheet = document.getElementById("fileSheet");
  const fsBody = document.getElementById("fsBody");

  function openFileSheet(repo, path, branch, readable) {
    document.getElementById("fsRepo").textContent = repo.name;
    document.getElementById("fsPath").textContent = path;
    const githubBlobUrl = `${repo.html_url}/blob/${branch}/${path}`;
    document.getElementById("fsGithubLink").href = githubBlobUrl;
    document.getElementById("fsMeta").textContent = readable ? "rendered inline" : "not renderable inline — opens on GitHub";
    fsBody.innerHTML = `<p class="dim">&gt; loading file_</p>`;
    fileSheet.classList.add("open");
    fileSheet.setAttribute("aria-hidden", "false");

    if (!readable) {
      fsBody.innerHTML = `
        <div class="redirect-card">
          <p>This file type isn't rendered inline (binary, image, or otherwise not source/text).</p>
          <a class="btn btn--primary" href="${githubBlobUrl}" target="_blank" rel="noopener">Open on GitHub ↗</a>
        </div>`;
      return;
    }

    const rawUrl = `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${branch}/${path}`;
    fetch(rawUrl)
      .then((r) => {
        if (!r.ok) throw new Error("raw fetch failed " + r.status);
        return r.text();
      })
      .then((text) => {
        const e = ext(path.split("/").pop());
        if (e === "md" || e === "markdown") {
          const wrap = document.createElement("div");
          wrap.className = "md-render";
          wrap.innerHTML = window.marked ? window.marked.parse(text) : escapeHtml(text);
          fsBody.innerHTML = "";
          fsBody.appendChild(wrap);
          if (window.hljs) fsBody.querySelectorAll("pre code").forEach((b) => window.hljs.highlightElement(b));
        } else {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          const lang = LANG_HINT[e];
          if (lang) code.className = "language-" + lang;
          code.textContent = text;
          pre.appendChild(code);
          fsBody.innerHTML = "";
          fsBody.appendChild(pre);
          if (window.hljs) window.hljs.highlightElement(code);
        }
      })
      .catch((err) => {
        fsBody.innerHTML = `
          <div class="redirect-card">
            <p>Couldn't load this file inline (rate limit or network hiccup).</p>
            <a class="btn btn--primary" href="${githubBlobUrl}" target="_blank" rel="noopener">Open on GitHub ↗</a>
          </div>`;
        console.error(err);
      });
  }

  document.getElementById("fsClose").addEventListener("click", closeFileSheet);
  document.getElementById("fileSheetBackdrop").addEventListener("click", closeFileSheet);
  function closeFileSheet() {
    fileSheet.classList.remove("open");
    fileSheet.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (fileSheet.classList.contains("open")) closeFileSheet();
    else if (treeSheet.classList.contains("open")) closeTreeSheet();
  });

  // ---------------- Nav: mobile toggle + scrollspy ----------------
  function initNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("siteNav");
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    const sections = Array.from(document.querySelectorAll(".sheet[data-fig]"));
    const navLinks = Array.from(nav.querySelectorAll("a"));

    // More reliable scrollspy — works even for short sections like Certificates
    function updateActive() {
      const marker = window.scrollY + window.innerHeight * 0.28;
      let current = sections[0];
      for (const s of sections) {
        if (s.offsetTop <= marker) current = s;
      }
      const id = current.id;
      navLinks.forEach((a) => a.classList.toggle("active", a.dataset.nav === id));
      current.classList.add("in-view");
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();

    // Still fade sections in as they appear
    const footIo = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in-view");
      });
    }, { threshold: 0.12 });
    sections.forEach((s) => footIo.observe(s));
    const foot = document.querySelector(".site-footer");
    if (foot) footIo.observe(foot);
  }

  // ---------------- Init ----------------
  document.addEventListener("DOMContentLoaded", () => {
    renderProfile();
    renderSkills();
    renderCerts();
    renderContact();
    initNav();
    loadRepos();
  });
})();
