// =====================================================================
// PORTFOLIO LOGIC
// Reads window.PORTFOLIO_CONFIG and renders every section. The repo grid
// is fetched live from the GitHub REST API — no build step, no backend.
// Every card links straight to github.com; we never render repo content
// inline. Update config.js and refresh to see changes.
// =====================================================================

(function () {
  "use strict";

  const CFG = window.PORTFOLIO_CONFIG;

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
    var heroFocusEl = document.getElementById("heroFocus");
    if (heroFocusEl) heroFocusEl.textContent = "Focus: " + (p.currentFocus || "—");
    const avatarImg = document.getElementById("avatarImg");
    avatarImg.onerror = function () {
      if (!avatarImg.dataset.fb) {
        avatarImg.dataset.fb = "1";
        avatarImg.src = "assets/avatar.jpg";
      }
    };
    avatarImg.src = p.avatar;
    avatarImg.alt = p.name + " avatar";

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
      if (!item.url) return;
      const a = document.createElement("a");
      a.className = "links-panel__item";
      a.href = item.url;
      if (item.url.indexOf("mailto:") !== 0) {
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
    let lastFocus = null;

    function setExpanded(expanded) {
      [openBtn, contactBtn].forEach(function (button) {
        if (button) button.setAttribute("aria-expanded", expanded ? "true" : "false");
      });
      panel.setAttribute("aria-hidden", expanded ? "false" : "true");
    }
    function open() {
      lastFocus = document.activeElement;
      panel.hidden = false;
      backdrop.hidden = false;
      setExpanded(true);
      updateBodyLock();
      closeBtn.focus();
    }
    function close(restoreFocus) {
      panel.hidden = true;
      backdrop.hidden = true;
      setExpanded(false);
      updateBodyLock();
      if (restoreFocus !== false && lastFocus && lastFocus.focus) {
        try { lastFocus.focus(); } catch (e) { /* ignore */ }
      }
    }
    function toggle() {
      if (panel.hidden) open();
      else close();
    }

    if (openBtn) openBtn.addEventListener("click", toggle);
    if (contactBtn) contactBtn.addEventListener("click", toggle);
    closeBtn.addEventListener("click", () => close());
    backdrop.addEventListener("click", () => close());
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
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    try { window.history.pushState(null, "", "#" + id); } catch (e) { /* ignore */ }
  }

  window.addEventListener("popstate", () => {
    const hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
  });

  function openLinksPanel() {
    const panel = document.getElementById("linksPanel");
    const openBtn = document.getElementById("linksOpen");
    if (panel && panel.hidden && openBtn) openBtn.click();
  }

  function paletteEntries() {
    const entries = [
       { label: "Go to About", detail: "section", run: () => goSection("about") },
       { label: "Go to Skillset", detail: "section", run: () => goSection("skillset") },
       { label: "Go to CTF Highlights", detail: "section", run: () => goSection("achievements") },
       { label: "Go to Threat Harbour", detail: "case study", run: () => goSection("threat-harbour") },
       { label: "Go to Writing", detail: "section", run: () => goSection("writing") },
       { label: "Go to Repositories", detail: "section", run: () => goSection("repositories") },
       { label: "Go to Certificates", detail: "section", run: () => goSection("certificates") },
       { label: "Go to Contact", detail: "section", run: () => goSection("contact") },
      { label: "Read CTF writeups", detail: "page", run: () => { window.location.href = "/writeups/"; } },
      { label: "Read the blog", detail: "page · malware analysis + security notes", run: () => { window.location.href = "/blog/"; } },
      { label: "Open threat intel", detail: "page · daily sensor dashboard", run: () => { window.location.href = "/intel/"; } },
      { label: "Open Links", detail: "action", run: openLinksPanel },
      { label: "Copy email", detail: "action", run: () => {
        const email = (CFG.contact || {}).email || "";
        copyText(email, null);
        toast("Email copied to clipboard");
      } },
    ];
    if (CFG.flagship && CFG.flagship.repo) {
      const fl = CFG.flagship.links || {};
      entries.push({ label: "View Threat Harbour on GitHub", detail: "external", run: () => window.open(fl.github || ("https://github.com/" + CFG.github.username + "/" + CFG.flagship.repo), "_blank", "noopener") });
    }
    (writeupCache || []).forEach((w) => {
      const tagPart = (w.tags && w.tags.length) ? " · " + w.tags.join("/") : "";
      entries.push({
        label: w.title,
        detail: w.event + tagPart + " · " + (w.difficulty ? w.difficulty + " writeup" : "writeup"),
        run: () => { window.location.href = "/writeups/" + w.url; },
      });
    });
    (blogCache || []).forEach((post) => {
      entries.push({
        label: post.title,
        detail: (post.category || "writing") + " · security note",
        run: () => { window.location.href = "/blog/" + post.url; },
      });
    });
    repoCache.forEach((repo) => {
      entries.push({ label: repo.name, detail: "repo · open on GitHub", run: () => window.open(repo.html_url, "_blank", "noopener") });
    });
    entries.push({ label: "View GitHub profile", detail: "external", run: () => window.open("https://github.com/" + CFG.github.username, "_blank", "noopener") });
    return entries;
  }

  function setPalActive(i) {
    const list = document.getElementById("cmdkList");
    const input = document.getElementById("cmdkInput");
    if (!list) return;
    const rows = list.querySelectorAll(".cmdk-item");
    if (rows.length === 0) return;
    palActive = ((i % rows.length) + rows.length) % rows.length || 0;
    rows.forEach((r, j) => {
      const on = j === palActive;
      r.classList.toggle("active", on);
      r.setAttribute("aria-selected", on ? "true" : "false");
    });
    const active = rows[palActive];
    if (input && active && active.id) input.setAttribute("aria-activedescendant", active.id);
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }

  let writeupCache = null;
  let writeupsLoading = false;

  function loadWriteupsIndex() {
    if (writeupCache || writeupsLoading) return;
    writeupsLoading = true;
    fetchWithTimeout("writeups/search.json", 9000)
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

  let blogCache = null;
  let blogsLoading = false;

  function renderLatestWriting() {
    const host = document.getElementById("latestWriting");
    const heroLink = document.getElementById("heroWriting");
    const heroTitle = document.getElementById("heroWritingTitle");
    const post = blogCache && blogCache.length ? blogCache[0] : null;
    const postUrl = post ? "/blog/" + post.url : "/blog/";
    const titleText = post ? post.title : "Security writing is on its way";

    if (heroLink && heroTitle) {
      heroLink.hidden = false;
      heroLink.href = postUrl;
      heroTitle.textContent = titleText;
      heroLink.setAttribute("aria-label", titleText + " — open latest writing");
    }

    if (!host) return;
    host.innerHTML = "";
    const card = document.createElement("a");
    card.className = "writing-feature__card";
    card.href = postUrl;
    const meta = document.createElement("div");
    meta.className = "writing-feature__meta";
    const latest = document.createElement("span");
    latest.className = "writing-feature__latest";
    latest.textContent = "Latest";
    meta.appendChild(latest);
    const category = document.createElement("span");
    category.className = "writing-feature__category";
    category.textContent = post ? (post.category || "Security note") : "Security writing";
    meta.appendChild(category);
    if (post && post.date) {
      const date = document.createElement("time");
      date.dateTime = post.date;
      date.textContent = new Date(post.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      meta.appendChild(date);
    }
    const title = document.createElement("h3");
    title.textContent = titleText;
    const summary = document.createElement("p");
    summary.textContent = post ? (post.summary || "Read the latest security note.") : "The first defensive research note will appear here soon.";
    const read = document.createElement("span");
    read.className = "writing-feature__read";
    read.textContent = post ? "Read note →" : "Browse the blog →";
    card.append(meta, title, summary, read);
    host.appendChild(card);
  }

  function loadBlogIndex() {
    if (blogCache || blogsLoading) return;
    blogsLoading = true;
    fetchWithTimeout("blog/search.json", 9000)
      .then((r) => {
        if (!r.ok) throw new Error("no blog index");
        return r.json();
      })
      .then((data) => {
        blogCache = Array.isArray(data) ? data : [];
        renderLatestWriting();
        const panel = document.getElementById("cmdk");
        const input = document.getElementById("cmdkInput");
        if (panel && !panel.hidden && input) renderPalette(input.value);
      })
      .catch(() => {
        blogCache = [];
        renderLatestWriting();
      });
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
    const input = document.getElementById("cmdkInput");
    if (input) input.removeAttribute("aria-activedescendant");
    if (palFiltered.length === 0) {
      list.innerHTML = '<p class="cmdk-empty">No matches</p>';
      return;
    }
    palFiltered.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "cmdk-item" + (i === 0 ? " active" : "");
      row.setAttribute("role", "option");
      row.id = "cmdkOpt" + i;
      row.setAttribute("aria-selected", i === 0 ? "true" : "false");
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
    const first = list.querySelector(".cmdk-item");
    if (input && first && first.id) input.setAttribute("aria-activedescendant", first.id);
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
    loadBlogIndex();
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
  // ---------------- Flagship spotlight ----------------
  // Static config-first render (never breaks the page), then progressive
  // enhancement: live sensor counts from metrics.json + live repo meta.
  function fmtNum(n) {
    if (typeof n !== "number" || !isFinite(n)) return null;
    try { return n.toLocaleString("en-US"); } catch (e) { return String(n); }
  }

  function flagshipRepoRef() {
    const f = CFG.flagship || {};
    const username = CFG.github && CFG.github.username;
    return { owner: username, repo: f.repo || "threat-harbour" };
  }

  function renderFlagship() {
    const f = CFG.flagship;
    const host = document.getElementById("flagship");
    if (!host || !f) { renderHeroFlagship(); return; }
    host.innerHTML = "";

    const card = document.createElement("article");
    card.className = "flagship-card";
    card.id = "flagshipCard";

    const badge = document.createElement("span");
    badge.className = "flagship-badge";
    const pulse = document.createElement("span");
    pulse.className = "pulse";
    pulse.setAttribute("aria-hidden", "true");
    badge.appendChild(pulse);
    badge.appendChild(document.createTextNode(f.badge || "Flagship project"));
    card.appendChild(badge);

    const title = document.createElement("h3");
    title.className = "flagship-title";
    title.textContent = f.name || "Threat Harbour";
    card.appendChild(title);

    if (f.tagline) {
      const tag = document.createElement("p");
      tag.className = "flagship-tagline";
      tag.textContent = f.tagline;
      card.appendChild(tag);
    }

    if (f.description) {
      const desc = document.createElement("p");
      desc.className = "flagship-desc";
      desc.textContent = f.description;
      card.appendChild(desc);
    }

    if (Array.isArray(f.highlights) && f.highlights.length) {
      const ul = document.createElement("ul");
      ul.className = "flagship-points";
      f.highlights.forEach((h) => {
        const li = document.createElement("li");
        li.textContent = h;
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }

    // Stats (fallback first, live values swap in when fetched).
    const statsDl = document.createElement("dl");
    statsDl.className = "flagship-stats";
    statsDl.setAttribute("aria-label", "Threat Harbour sensor statistics");
    (f.fallbackStats || []).slice(0, 4).forEach((s, i) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = s.label || "";
      const dd = document.createElement("dd");
      dd.textContent = s.value || "";
      dd.dataset.stat = ["events", "ips", "sessions", "refresh"][i] || ("s" + i);
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      statsDl.appendChild(wrap);
    });
    card.appendChild(statsDl);

    const live = document.createElement("p");
    live.className = "flagship-live";
    live.id = "flagshipLive";
    live.innerHTML = '<span class="dot">●</span> latest counts load from the daily sensor snapshot';
    card.appendChild(live);

    if (Array.isArray(f.stack) && f.stack.length) {
      const stack = document.createElement("div");
      stack.className = "flagship-stack";
      stack.setAttribute("aria-label", "Built with");
      f.stack.forEach((t) => {
        const chip = document.createElement("span");
        chip.textContent = t;
        stack.appendChild(chip);
      });
      card.appendChild(stack);
    }

    const actions = document.createElement("div");
    actions.className = "flagship-actions";
    const links = f.links || {};
    function addBtn(label, href, primary, ext) {
      const a = document.createElement("a");
      a.className = "btn " + (primary ? "btn--primary" : "btn--ghost");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = escapeHtml(label) + ' <span class="ext">' + (ext || "↗") + "</span>";
      actions.appendChild(a);
      return a;
    }
    if (links.intel) {
      const intelA = document.createElement("a");
      intelA.className = "btn btn--primary";
      intelA.href = links.intel;
      intelA.innerHTML = escapeHtml("View case study") + ' <span class="ext">→</span>';
      actions.appendChild(intelA);
    }
    if (links.docs) addBtn("Read docs", links.docs, false);
    // The flagship card always links out to its repo — we no longer render
    // repository contents inline, so this is the card's file affordance.
    const ghUrl = links.github ||
      ("https://github.com/" + CFG.github.username + "/" + String(f.repo || ""));
    addBtn("View on GitHub", ghUrl, false);
    card.appendChild(actions);

    const meta = document.createElement("p");
    meta.className = "flagship-meta";
    meta.id = "flagshipMeta";
    meta.textContent = "";
    card.appendChild(meta);

    host.appendChild(card);

    renderHeroFlagship();
    enrichFlagshipLive();
    enrichFlagshipRepo();
  }

  function renderHeroFlagship() {
    const f = CFG.flagship;
    const el = document.getElementById("heroFlagship");
    if (!el || !f) return;
    el.hidden = false;
    el.innerHTML = "";
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = "★ ";
    el.appendChild(star);
    el.appendChild(document.createTextNode("Case study: "));
    const a = document.createElement("a");
    a.href = "#threat-harbour";
    a.textContent = (f.name || "Threat Harbour") + " — SSH honeypot";
    el.appendChild(a);
  }

  function enrichFlagshipLive() {
    const f = CFG.flagship || {};
    if (!f.metricsUrl) return;
    const live = document.getElementById("flagshipLive");
    fetchWithTimeout(f.metricsUrl, 9000)
      .then((r) => { if (!r.ok) throw new Error("metrics " + r.status); return r.json(); })
      .then((m) => {
        const card = document.getElementById("flagshipCard");
        if (!card) return;
        const set = (key, val) => {
          const dd = card.querySelector('[data-stat="' + key + '"]');
          if (dd && val != null) dd.textContent = val;
        };
        const events = m.totals && m.totals.total_events;
        const ips = m.sources && m.sources.unique_source_ips;
        const sessions = m.sessions && m.sessions.unique_session_ids;
        set("events", fmtNum(events));
        set("ips", fmtNum(ips));
        set("sessions", fmtNum(sessions));
        const cutoff = m.analysis_cutoff_utc || (m.observation_period && m.observation_period.interim_cutoff);
        if (live) {
          let when = "";
          if (cutoff) {
            try {
              when = " · updated " + new Date(cutoff).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
            } catch (e) { when = ""; }
          }
          const intelHref = (f.links || {}).intel || "/intel/";
          live.innerHTML = '<span class="dot">●</span> latest sensor counts' + escapeHtml(when) + ' · <a href="' + escapeHtml(intelHref) + '">full dashboard →</a>';
        }
      })
      .catch(() => {
        const intelHref = ((CFG.flagship || {}).links || {}).intel || "/intel/";
        if (live) live.innerHTML = '<span class="dot">●</span> latest snapshot counts · <a href="' + escapeHtml(intelHref) + '">full dashboard →</a>';
      });
  }

  // The flagship repo sits in config's hiddenRepos, so it never lands in
  // repoCache — without a shared promise every caller (renderFlagship at
  // init, then loadRepos) would fire the identical request again.
  let flagshipRepoFetch = null;

  function enrichFlagshipRepo() {
    const f = CFG.flagship || {};
    if (!f.repo) return;
    const meta = document.getElementById("flagshipMeta");
    const apply = (repo) => {
      if (!meta || !repo) return;
      // Same inline SVG star the repo tiles use — the raw ★ glyph has no
      // glyph in the mono stack on some systems and renders as tofu.
      const bits = [];
      if (typeof repo.stargazers_count === "number") bits.push('<span class="stat">' + statIcon("star") + " " + repo.stargazers_count + "</span>");
      if (repo.language) bits.push("<span>" + escapeHtml(repo.language) + "</span>");
      if (repo.updated_at) bits.push("<span>updated " + escapeHtml(formatDate(repo.updated_at)) + "</span>");
      meta.innerHTML = bits.join(" · ");
    };
    const cached = (repoCache || []).find((r) => (r.name || "").toLowerCase() === String(f.repo).toLowerCase());
    if (cached) { apply(cached); return; }
    if (!flagshipRepoFetch) {
      const ref = flagshipRepoRef();
      flagshipRepoFetch = fetchWithTimeout("https://api.github.com/repos/" + ref.owner + "/" + ref.repo, 9000, { headers: githubHeaders() })
        .then((r) => { if (!r.ok) throw new Error("repo " + r.status); return r.json(); });
    }
    flagshipRepoFetch.then(apply).catch(() => { /* keep meta empty — card already stands alone */ });
  }

  // ---------------- Certificates ----------------
  // Per-issuer monogram tints — same pill language as .diff/.tag.
  const MONO_HUES = [
    { fg: "#7dcfff", bg: "rgba(125,207,255,0.12)", bd: "rgba(125,207,255,0.50)" },
    { fg: "#7aa2f7", bg: "rgba(122,162,247,0.12)", bd: "rgba(122,162,247,0.50)" },
    { fg: "#9ece6a", bg: "rgba(158,206,106,0.12)", bd: "rgba(158,206,106,0.50)" },
    { fg: "#ff9e64", bg: "rgba(255,158,100,0.12)", bd: "rgba(255,158,100,0.50)" },
    { fg: "#bb9af7", bg: "rgba(187,154,247,0.14)", bd: "rgba(187,154,247,0.50)" },
  ];

  function certInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    const clean = (words[0] || "?").replace(/[^A-Za-z0-9]/g, "");
    return (clean.slice(0, 2) || "?").toUpperCase();
  }

  function certBadge(c, i) {
    // A real badge image wins; the shared placeholder gets a monogram.
    if (c.image && c.image !== "assets/certificate.png") {
      return `<img src="${escapeHtml(c.image)}" alt="${escapeHtml((c.name || "Certificate") + " badge")}" width="44" height="44" loading="lazy" decoding="async" />`;
    }
    const hue = MONO_HUES[i % MONO_HUES.length];
    return `<span class="cert-mono" style="color:${hue.fg};background:${hue.bg};border-color:${hue.bd}" aria-hidden="true">${escapeHtml(certInitials(c.name))}</span>`;
  }

  function renderCerts() {
    const grid = document.getElementById("certGrid");
    if (!grid) return;
    grid.innerHTML = "";
    (CFG.certificates || []).forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "cert-card";
      card.innerHTML = `
        ${certBadge(c, i)}
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <div class="cert-meta">${escapeHtml(c.issuer || "")}${c.date ? " · " + escapeHtml(c.date) : ""}</div>
          ${c.credentialUrl ? `<a href="${escapeHtml(c.credentialUrl)}" target="_blank" rel="noopener noreferrer">View certificate <span class="ext">↗</span></a>` : ""}
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

  function toast(message) {
    let el = document.getElementById("siteToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "siteToast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.style.cssText = "position:fixed;right:16px;bottom:72px;z-index:400;max-width:min(320px,calc(100vw - 32px));padding:10px 14px;border:1px solid var(--line-bright);border-top:2px solid var(--accent);border-radius:var(--radius);background:var(--panel);color:var(--ink);font:12px var(--mono);box-shadow:0 12px 32px rgba(0,0,0,.4);opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease;pointer-events:none;";
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "none"; });
    clearTimeout(el._hideT);
    el._hideT = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
    }, 1800);
  }

  function renderContact() {
    const list = document.getElementById("contactList");
    if (!list) return;
    const c = CFG.contact || {};
    const methods = [];
    if (c.email) {
      methods.push(`
        <div class="contact-method contact-method--email">
          <span class="cm-label">Email</span>
          <div class="cm-row">
            <a class="cm-value" href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>
            <button type="button" class="btn btn--ghost btn--small cm-copy" data-copy-email data-label="Copy" title="Copy email">Copy</button>
          </div>
          <span class="cm-note">Best for longer conversations &amp; opportunities</span>
        </div>`);
    }
    if (c.discord) {
      methods.push(`
        <div class="contact-method">
          <span class="cm-label">Discord</span>
          <a class="cm-value" href="${escapeHtml(c.discord)}" target="_blank" rel="noopener noreferrer">@aaadarsh1337</a>
          <span class="cm-note">Fastest for a quick chat</span>
        </div>`);
    }
    list.innerHTML = methods.join("");
    const copyBtn = list.querySelector("[data-copy-email]");
    if (copyBtn && c.email) {
      copyBtn.addEventListener("click", () => {
        copyText(c.email, copyBtn);
        toast("Email copied to clipboard");
      });
    }
  }

  // ---------------- Repositories (GitHub API) ----------------
  // One call per cold page view; the grid only renders metadata and links
  // each card out to github.com. Nothing is read from a repo's contents.
  const REPO_CACHE_KEY = "portfolio.repos";
  const REPO_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  function githubHeaders() {
    // Anonymous requests only. A token committed here would ship to every
    // visitor of this public site, so token support was removed.
    return { Accept: "application/vnd.github.v3+json" };
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

      // Touch devices have no ⌘K chord, so don't advertise one there.
        var cmdHint = matchMedia("(hover: none)").matches
          ? "tap ⌘K for search"
          : "press Ctrl+K";
        status.textContent = `${repos.length} repositor${repos.length === 1 ? "y" : "ies"} — every card opens its GitHub repo (or ${cmdHint})`;
      grid.innerHTML = "";
      repoCache = repos;
      repos.forEach((repo) => grid.appendChild(renderRepoCard(repo, pinned)));
      try { enrichFlagshipRepo(); } catch (e) { /* flagship meta is optional */ }
    } catch (err) {
      const gh = "https://github.com/" + username + "?tab=repositories";
      if (err && err.rateLimit) {
        status.innerHTML = 'GitHub rate limit reached. <a href="' + escapeHtml(gh) + '" target="_blank" rel="noopener noreferrer">View repos on GitHub ↗</a>';
      } else {
        status.innerHTML = 'Couldn’t reach GitHub. <a href="' + escapeHtml(gh) + '" target="_blank" rel="noopener noreferrer">View repos on GitHub ↗</a>';
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
        <a class="repo-name" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(repo.name)}
        </a>
        ${isPinned ? '<span class="repo-card__badge">Featured</span>' : ''}
      </div>
      <p class="repo-desc">${escapeHtml(repo.description || "No description provided.")}</p>
      ${lang ? `<div class="repo-lang"><span class="lang-dot" style="background:${langColor(lang)}"></span>${escapeHtml(lang)}</div>` : ""}
      <div class="repo-meta">
        <span class="stat" title="${stars} stars">${statIcon("star")} ${stars}</span>
        <span class="stat" title="${forks} forks">${statIcon("fork")} ${forks}</span>
        <span class="updated">Updated ${formatDate(repo.updated_at)}</span>
      </div>
      <div class="repo-foot">
        <a class="repo-open" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer">Browse ↗</a>
      </div>
    `;
    return card;
  }

  function anyModalOpen() {
    const linksPanel = document.getElementById("linksPanel");
    const cmdk = document.getElementById("cmdk");
    return Boolean(
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

  // Focus trap for the two remaining overlays. Escape is handled by each
  // overlay's own listener (see initLinkPanel / initPalette).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const linksPanel = document.getElementById("linksPanel");
    const cmdk = document.getElementById("cmdk");
    if (linksPanel && !linksPanel.hidden) trapTab(linksPanel, e);
    else if (cmdk && !cmdk.hidden) trapTab(cmdk, e);
  });

  // ---------------- Nav: mobile toggle + scrollspy ----------------
  function initNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("siteNav");
    if (!toggle || !nav) return;
    let navLastFocus = null;

    function setOpen(open, restoreFocus) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open && restoreFocus && navLastFocus && navLastFocus.focus) navLastFocus.focus();
    }
    function closeNav(restoreFocus) {
      setOpen(false, restoreFocus);
    }
    toggle.addEventListener("click", () => {
      if (nav.classList.contains("open")) {
        closeNav(true);
      } else {
        navLastFocus = document.activeElement;
        setOpen(true, false);
      }
    });

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => closeNav(false));
    });
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("open")) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) closeNav(true);
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
      navLinks.forEach((a) => {
        const on = a.dataset.nav === id;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
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
    const foot = document.getElementById("easterEgg");
    if (!foot) return;
    const flag = "flag{s3cr3ts_d13_h3r3}";
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
    // Native <button>: Enter/Space already fire click — no manual key handler.
  }

  // ---------------- Init ----------------
  document.addEventListener("DOMContentLoaded", () => {
    const steps = [
      renderProfile,
      renderStats,
      renderSkills,
      renderAchievements,
      renderFlagship,
      renderCerts,
      renderContact,
      initNav,
      loadRepos,
      loadBlogIndex,
      renderLinkPanel,
      initLinkPanel,
      initPalette,
      initEasterEgg
    ];
    steps.forEach((fn) => {
      try { fn(); } catch (err) { console.error("init failed:", fn.name, err); }
    });
  });
})();
