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
  // Kept in sync with TEXT_EXT in scripts/build_writeups.py.
  const READABLE_EXT = new Set([
    "md", "markdown", "txt", "py", "js", "mjs", "cjs", "ts", "tsx", "jsx",
    "json", "html", "htm", "css", "scss", "sass", "less", "yml", "yaml",
    "java", "c", "h", "cpp", "hpp", "cc", "cs", "go", "rs", "rb", "php",
    "sh", "bash", "zsh", "ps1", "sql", "xml", "ini", "cfg", "conf", "toml",
    "csv", "tsv", "log", "r", "pl", "lua", "swift", "kt", "kts", "vue",
    "svelte", "graphql", "proto", "env", "asm", "s"
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
    const base = (filename || "").split("/").pop();
    const e = ext(base);
    if (e && READABLE_EXT.has(e)) return true;
    if (!e && READABLE_NO_EXT.has(base.toLowerCase())) return true;
    // Dockerfile / Makefile with extension-like suffixes or exact names
    if (/^(dockerfile|makefile)(\..*)?$/i.test(base)) return true;
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
    document.getElementById("rbName").textContent = p.name;
    document.getElementById("rbHandle").textContent = "@" + p.handle;
    document.getElementById("rbFocus").textContent = (p.currentFocus || "—").split("—")[0].trim().slice(0, 28) || "—";
    document.getElementById("rbLoc").textContent = p.location || "—";

    document.getElementById("heroName").textContent = p.name;
    document.getElementById("heroTagline").textContent = p.tagline;
    document.getElementById("heroLocation").textContent = p.location;
    document.getElementById("heroFocus").textContent = p.currentFocus;
    const avatarImg = document.getElementById("avatarImg");
    avatarImg.onerror = function () {
      if (!avatarImg.dataset.fb) {
        avatarImg.dataset.fb = "1";
        avatarImg.src = "assets/avatar.jpg";
      }
    };
    avatarImg.src = p.avatar;
    avatarImg.alt = "Portrait of " + p.name;

    const bioEl = document.getElementById("heroBio");
    bioEl.innerHTML = "";
    (p.bio || []).filter((para) => para && para.trim()).forEach((para) => {
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
  function renderLinkPanel() {
    const list = document.getElementById("linksPanelList");
    if (!list) return;
    list.innerHTML = "";

    (CFG.linkPanel || []).forEach(function (item) {
      const a = document.createElement("a");
      a.className = "links-panel__item";
      a.href = item.url || "#";
      if (item.url && item.url.indexOf("mailto:") !== 0) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.innerHTML =
        '<span class="links-panel__label">' + escapeHtml(item.label || "") + "</span>" +
        '<span class="links-panel__detail">' + escapeHtml(item.detail || "") + "</span>" +
        '<span class="links-panel__arrow">↗</span>';
      list.appendChild(a);
    });
  }
// Links Panel Config
  function initLinkPanel() {
    const openBtn = document.getElementById("linksOpen");
    const contactBtn = document.getElementById("contactLinksBtn");
    const closeBtn = document.getElementById("linksClose");
    const panel = document.getElementById("linksPanel");
    const backdrop = document.getElementById("linksBackdrop");
    if (!panel || !backdrop) return;

    function open() {
      panel.hidden = false;
      backdrop.hidden = false;
      if (openBtn) openBtn.setAttribute("aria-expanded", "true");
      updateBodyLock();
      closeBtn.focus();
    }
    function close(restoreFocus) {
      panel.hidden = true;
      backdrop.hidden = true;
      if (openBtn) openBtn.setAttribute("aria-expanded", "false");
      updateBodyLock();
      if (restoreFocus !== false && openBtn && document.activeElement === closeBtn) {
        // Return focus to the opener when closed via button/backdrop/Escape
        try { openBtn.focus(); } catch (e) { /* ignore */ }
      }
    }
    function toggle() {
      if (panel.hidden) open();
      else close();
    }

    if (openBtn) openBtn.addEventListener("click", toggle);
    if (contactBtn) contactBtn.addEventListener("click", toggle);
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });
  }

  // ---------------- Command palette (Ctrl/Cmd+K) ----------------
  let repoCache = [];
  let palActive = 0;
  let palFiltered = [];
  let palLastFocus = null;

  function fuzzyMatch(hay, q) {
    hay = (hay || "").toLowerCase();
    q = (q || "").toLowerCase().trim();
    if (!q) return true;
    let hi = 0;
    for (let i = 0; i < q.length; i++) {
      hi = hay.indexOf(q[i], hi);
      if (hi === -1) return false;
      hi++;
    }
    return true;
  }

  function goSection(id) {
    const el = document.getElementById(id);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    try { window.location.hash = id; } catch (e) { /* ignore */ }
  }

  function openLinksPanel() {
    const panel = document.getElementById("linksPanel");
    const openBtn = document.getElementById("linksOpen");
    if (panel && panel.hidden && openBtn) openBtn.click();
  }

  function paletteEntries() {
    const entries = [
      { label: "Go to About", detail: "section", run: () => goSection("about") },
      { label: "Go to Skillset", detail: "section", run: () => goSection("skillset") },
      { label: "Go to Achievements", detail: "section", run: () => goSection("achievements") },
      { label: "Go to Repositories", detail: "section", run: () => goSection("repositories") },
      { label: "Go to Certificates", detail: "section", run: () => goSection("certificates") },
      { label: "Go to Contact", detail: "section", run: () => goSection("contact") },
      { label: "Read CTF writeups", detail: "page", run: () => { window.location.href = "/writeups/"; } },
      { label: "Open Links", detail: "action", run: openLinksPanel },
      { label: "Copy email", detail: "action", run: () => copyText((CFG.contact || {}).email || "", null) },
    ];
    (writeupCache || []).forEach((w) => {
      entries.push({
        label: w.title,
        detail: w.event + " · " + (w.difficulty ? w.difficulty + " writeup" : "writeup"),
        run: () => { window.location.href = "/writeups/" + w.url; },
      });
    });
    repoCache.forEach((repo) => {
      entries.push({ label: repo.name, detail: "repo · browse files", run: () => openTreeSheet(repo) });
    });
    entries.push({ label: "View GitHub profile", detail: "external", run: () => window.open("https://github.com/" + CFG.github.username, "_blank", "noopener") });
    return entries;
  }

  function setPalActive(i) {
    const list = document.getElementById("cmdkList");
    if (!list) return;
    const rows = list.querySelectorAll(".cmdk-item");
    palActive = ((i % rows.length) + rows.length) % rows.length || 0;
    rows.forEach((r, j) => r.classList.toggle("active", j === palActive));
    const active = rows[palActive];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }

  let writeupCache = null;
  let writeupsLoading = false;

  function loadWriteupsIndex() {
    if (writeupCache || writeupsLoading) return;
    writeupsLoading = true;
    fetch("writeups/search.json")
      .then((r) => {
        if (!r.ok) throw new Error("no writeup index");
        return r.json();
      })
      .then((d) => {
        writeupCache = Array.isArray(d) ? d : [];
        const panel = document.getElementById("cmdk");
        const input = document.getElementById("cmdkInput");
        if (panel && !panel.hidden && input) renderPalette(input.value);
      })
      .catch(() => { writeupCache = []; });
  }

  function renderPalette(q) {
    const list = document.getElementById("cmdkList");
    if (!list) return;
    palFiltered = paletteEntries().filter((e) => fuzzyMatch(e.label + " " + e.detail, q));
    // Rank: title starts-with query first, then title contains, then fuzzy rest.
    const ql = (q || "").toLowerCase().trim();
    if (ql) {
      palFiltered.sort((a, b) => {
        const al = a.label.toLowerCase();
        const bl = b.label.toLowerCase();
        const score = (l) => (l.startsWith(ql) ? 0 : l.includes(ql) ? 1 : 2);
        return score(al) - score(bl);
      });
    }
    palFiltered = palFiltered.slice(0, 9);
    list.innerHTML = "";
    if (palFiltered.length === 0) {
      list.innerHTML = '<p class="cmdk-empty">No matches</p>';
      return;
    }
    palFiltered.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "cmdk-item" + (i === 0 ? " active" : "");
      row.setAttribute("role", "option");
      const label = document.createElement("span");
      label.className = "cmdk-label";
      label.textContent = e.label;
      const detail = document.createElement("span");
      detail.className = "cmdk-detail";
      detail.textContent = e.detail;
      const arrow = document.createElement("span");
      arrow.className = "cmdk-arrow";
      arrow.textContent = "↵";
      row.appendChild(label);
      row.appendChild(detail);
      row.appendChild(arrow);
      row.addEventListener("click", () => runPalette(i));
      row.addEventListener("mousemove", () => setPalActive(i));
      list.appendChild(row);
    });
    palActive = 0;
  }

  function runPalette(i) {
    const e = palFiltered[i];
    closePalette();
    if (e && e.run) e.run();
  }

  function openPalette() {
    const panel = document.getElementById("cmdk");
    const backdrop = document.getElementById("cmdkBackdrop");
    const input = document.getElementById("cmdkInput");
    if (!panel || !backdrop || !input) return;
    palLastFocus = document.activeElement;
    panel.hidden = false;
    backdrop.hidden = false;
    updateBodyLock();
    input.value = "";
    renderPalette("");
    input.focus();
  }

  function closePalette() {
    const panel = document.getElementById("cmdk");
    const backdrop = document.getElementById("cmdkBackdrop");
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    backdrop.hidden = true;
    updateBodyLock();
    if (palLastFocus && palLastFocus.focus) { try { palLastFocus.focus(); } catch (e) { /* ignore */ } }
  }

  function togglePalette() {
    const panel = document.getElementById("cmdk");
    if (!panel) return;
    if (panel.hidden) openPalette();
    else closePalette();
  }

  function initPalette() {
    const input = document.getElementById("cmdkInput");
    const fab = document.getElementById("cmdkFab");
    const backdrop = document.getElementById("cmdkBackdrop");
    if (!input || !fab || !backdrop) return;
    fab.addEventListener("click", togglePalette);
    backdrop.addEventListener("click", () => closePalette());
    loadWriteupsIndex();
    input.addEventListener("input", () => renderPalette(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setPalActive(palActive + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setPalActive(palActive - 1); }
      else if (e.key === "Enter") { e.preventDefault(); runPalette(palActive); }
      else if (e.key === "Escape") { closePalette(); }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    });
  }

  // ---------------- Stats band ----------------
  function renderStats() {
    const band = document.getElementById("statsBand");
    if (!band) return;
    band.innerHTML = "";
    (CFG.stats || []).slice(0, 6).forEach((s) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = s.label || "";
      const dd = document.createElement("dd");
      dd.textContent = s.value || "";
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      band.appendChild(wrap);
    });
    if (!band.children.length) band.style.display = "none";
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

  function renderAchievements() {
    const list = document.getElementById("achieveList");
    if (!list) return;
    list.innerHTML = "";

    (CFG.achievements || []).forEach(function (item) {
      const li = document.createElement("li");
      li.className = "achieve-item";

      const top = document.createElement("div");
      top.className = "achieve-item__top";

      const title = document.createElement("span");
      title.className = "achieve-item__title";
      title.textContent = item.title || "";
      top.appendChild(title);

      if (item.date) {
        const date = document.createElement("span");
        date.className = "achieve-item__date";
        date.textContent = item.date;
        top.appendChild(date);
      }
      li.appendChild(top);

      if (item.detail) {
        const detail = document.createElement("p");
        detail.className = "achieve-item__detail";
        detail.textContent = item.detail;
        li.appendChild(detail);
      }

      if (item.url && /^https?:\/\//i.test(item.url)) {
        const a = document.createElement("a");
        a.className = "achieve-item__link";
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "View proof →";
        li.appendChild(a);
      }

      list.appendChild(li);
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
        <img src="${escapeHtml(c.image || "assets/cert-placeholder.svg")}" alt="${escapeHtml((c.name || "Certificate") + " badge")}" width="44" height="44" loading="lazy" decoding="async" />
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <div class="cert-meta">${escapeHtml(c.issuer || "")}${c.date ? " · " + escapeHtml(c.date) : ""}</div>
          ${c.credentialUrl ? `<a href="${escapeHtml(c.credentialUrl)}" target="_blank" rel="noopener">View certificate <span class="ext">↗</span></a>` : ""}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ---------------- Contact (display only) ----------------
  function copyText(text, btn) {
    function done(ok) {
      if (!btn) return;
      const orig = btn.dataset.label || "Copy";
      btn.textContent = ok ? "Copied ✓" : "Copy failed";
      setTimeout(() => { btn.textContent = orig; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) { done(false); }
    }
  }

  function renderContact() {
    const list = document.getElementById("contactList");
    const c = CFG.contact || {};
    const methods = [];
    if (c.email) {
      methods.push(`
        <div class="contact-method contact-method--email">
          <span class="cm-label">Email</span>
          <a class="cm-value" href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>
          <span class="cm-note">Best for longer conversations &amp; opportunities</span>
          <button type="button" class="btn btn--ghost btn--small cm-copy" data-copy-email data-label="Copy email">Copy email</button>
        </div>`);
    }
    if (c.linkedin) {
      methods.push(`
        <div class="contact-method">
          <span class="cm-label">LinkedIn</span>
          <a class="cm-value" href="${escapeHtml(c.linkedin)}" target="_blank" rel="noopener">Adarsh Pillai</a>
          <span class="cm-note">Professional profile</span>
        </div>`);
    }
    if (c.discord) {
      methods.push(`
        <div class="contact-method">
          <span class="cm-label">Discord</span>
          <a class="cm-value" href="${escapeHtml(c.discord)}" target="_blank" rel="noopener">@aaadarsh1337</a>
          <span class="cm-note">Fastest for a quick chat</span>
        </div>`);
    }
    list.innerHTML = methods.join("");
    const copyBtn = list.querySelector("[data-copy-email]");
    if (copyBtn && c.email) {
      copyBtn.addEventListener("click", () => copyText(c.email, copyBtn));
    }
  }

  // ---------------- Repositories (GitHub API) ----------------
  const REPO_CACHE_KEY = "portfolio.repos";
  const REPO_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const MAX_RAW_CHARS = 300000; // ~300KB — truncate larger files inline
  const MAX_TREE_FILES = 2000;

  function githubHeaders() {
    const headers = { Accept: "application/vnd.github.v3+json" };
    const token = CFG.github && CFG.github.token;
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function fetchWithTimeout(url, ms, opts) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, Object.assign({ signal: ctrl.signal }, opts || {})).finally(() => clearTimeout(t));
  }

  function renderSkeletons(count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "repo-card repo-skel";
      s.innerHTML = `
        <div class="skel skel--name"></div>
        <div class="skel skel--desc"></div>
        <div class="skel skel--desc short"></div>
        <div class="skel skel--meta"></div>
      `;
      frag.appendChild(s);
    }
    return frag;
  }

  async function loadRepos() {
    const status = document.getElementById("repoStatus");
    const grid = document.getElementById("repoGrid");
    const username = CFG.github.username;

    try {
      let repos = null;

      // Try cache first (only if fresh).
      try {
        const cached = JSON.parse(sessionStorage.getItem(REPO_CACHE_KEY) || "null");
        if (cached && cached.t && (Date.now() - cached.t) < REPO_CACHE_TTL && Array.isArray(cached.d)) {
          repos = cached.d;
        }
      } catch (e) { /* ignore malformed cache */ }

      if (!repos) {
        status.textContent = "Fetching repository index…";
        grid.innerHTML = "";
        grid.appendChild(renderSkeletons(6));
        const res = await fetchWithTimeout(
          `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
          9000,
          { headers: githubHeaders() }
        );
        if (res.status === 403) throw { rateLimit: true };
        if (!res.ok) throw new Error("GitHub API responded " + res.status);
        repos = await res.json();
        try { sessionStorage.setItem(REPO_CACHE_KEY, JSON.stringify({ t: Date.now(), d: repos })); } catch (e) { /* storage full/unavailable */ }
      }

      const hidden = new Set((CFG.github.hiddenRepos || []).map((s) => s.toLowerCase()));
      repos = repos.filter((r) => !hidden.has((r.name || "").toLowerCase()));

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
        status.textContent = "No public repositories found yet.";
        grid.innerHTML = renderEmpty("No public repositories to show.");
        return;
      }

      status.textContent = `${repos.length} repositor${repos.length === 1 ? "y" : "ies"} — browse a repo to view its files (or press Ctrl+K)`;
      grid.innerHTML = "";
      repoCache = repos;
      repos.forEach((repo) => grid.appendChild(renderRepoCard(repo, pinned)));
    } catch (err) {
      const gh = "https://github.com/" + username + "?tab=repositories";
      if (err && err.rateLimit) {
        status.innerHTML = 'GitHub rate limit reached. <a href="' + gh + '" target="_blank" rel="noopener">View repos on GitHub ↗</a>';
      } else {
        status.innerHTML = 'Couldn’t reach GitHub. <a href="' + gh + '" target="_blank" rel="noopener">View repos on GitHub ↗</a>';
      }
      grid.innerHTML = renderEmpty("The repository feed is unavailable right now.");
      console.error(err);
    }
  }

  function renderEmpty(message) {
    const div = document.createElement("div");
    div.className = "repo-empty";
    const p = document.createElement("p");
    p.textContent = message;
    div.appendChild(p);
    return div.outerHTML;
  }

  // GitHub language → color (subset; falls back to the neutral dim).
  const LANG_COLORS = {
    Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6", C: "#555555",
    "C++": "#f34b7d", "C#": "#178600", Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
    Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", PHP: "#4F5D95", Ruby: "#701516",
    SQL: "#e38c00", Vim: "#199f4b", Dockerfile: "#384d54", Makefile: "#427819",
    Jupyter: "#DA5B0B", PowerShell: "#012456", Assembly: "#6E4C13", Scala: "#c22d40",
    Kotlin: "#A97BFF", Swift: "#F05138", Lua: "#000080", R: "#198CE7", Perl: "#0298c3",
    Vue: "#41b883", Svelte: "#ff3e00", Haskell: "#5e5086", Zig: "#ec915c"
  };

  function langColor(lang) {
    return LANG_COLORS[lang] || "var(--dim)";
  }

  function statIcon(kind) {
    // Minimal inline SVG for star and fork (GitHub-style, theme-aware).
    if (kind === "star") {
      return '<svg class="ico" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>';
    }
    return '<svg class="ico" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3.75 8.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>';
  }

  function renderRepoCard(repo, pinned) {
    const card = document.createElement("div");
    const isPinned = pinned.indexOf(repo.name) !== -1;
    card.className = "repo-card" + (isPinned ? " pinned" : "");
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const lang = repo.language || "";
    card.innerHTML = `
      <div class="repo-top">
        <a class="repo-name" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener">
          ${escapeHtml(repo.name)}
        </a>
      </div>
      <p class="repo-desc">${escapeHtml(repo.description || "No description provided.")}</p>
      ${lang ? `<div class="repo-lang"><span class="lang-dot" style="background:${langColor(lang)}"></span>${escapeHtml(lang)}</div>` : ""}
      <div class="repo-meta">
        <span class="stat" title="${stars} stars">${statIcon("star")} ${stars}</span>
        <span class="stat" title="${forks} forks">${statIcon("fork")} ${forks}</span>
        <span class="updated">Updated ${formatDate(repo.updated_at)}</span>
      </div>
      <div class="repo-foot">
        <button class="btn btn--ghost btn--small repo-browse">Browse files</button>
        <a class="repo-open" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
    `;
    card.querySelector(".repo-browse").addEventListener("click", () => openTreeSheet(repo));
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

  let treeLastFocus = null;
  let fileLastFocus = null;

  function anyModalOpen() {
    const linksPanel = document.getElementById("linksPanel");
    const cmdk = document.getElementById("cmdk");
    return (
      treeSheet.classList.contains("open") ||
      fileSheet.classList.contains("open") ||
      (linksPanel && !linksPanel.hidden) ||
      (cmdk && !cmdk.hidden)
    );
  }

  function updateBodyLock() {
    document.body.style.overflow = anyModalOpen() ? "hidden" : "";
  }

  function trapTab(container, e) {
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function sanitizeHtml(dirty) {
    if (window.DOMPurify && window.DOMPurify.sanitize) {
      return window.DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
    }
    return dirty;
  }

  function openTreeSheet(repo) {
    closeFileSheet(true);
    treeLastFocus = document.activeElement;
    document.getElementById("tsRepo").textContent = repo.name;
    document.getElementById("tsGithubLink").href = repo.html_url;
    tsBody.innerHTML = `<p class="dim">&gt; fetching file tree_</p>`;
    treeSheet.classList.add("open");
    treeSheet.setAttribute("aria-hidden", "false");
    updateBodyLock();
    document.getElementById("tsClose").focus();

    const branch = repo.default_branch || "main";
    fetchWithTimeout(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/git/trees/${branch}?recursive=1`,
      9000,
      { headers: githubHeaders() }
    )
      .then((r) => {
        if (!r.ok) throw new Error("tree fetch failed " + r.status);
        return r.json();
      })
      .then((data) => {
        let files = (data.tree || []).filter((n) => n.type === "blob");
        if (files.length === 0) {
          tsBody.innerHTML = `<p class="dim">No files found (empty repo, or API limit reached).</p>`;
          return;
        }
        let truncated = false;
        if (files.length > MAX_TREE_FILES) {
          files = files.slice(0, MAX_TREE_FILES);
          truncated = true;
        }
        const root = buildTree(files);
        const list = document.createElement("div");
        list.className = "tree-list";
        renderTreeNode(root, list, 0, repo, branch);
        tsBody.innerHTML = "";
        if (truncated) {
          const note = document.createElement("p");
          note.className = "dim";
          note.textContent = `Showing first ${MAX_TREE_FILES} files — open on GitHub for the full tree.`;
          tsBody.appendChild(note);
        }
        tsBody.appendChild(list);
      })
      .catch((err) => {
        tsBody.innerHTML = `<p class="dim">Couldn't load the file tree (rate limit or network). <a href="${repo.html_url}" target="_blank" rel="noopener">Open on GitHub instead ↗</a></p>`;
        console.error(err);
      });
  }

  document.getElementById("tsClose").addEventListener("click", () => closeTreeSheet());
  document.getElementById("treeSheetBackdrop").addEventListener("click", () => closeTreeSheet());
  function closeTreeSheet(keepFocus) {
    treeSheet.classList.remove("open");
    treeSheet.setAttribute("aria-hidden", "true");
    updateBodyLock();
    if (!keepFocus && !fileSheet.classList.contains("open") && treeLastFocus && treeLastFocus.focus) treeLastFocus.focus();
  }

  // ---------------- File viewer modal ----------------
  const fileSheet = document.getElementById("fileSheet");
  const fsBody = document.getElementById("fsBody");

  function openFileSheet(repo, path, branch, readable) {
    fileLastFocus = document.activeElement;
    document.getElementById("fsRepo").textContent = repo.name;
    document.getElementById("fsPath").textContent = path;
    const githubBlobUrl = `${repo.html_url}/blob/${branch}/${path}`;
    document.getElementById("fsGithubLink").href = githubBlobUrl;
    document.getElementById("fsMeta").textContent = readable ? "rendered inline" : "not renderable inline — opens on GitHub";
    fsBody.innerHTML = `<p class="dim">&gt; loading file_</p>`;
    fileSheet.classList.add("open");
    fileSheet.setAttribute("aria-hidden", "false");
    updateBodyLock();
    document.getElementById("fsClose").focus();

    if (!readable) {
      fsBody.innerHTML = `
        <div class="redirect-card">
          <p>This file type isn't rendered inline (binary, image, or otherwise not source/text).</p>
          <a class="btn btn--primary" href="${githubBlobUrl}" target="_blank" rel="noopener">Open on GitHub ↗</a>
        </div>`;
      return;
    }

    const rawUrl = `https://raw.githubusercontent.com/${repo.owner.login}/${repo.name}/${branch}/${path}`;
    fetchWithTimeout(rawUrl, 9000)
      .then((r) => {
        if (!r.ok) throw new Error("raw fetch failed " + r.status);
        return r.text();
      })
      .then((text) => {
        let truncated = false;
        if (text.length > MAX_RAW_CHARS) {
          text = text.slice(0, MAX_RAW_CHARS);
          truncated = true;
        }
        const e = ext(path.split("/").pop());
        if (e === "md" || e === "markdown") {
          const wrap = document.createElement("div");
          wrap.className = "md-render";
          const rawHtml = window.marked ? window.marked.parse(text) : escapeHtml(text);
          wrap.innerHTML = sanitizeHtml(rawHtml);
          // Harden links inside rendered markdown
          wrap.querySelectorAll("a").forEach((a) => {
            const href = a.getAttribute("href") || "";
            if (/^https?:\/\//i.test(href)) {
              a.target = "_blank";
              a.rel = "noopener noreferrer";
            }
          });
          fsBody.innerHTML = "";
          if (truncated) {
            const note = document.createElement("p");
            note.className = "dim";
            note.textContent = "Truncated preview (file too large) — open on GitHub for the full file.";
            fsBody.appendChild(note);
          }
          fsBody.appendChild(wrap);
          if (window.hljs) fsBody.querySelectorAll("pre code").forEach((b) => window.hljs.highlightElement(b));
        } else {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          const lang = LANG_HINT[e];
          if (lang) code.className = "language-" + lang;
          code.textContent = truncated ? text + "\n\n… truncated …" : text;
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

  document.getElementById("fsClose").addEventListener("click", () => closeFileSheet());
  document.getElementById("fileSheetBackdrop").addEventListener("click", () => closeFileSheet());
  function closeFileSheet(keepFocus) {
    fileSheet.classList.remove("open");
    fileSheet.setAttribute("aria-hidden", "true");
    updateBodyLock();
    if (!keepFocus && !treeSheet.classList.contains("open") && fileLastFocus && fileLastFocus.focus) fileLastFocus.focus();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (fileSheet.classList.contains("open")) closeFileSheet();
      else if (treeSheet.classList.contains("open")) closeTreeSheet();
      return;
    }
    if (e.key === "Tab") {
      if (fileSheet.classList.contains("open")) trapTab(fileSheet, e);
      else if (treeSheet.classList.contains("open")) trapTab(treeSheet, e);
      else {
        const linksPanel = document.getElementById("linksPanel");
        if (linksPanel && !linksPanel.hidden) trapTab(linksPanel, e);
        else {
          const cmdk = document.getElementById("cmdk");
          if (cmdk && !cmdk.hidden) trapTab(cmdk, e);
        }
      }
    }
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

    const sections = Array.from(document.querySelectorAll(".sheet[id]"));
    const navLinks = Array.from(nav.querySelectorAll("a"));

    // Scrollspy — highlights the section currently in view (rAF-throttled).
    function updateActive() {
      const marker = window.scrollY + window.innerHeight * 0.28;
      let current = sections[0];
      for (const s of sections) {
        // Absolute top (section may not be a direct child of body).
        const top = s.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = s;
      }
      // At the very bottom, always lock to the last section (contact).
      const bottom = window.innerHeight + window.scrollY;
      if (bottom >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1];
      }
      if (!current) return;
      const id = current.id;
      navLinks.forEach((a) => a.classList.toggle("active", a.dataset.nav === id));
    }

    let spyQueued = false;
    function queueUpdate() {
      if (spyQueued) return;
      spyQueued = true;
      requestAnimationFrame(() => {
        spyQueued = false;
        updateActive();
      });
    }

    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    updateActive();
  }

  // ---------------- Easter egg: secret flag ----------------
  function initEasterEgg() {
    const foot = document.querySelector(".rail__foot");
    if (!foot) return;
    const flag = "1337{wh0_ru_but_w3ll_pl4y3d}";
    let clicks = 0;
    let timer = null;
    function activate() {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => (clicks = 0), 1600);
      if (clicks >= 3) {
        clicks = 0;
        const cur = foot.textContent;
        foot.textContent = flag;
        foot.style.color = "var(--accent)";
        foot.style.cursor = "default";
        console.log("%cFLAG FOUND%c " + flag,
          "background:#7dcfff;color:#16161e;font-weight:bold;padding:2px 6px;border-radius:2px",
          "color:#7aa2f7;font-family:monospace;font-size:13px");
        setTimeout(() => {
          foot.textContent = cur;
          foot.style.color = "";
        }, 5000);
      }
    }
    foot.addEventListener("click", activate);
    foot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
    foot.setAttribute("title", "psst… try three quick clicks");
  }

  // ---------------- Init ----------------
  document.addEventListener("DOMContentLoaded", () => {
    renderProfile();
    renderStats();
    renderSkills();
    renderAchievements();
    renderCerts();
    renderContact();
    initNav();
    loadRepos();
    renderLinkPanel();
    initLinkPanel();
    initPalette();
    initEasterEgg();
  });
})();
