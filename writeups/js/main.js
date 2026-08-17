// =====================================================================
// CTF WRITEUPS â€” repo tree, challenge cards, markdown reader
// =====================================================================

(function () {
  "use strict";

  const CFG = window.WRITEUPS_CONFIG;
  const USER = CFG.github.username;
  const REPO = CFG.github.repo;
  const BRANCH = CFG.github.branch || "main";

  const READABLE_EXT = new Set([
    "md", "markdown", "txt", "py", "js", "ts", "json", "html", "css",
    "yml", "yaml", "sh", "bash", "c", "cpp", "h", "go", "rs", "rb",
    "java", "sql", "xml", "toml", "ini", "cfg", "log", "csv"
  ]);
  const MD_EXT = new Set(["md", "markdown"]);

  let allChallenges = [];
  let allBlobs = [];
  let activeFilter = "all";
  let searchQuery = "";

  function ext(name) {
    const p = name.split(".");
    return p.length > 1 ? p.pop().toLowerCase() : "";
  }
  function isReadable(name) { return READABLE_EXT.has(ext(name)); }
  function isMd(name) { return MD_EXT.has(ext(name)); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function githubBlob(path) {
    return "https://github.com/" + USER + "/" + REPO + "/blob/" + BRANCH + "/" + path;
  }
  function githubTree(path) {
    return path
      ? "https://github.com/" + USER + "/" + REPO + "/tree/" + BRANCH + "/" + path
      : "https://github.com/" + USER + "/" + REPO + "/tree/" + BRANCH;
  }
  function rawUrl(path) {
    return "https://raw.githubusercontent.com/" + USER + "/" + REPO + "/" + BRANCH + "/" + path;
  }

  function buildChallenges(tree) {
    const blobs = (tree || []).filter((n) => n.type === "blob");
    const hidden = new Set((CFG.hiddenFolders || []).map((s) => s.toLowerCase()));
    const byDir = new Map();

    blobs.forEach((f) => {
      const parts = f.path.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir).push({ name: parts[parts.length - 1], path: f.path });
    });

    const challenges = [];
    const writeupNames = CFG.writeupNames || ["README.md", "writeup.md", "notes.md"];

    byDir.forEach((files, dir) => {
      const top = dir.split("/")[0] || "";
      if (top && hidden.has(top.toLowerCase())) return;

      const mdFiles = files.filter((f) => isMd(f.name));
      if (mdFiles.length === 0 && dir !== "") return;

      let writeup = null;
      for (let i = 0; i < writeupNames.length; i++) {
        writeup = mdFiles.find((f) => f.name === writeupNames[i]);
        if (writeup) break;
      }
      if (!writeup && mdFiles.length) writeup = mdFiles[0];

      if (dir === "") {
        mdFiles.forEach((f) => {
          challenges.push({
            event: "Root",
            name: f.name.replace(/\.(md|markdown)$/i, ""),
            path: "",
            files: [f],
            writeupPath: f.path
          });
        });
        return;
      }

      const parts = dir.split("/");
      let event, name;
      if (parts.length >= 2) {
        event = parts[0];
        name = parts.slice(1).join("/");
      } else {
        event = "General";
        name = parts[0];
      }

      challenges.push({
        event: event,
        name: name,
        path: dir,
        files: files,
        writeupPath: writeup ? writeup.path : null
      });
    });

    challenges.sort(function (a, b) {
      const e = a.event.localeCompare(b.event);
      if (e !== 0) return e;
      return a.name.localeCompare(b.name);
    });
    return challenges;
  }

  function renderFilters() {
    const row = document.getElementById("filterRow");
    const events = ["all"].concat(Array.from(new Set(allChallenges.map((c) => c.event))));
    row.innerHTML = events.map(function (e) {
      const label = e === "all" ? "All" : e;
      const count = e === "all"
        ? allChallenges.length
        : allChallenges.filter((c) => c.event === e).length;
      const active = e === activeFilter ? " active" : "";
      return '<button type="button" class="filter-chip' + active + '" data-filter="' +
        escapeHtml(e) + '">' + escapeHtml(label) +
        ' <span style="opacity:.7">(' + count + ")</span></button>";
    }).join("");

    row.querySelectorAll(".filter-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderGrid();
      });
    });
  }

  function normalize(str) {
      return String(str)
        .toLowerCase()
        .replace(/[_\-]+/g, " ")   // underscores & hyphens â†’ space
        .replace(/\s+/g, " ")      // collapse spaces
        .trim();
    }

    function filteredList() {
      const q = normalize(searchQuery);
      return allChallenges.filter(function (c) {
        if (activeFilter !== "all" && c.event !== activeFilter) return false;
        if (!q) return true;
        const hay = normalize(c.event + " " + c.name + " " + c.path);
        return hay.indexOf(q) !== -1;
      });
    }

  function renderGrid() {
    const container = document.getElementById("writeupSections");
    const jump = document.getElementById("sectionJump");
    const jumpLinks = document.getElementById("sectionJumpLinks");
    const list = filteredList();

    document.getElementById("searchMeta").textContent =
      list.length + " writeup" + (list.length === 1 ? "" : "s");

    container.innerHTML = "";
    jumpLinks.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = '<p class="dim">No writeups match.</p>';
      jump.hidden = true;
      return;
    }

    // Group by event, preserve alphabetical event order
    const byEvent = new Map();
    list.forEach(function (c) {
      if (!byEvent.has(c.event)) byEvent.set(c.event, []);
      byEvent.get(c.event).push(c);
    });

    const events = Array.from(byEvent.keys()).sort(function (a, b) {
      return a.localeCompare(b);
    });

    jump.hidden = events.length < 2;

    events.forEach(function (event) {
      const slug = "sec-" + event.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const items = byEvent.get(event);

      // Jump link
      if (events.length >= 2) {
        const a = document.createElement("a");
        a.href = "#" + slug;
        a.className = "section-jump__link";
        a.textContent = event + " (" + items.length + ")";
        jumpLinks.appendChild(a);
      }

      // Section
      const section = document.createElement("section");
      section.className = "writeup-section";
      section.id = slug;

      const head = document.createElement("div");
      head.className = "writeup-section__head";
      head.innerHTML =
        '<h2 class="writeup-section__title">' + escapeHtml(event) + "</h2>" +
        '<span class="writeup-section__count">' + items.length +
        " writeup" + (items.length === 1 ? "" : "s") + "</span>";
      section.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "writeup-grid";

      items.forEach(function (c) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "writeup-card";
        const fileCount = c.files.length;
        const hasMd = c.writeupPath ? "has writeup" : "no md";
        card.innerHTML =
          "<h3>" + escapeHtml(c.name) + "</h3>" +
          '<div class="meta">' +
          '<span class="md-badge">' + hasMd + "</span>" +
          "<span>" + fileCount + " file" + (fileCount === 1 ? "" : "s") + "</span>" +
          "</div>";
        card.addEventListener("click", function () { openChallenge(c); });
        grid.appendChild(card);
      });

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function showIndex() {
    document.getElementById("viewIndex").hidden = false;
    document.getElementById("viewReader").hidden = true;
    history.replaceState(null, "", location.pathname + location.search);
  }

  function showReader() {
    document.getElementById("viewIndex").hidden = true;
    document.getElementById("viewReader").hidden = false;
  }

  function buildSidebarTree(files) {
    // files: [{ name, path }] full paths under the challenge
    const root = { dirs: {}, files: [] };
    files.forEach(function (f) {
      // path relative to challenge folder
      const parts = f.rel.split("/");
      let node = root;
      parts.forEach(function (part, i) {
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

  function renderSidebarNode(node, container, depth, challenge) {
    const indent = 8 + depth * 14;

    Object.keys(node.dirs).sort().forEach(function (dirName) {
      const dirRow = document.createElement("div");
      dirRow.className = "file-item tree-dir";
      dirRow.style.paddingLeft = indent + "px";
      dirRow.innerHTML =
        '<span class="name"><span class="dir-arrow">▸</span> ' +
        escapeHtml(dirName) + "/</span>";

      const childWrap = document.createElement("div");
      childWrap.className = "tree-children";
      childWrap.style.display = "none";

      dirRow.addEventListener("click", function () {
        const open = childWrap.style.display !== "none";
        childWrap.style.display = open ? "none" : "block";
        dirRow.querySelector(".dir-arrow").textContent = open ? "▸" : "▾";
      });

      container.appendChild(dirRow);
      container.appendChild(childWrap);
      renderSidebarNode(node.dirs[dirName], childWrap, depth + 1, challenge);
    });

    node.files.sort(function (a, b) { return a.name.localeCompare(b.name); })
      .forEach(function (f) {
        const readable = isReadable(f.name);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "file-item " + (readable ? "readable" : "unreadable");
        btn.style.paddingLeft = indent + "px";
        const kind = !readable
          ? "github \u2197"
          : (isMd(f.name) ? "md" : (ext(f.name) || "text"));
        btn.innerHTML =
          '<span class="name">' + escapeHtml(f.name) + "</span>" +
          '<span class="kind">' + kind + "</span>";
        btn.addEventListener("click", function () {
          openFile(challenge, f, btn);
        });
        container.appendChild(btn);
      });
  }

  function openChallenge(c, filePath) {
    showReader();
    document.getElementById("sideTitle").textContent = c.name;
    document.getElementById("sidePath").textContent = c.path || "(root)";
    document.getElementById("sideGithub").href = githubTree(c.path);

    const list = document.getElementById("fileList");
    list.innerHTML = "";

    // All files under this challenge path (includes subdirectories)
    const prefix = c.path ? c.path + "/" : "";
    const under = allBlobs
      .filter(function (b) {
        if (!c.path) return b.path.indexOf("/") === -1; // root-only
        return b.path.indexOf(prefix) === 0;
      })
      .map(function (b) {
        return {
          path: b.path,
          name: b.path.split("/").pop(),
          rel: c.path ? b.path.slice(prefix.length) : b.path
        };
      });

    // Keep challenge.files in sync for writeup detection
    c.files = under.map(function (f) {
      return { name: f.name, path: f.path };
    });

    const tree = buildSidebarTree(under);
    renderSidebarNode(tree, list, 0, c);

    // Open preferred writeup
    let targetPath = filePath || c.writeupPath;
    if (!targetPath) {
      const md = under.find(function (f) { return isMd(f.name); });
      if (md) targetPath = md.path;
    }
    if (targetPath) {
      const f = under.find(function (x) { return x.path === targetPath; }) || under[0];
      if (f) {
        let matchBtn = null;
        list.querySelectorAll("button.file-item").forEach(function (el) {
          const n = el.querySelector(".name");
          if (n && n.textContent === f.name) matchBtn = el;
        });
        openFile(c, f, matchBtn);
      }
    } else {
      document.getElementById("readerBody").innerHTML =
        '<p class="dim">No readable files in this folder.</p>';
    }

    const hash = "#/" + encodeURIComponent(c.path || c.writeupPath || c.name);
    history.replaceState(null, "", location.pathname + location.search + hash);
  }

  function openFile(challenge, file, btnEl) {
    document.querySelectorAll(".file-item").forEach(function (el) {
      el.classList.remove("active");
    });
    if (btnEl) btnEl.classList.add("active");

    document.getElementById("readerFile").textContent = file.name;
    document.getElementById("readerGithub").href = githubBlob(file.path);
    const body = document.getElementById("readerBody");

    if (!isReadable(file.name)) {
      body.innerHTML =
        '<div class="redirect-card">' +
        "<p>This file is not rendered here (binary, image, or non-text).<br/>" +
        "Open it on GitHub instead.</p>" +
        '<a class="btn btn--primary" href="' + githubBlob(file.path) +
        '" target="_blank" rel="noopener">Open on GitHub \u2197</a>' +
        "</div>";
      return;
    }

    body.innerHTML = '<p class="dim">&gt; loading ' + escapeHtml(file.name) + "_</p>";

    fetch(rawUrl(file.path))
      .then(function (r) {
        if (!r.ok) throw new Error("fetch " + r.status);
        return r.text();
      })
      .then(function (text) {
        if (isMd(file.name)) {
          const wrap = document.createElement("div");
          wrap.className = "md-render";
          wrap.innerHTML = window.marked ? window.marked.parse(text) : escapeHtml(text);
          body.innerHTML = "";
          body.appendChild(wrap);
          if (window.hljs) {
            body.querySelectorAll("pre code").forEach(function (b) {
              window.hljs.highlightElement(b);
            });
          }
        } else {
          const pre = document.createElement("pre");
          const code = document.createElement("code");
          code.textContent = text;
          pre.appendChild(code);
          body.innerHTML = "";
          body.appendChild(pre);
          if (window.hljs) window.hljs.highlightElement(code);
        }
      })
      .catch(function (err) {
        body.innerHTML =
          '<div class="redirect-card">' +
          "<p>Could not load this file (rate limit or network).</p>" +
          '<a class="btn btn--primary" href="' + githubBlob(file.path) +
          '" target="_blank" rel="noopener">Open on GitHub \u2197</a>' +
          "</div>";
        console.error(err);
      });
  }

  async function loadTree() {
    const status = document.getElementById("statusLine");
    try {
      const url = "https://api.github.com/repos/" + USER + "/" + REPO +
        "/git/trees/" + BRANCH + "?recursive=1";
      const res = await fetch(url);
      if (!res.ok) throw new Error("GitHub API " + res.status);
      const data = await res.json();
      allBlobs = (data.tree || []).filter(function (n) { return n.type === "blob"; });
      allChallenges = buildChallenges(data.tree);

      if (allChallenges.length === 0) {
        status.textContent = "No markdown writeups found in this repo yet.";
        return;
      }

      status.textContent =
        allChallenges.length + " challenge" +
        (allChallenges.length === 1 ? "" : "s") +
        " \u00b7 click to read";
      renderGrid();

      const hash = location.hash.replace(/^#\/?/, "");
      if (hash) {
        const decoded = decodeURIComponent(hash);
        const match = allChallenges.find(function (c) {
          return c.path === decoded || c.writeupPath === decoded || c.name === decoded;
        });
        if (match) openChallenge(match);
      }
    } catch (err) {
      status.innerHTML =
        'GitHub API isn\'t reachable right now (rate limit or network). ' +
        'You can still browse the writeups on GitHub: ' +
        '<a href="https://github.com/' + USER + '/' + REPO +
        '" target="_blank" rel="noopener">github.com/' + USER + '/' + REPO + ' ↗</a>';
      console.error(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("pageTitle").textContent = CFG.title || "Writeups";
    document.getElementById("pageSub").textContent = CFG.subtitle || "";
    document.getElementById("portfolioLink").href = CFG.portfolioUrl || "/";
    document.getElementById("githubRepoLink").href =
      "https://github.com/" + USER + "/" + REPO;

    document.getElementById("brandHome").addEventListener("click", function (e) {
      e.preventDefault();
      showIndex();
    });
    document.getElementById("backBtn").addEventListener("click", showIndex);

    document.getElementById("searchInput").addEventListener("input", function (e) {
      searchQuery = e.target.value;
      renderGrid();
    });

    document.getElementById("navToggle").addEventListener("click", function () {
      document.querySelector(".topbar__inner").classList.toggle("menu-open");
    });

    loadTree();
  });
})();
