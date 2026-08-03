import os

files = {
    "index.html": '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>aaadarsh1337 | Portfolio</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <!-- Markdown parser -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="container">
    <div class="nerd-header"><span>$</span> ./portfolio <span>_</span></div>
    <header>
        <h1 id="username">aaadarsh1337</h1>
        <p class="tagline"><!-- ✏️ EDIT -->Cybersecurity Enthusiast · CTF Player · Code tinkerer</p>
        <p class="bio"><!-- ✏️ EDIT -->Passionate about penetration testing, reverse engineering, and building custom security tools. I document my journey through code and notes.</p>
        <div class="social-links">
            <!-- ✏️ EDIT these URLs -->
            <a href="https://github.com/aaadarsh1337" target="_blank">GitHub</a>
            <a href="#" target="_blank">TryHackMe</a>
            <a href="#" target="_blank">PicoCTF</a>
        </div>
    </header>
    <section class="repos-section">
        <h2>>_ Repositories</h2>
        <div id="repo-grid" class="repo-grid"><p style="color:#555;grid-column:1/-1;text-align:center;">⏳ Loading repositories...</p></div>
    </section>
    <footer>
        <p><span class="cursor-blink">█</span> <!-- ✏️ EDIT -->© 2026 aaadarsh1337 · Built with <span style="color:#00ff41;">&lt;/&gt;</span> and caffeine</p>
    </footer>
</div>

<!-- MODAL -->
<div id="repoModal" class="modal-overlay">
    <div class="modal">
        <button class="modal-close" id="modalClose">&times;</button>
        <h2 id="modalTitle">Repo Name</h2>
        <p class="modal-desc" id="modalDesc">Description</p>
        <div class="modal-meta">
            <span id="modalLang">Language: N/A</span>
            <span id="modalStars">★ 0</span>
        </div>
        <div id="modalFileBrowser" class="modal-file-browser">
            <div id="modalFileList">Loading files...</div>
            <div id="modalFileContent" style="display:none;">
                <button id="modalBackBtn" class="back-btn">← Back to files</button>
                <div id="modalFileDisplay"></div>
            </div>
        </div>
        <div class="modal-actions">
            <a id="modalGitHubLink" href="#" target="_blank">View on GitHub →</a>
        </div>
    </div>
</div>

<script src="script.js"></script>
</body>
</html>''',

    "style.css": '''* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    background-color: #0a0a0a;
    color: #b3b3b3;
    font-family: 'Space Mono', 'Courier New', monospace;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 1rem;
}
.container {
    max-width: 1000px;
    width: 100%;
    background: #111111;
    padding: 2rem 2.5rem;
    border: 1px solid #1f8b4c;
    border-radius: 12px;
    box-shadow: 0 0 30px rgba(0, 255, 65, 0.05);
    transition: border-color 0.3s;
}
.container:hover { border-color: #33ff77; }
.nerd-header {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: #00ff41;
    letter-spacing: 4px;
    margin-bottom: 1.5rem;
    opacity: 0.7;
}
.nerd-header span { color: #33ff77; }
header {
    margin-bottom: 2.5rem;
    border-bottom: 1px dashed #1f8b4c;
    padding-bottom: 1.5rem;
}
#username {
    font-size: 2.8rem;
    font-weight: 700;
    color: #00ff41;
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
    letter-spacing: 2px;
    word-break: break-word;
}
.tagline {
    font-size: 1.1rem;
    color: #33ff77;
    margin: 0.25rem 0 0.5rem 0;
    opacity: 0.9;
}
.bio {
    font-size: 0.95rem;
    color: #b3b3b3;
    max-width: 650px;
    margin: 0.5rem 0 1rem 0;
    opacity: 0.85;
}
.social-links {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    margin-top: 0.75rem;
}
.social-links a {
    color: #00ff41;
    text-decoration: none;
    font-size: 0.9rem;
    border: 1px solid #1f8b4c;
    padding: 0.3rem 1rem;
    border-radius: 20px;
    transition: all 0.25s ease;
    background: rgba(0, 255, 65, 0.03);
}
.social-links a:hover {
    background: #00ff41;
    color: #0a0a0a;
    box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
    border-color: #00ff41;
}
.repos-section h2 {
    font-size: 1.8rem;
    color: #00ff41;
    margin-bottom: 1.5rem;
    letter-spacing: 1px;
    font-weight: 400;
}
.repo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.2rem;
}
.repo-card {
    background: #1a1a1a;
    border: 1px solid #1f8b4c;
    border-radius: 8px;
    padding: 1.2rem 1.2rem 1rem 1.2rem;
    transition: all 0.25s ease;
    display: flex;
    flex-direction: column;
    cursor: pointer;
}
.repo-card:hover {
    transform: translateY(-4px);
    border-color: #33ff77;
    box-shadow: 0 8px 25px rgba(0, 255, 65, 0.08);
    background: #1e1e1e;
}
.repo-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: #00ff41;
    text-decoration: none;
    word-break: break-word;
}
.repo-desc {
    font-size: 0.85rem;
    color: #b3b3b3;
    margin: 0.5rem 0 0.75rem 0;
    flex-grow: 1;
    opacity: 0.8;
    line-height: 1.4;
}
.repo-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #777;
    border-top: 1px solid #1f8b4c33;
    padding-top: 0.6rem;
    margin-top: auto;
}
.repo-lang { color: #33ff77; font-weight: 700; }
.repo-stars { color: #ffd700; }
.repo-stars::before { content: "★ "; color: #ffd700; }
footer {
    margin-top: 2.5rem;
    padding-top: 1.2rem;
    border-top: 1px dashed #1f8b4c;
    text-align: center;
    font-size: 0.85rem;
    color: #555;
}
.cursor-blink {
    display: inline-block;
    color: #00ff41;
    animation: blink 1.2s step-end infinite;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
@media (max-width: 600px) {
    .container { padding: 1.5rem; }
    #username { font-size: 2rem; }
    .repo-grid { grid-template-columns: 1fr; }
    .social-links { gap: 0.8rem; }
}

/* MODAL */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(4px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
}
.modal-overlay.active { display: flex; }
.modal {
    background: #1a1a1a;
    border: 1px solid #33ff77;
    border-radius: 12px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    padding: 2rem;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 0 50px rgba(0,255,65,0.1);
}
.modal-close {
    position: sticky;
    top: 0;
    float: right;
    background: none;
    border: none;
    color: #00ff41;
    font-size: 2rem;
    cursor: pointer;
    line-height: 1;
    transition: transform 0.2s;
}
.modal-close:hover { transform: rotate(90deg); }
.modal h2 {
    color: #00ff41;
    margin-bottom: 0.3rem;
    word-break: break-word;
}
.modal .modal-desc {
    color: #b3b3b3;
    margin: 0.3rem 0 0.8rem 0;
}
.modal .modal-meta {
    display: flex;
    gap: 1.5rem;
    font-size: 0.9rem;
    color: #777;
    margin-bottom: 1rem;
}
.modal .modal-meta span { color: #33ff77; }
.modal-file-browser {
    background: #0a0a0a;
    border-radius: 6px;
    padding: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
}
#modalFileList {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.file-item {
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    color: #b3b3b3;
    transition: 0.2s;
    display: flex;
    justify-content: space-between;
}
.file-item:hover { background: #1f8b4c33; color: #00ff41; }
.file-item.folder { color: #33ff77; }
.file-item .file-size { color: #555; font-size: 0.7rem; }
.back-btn {
    background: none;
    border: 1px solid #1f8b4c;
    color: #00ff41;
    padding: 0.2rem 0.8rem;
    border-radius: 12px;
    cursor: pointer;
    margin-bottom: 0.5rem;
    font-family: inherit;
}
.back-btn:hover { background: #00ff41; color: #0a0a0a; }
.modal-code {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.8rem;
    line-height: 1.5;
    color: #b3b3b3;
    padding: 0.5rem;
    background: #050505;
    border-radius: 4px;
    max-height: 350px;
    overflow-y: auto;
}
.modal-actions {
    margin-top: 1.2rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}
.modal-actions a {
    color: #00ff41;
    text-decoration: none;
    border: 1px solid #1f8b4c;
    padding: 0.4rem 1.2rem;
    border-radius: 20px;
    transition: 0.25s;
}
.modal-actions a:hover {
    background: #00ff41;
    color: #0a0a0a;
    box-shadow: 0 0 20px rgba(0,255,65,0.2);
}
.modal::-webkit-scrollbar { width: 6px; }
.modal::-webkit-scrollbar-track { background: #111; }
.modal::-webkit-scrollbar-thumb { background: #1f8b4c; border-radius: 4px; }

/* Markdown rendered content */
.markdown-body {
    color: #b3b3b3;
    font-family: 'Space Mono', monospace;
    background: #0a0a0a;
    padding: 0.5rem;
    border-radius: 4px;
    max-height: 350px;
    overflow-y: auto;
    font-size: 0.9rem;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
    color: #00ff41;
    margin: 0.5rem 0;
}
.markdown-body h1 { font-size: 1.5rem; }
.markdown-body h2 { font-size: 1.2rem; }
.markdown-body h3 { font-size: 1rem; }
.markdown-body p { margin: 0.5rem 0; }
.markdown-body ul, .markdown-body ol { padding-left: 1.5rem; }
.markdown-body code {
    background: #1a1a1a;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    color: #33ff77;
}
.markdown-body pre {
    background: #050505;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
}
.markdown-body pre code {
    background: none;
    color: #b3b3b3;
}
.markdown-body a {
    color: #00ff41;
    text-decoration: underline;
}
.markdown-body img { max-width: 100%; }
.markdown-body blockquote {
    border-left: 3px solid #1f8b4c;
    padding-left: 1rem;
    color: #777;
}''',

    "script.js": '''document.addEventListener('DOMContentLoaded', () => {
    const username = 'aaadarsh1337';
    const repoGrid = document.getElementById('repo-grid');

    // ===== CONFIGURATION =====
    const EXCLUDED_REPOS = ['aaadarsh1337.github.io', 'portfolio'];
    const SORT_ORDER = 'updated';
    const CUSTOM_ORDER = ['TryHackMe', 'certificates', 'oldCTFscripts'];
    // =========================

    // Modal elements
    const modal = document.getElementById('repoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalLang = document.getElementById('modalLang');
    const modalStars = document.getElementById('modalStars');
    const modalGitHubLink = document.getElementById('modalGitHubLink');
    const modalClose = document.getElementById('modalClose');
    const modalFileList = document.getElementById('modalFileList');
    const modalFileContent = document.getElementById('modalFileContent');
    const modalFileDisplay = document.getElementById('modalFileDisplay');
    const modalBackBtn = document.getElementById('modalBackBtn');

    let currentRepo = null;
    let currentPath = '';

    const closeModal = () => {
        modal.classList.remove('active');
        modalFileContent.style.display = 'none';
        modalFileList.style.display = 'block';
        currentPath = '';
        currentRepo = null;
    };
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    modalBackBtn.addEventListener('click', () => {
        modalFileContent.style.display = 'none';
        modalFileList.style.display = 'block';
        if (currentRepo) loadContents(currentRepo.name, currentPath);
    });

    // Fetch repos
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`)
        .then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); })
        .then(repos => {
            repos = repos.filter(repo => !EXCLUDED_REPOS.includes(repo.name));
            if (!repos || repos.length === 0) {
                repoGrid.innerHTML = '<p style="color:#555;grid-column:1/-1;text-align:center;">No public repos found.</p>';
                return;
            }

            if (SORT_ORDER === 'name') repos.sort((a,b) => a.name.localeCompare(b.name));
            else if (SORT_ORDER === 'stars') repos.sort((a,b) => b.stargazers_count - a.stargazers_count);
            else if (SORT_ORDER === 'custom') {
                const orderMap = {};
                CUSTOM_ORDER.forEach((name, idx) => orderMap[name] = idx);
                repos.sort((a,b) => (orderMap[a.name] ?? Infinity) - (orderMap[b.name] ?? Infinity));
            }

            repoGrid.innerHTML = '';
            repos.forEach(repo => {
                const card = document.createElement('div');
                card.className = 'repo-card';
                card.addEventListener('click', () => openModal(repo));

                const name = document.createElement('div');
                name.className = 'repo-name';
                name.textContent = repo.name;
                card.appendChild(name);

                const desc = document.createElement('p');
                desc.className = 'repo-desc';
                desc.textContent = repo.description || 'No description provided.';
                card.appendChild(desc);

                const meta = document.createElement('div');
                meta.className = 'repo-meta';
                const lang = document.createElement('span');
                lang.className = 'repo-lang';
                lang.textContent = repo.language || 'N/A';
                meta.appendChild(lang);
                const stars = document.createElement('span');
                stars.className = 'repo-stars';
                stars.textContent = repo.stargazers_count || 0;
                meta.appendChild(stars);
                card.appendChild(meta);

                repoGrid.appendChild(card);
            });
        })
        .catch(err => {
            console.error(err);
            repoGrid.innerHTML = '<p style="color:#ff6b6b;grid-column:1/-1;text-align:center;">⚠️ Failed to load repos.</p>';
        });

    async function openModal(repo) {
        currentRepo = repo;
        currentPath = '';
        modalTitle.textContent = repo.name;
        modalDesc.textContent = repo.description || 'No description provided.';
        modalLang.textContent = `Language: ${repo.language || 'N/A'}`;
        modalStars.textContent = `★ ${repo.stargazers_count || 0}`;
        modalGitHubLink.href = repo.html_url;
        modalFileContent.style.display = 'none';
        modalFileList.style.display = 'block';
        modalFileList.innerHTML = 'Loading files...';
        modal.classList.add('active');
        await loadContents(repo.name, '');
    }

    async function loadContents(repoName, path) {
        currentPath = path;
        try {
            const url = `https://api.github.com/repos/${username}/${repoName}/contents/${path}`;
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) {
                    modalFileList.innerHTML = '📭 This repository is empty.';
                } else {
                    modalFileList.innerHTML = `⚠️ Error ${res.status}: ${res.statusText}`;
                }
                return;
            }
            const items = await res.json();

            modalFileList.innerHTML = '';
            if (path !== '') {
                const parent = document.createElement('div');
                parent.className = 'file-item folder';
                parent.textContent = '📂 .. (parent)';
                parent.addEventListener('click', () => {
                    const parts = path.split('/');
                    parts.pop();
                    loadContents(repoName, parts.join('/'));
                });
                modalFileList.appendChild(parent);
            }

            const sorted = items.sort((a,b) => {
                if (a.type === 'dir' && b.type !== 'dir') return -1;
                if (a.type !== 'dir' && b.type === 'dir') return 1;
                return a.name.localeCompare(b.name);
            });

            for (const item of sorted) {
                const el = document.createElement('div');
                el.className = 'file-item' + (item.type === 'dir' ? ' folder' : '');
                const icon = item.type === 'dir' ? '📁' : '📄';
                const size = item.size ? ` (${(item.size/1024).toFixed(1)} KB)` : '';
                el.innerHTML = `<span>${icon} ${item.name}</span><span class="file-size">${size}</span>`;
                if (item.type === 'dir') {
                    el.addEventListener('click', () => loadContents(repoName, item.path));
                } else {
                    el.addEventListener('click', () => viewFile(repoName, item));
                }
                modalFileList.appendChild(el);
            }
        } catch (e) {
            console.error(e);
            modalFileList.innerHTML = '⚠️ Could not load files. Check console for details.';
        }
    }

    async function viewFile(repoName, fileItem) {
        const fileName = fileItem.name;
        const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown');

        modalFileList.style.display = 'none';
        modalFileContent.style.display = 'block';
        modalFileDisplay.innerHTML = '';

        if (isMarkdown) {
            modalFileDisplay.innerHTML = '<p style="color:#555;">Loading markdown...</p>';
            try {
                const rawUrl = `https://raw.githubusercontent.com/${username}/${repoName}/${fileItem.path}`;
                const res = await fetch(rawUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                // Render markdown using marked
                const html = marked.parse(text);
                const div = document.createElement('div');
                div.className = 'markdown-body';
                div.innerHTML = html;
                modalFileDisplay.innerHTML = '';
                modalFileDisplay.appendChild(div);
            } catch (e) {
                console.error(e);
                modalFileDisplay.innerHTML = `<p style="color:#ff6b6b;">⚠️ Could not load markdown.</p>`;
            }
        } else {
            modalFileDisplay.innerHTML = `
                <p style="color:#b3b3b3; padding:1rem 0;">
                    📄 <strong>${fileName}</strong> — preview not available for this file type.
                </p>
                <p style="color:#555; font-size:0.85rem;">
                    Use the button below to view the file on GitHub.
                </p>
            `;
        }
    }
});''',

    "README.md": '''# aaadarsh1337 Portfolio

This is my personal portfolio website, built with a nerdy terminal aesthetic and hosted on GitHub Pages.

## 🚀 Live Site
[https://aaadarsh1337.github.io](https://aaadarsh1337.github.io)

## 🛠️ Tech Stack
- HTML5
- CSS3 (Custom, dark theme)
- JavaScript (Vanilla, with GitHub API)
- [marked.js](https://marked.js.org/) for Markdown rendering.

## ✨ Features
- **File browser**: Click any repo to browse its files and folders.
- **Markdown preview**: Markdown files are rendered as HTML directly in the modal.
- **Other files**: Show a friendly message – click the bottom button to view on GitHub.
- **Exclude repos**: Hidden portfolio repo and others you specify.
- **Flexible sorting**: Sort by last updated, name, stars, or custom order.
- **Clean, responsive, hacker-themed**.
- **Social links**: GitHub, TryHackMe, PicoCTF.

## 📝 How to Customize
- Edit `index.html` (look for `<!-- ✏️ EDIT -->`).
- In `script.js`, adjust `EXCLUDED_REPOS`, `SORT_ORDER`, and `CUSTOM_ORDER`.
- Tweak colors in `style.css` (main green: `#00ff41`).

---
Built with 🖤 and too much caffeine.'''
}

for filename, content in files.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✅ Created {filename}')

print('\n🎉 All files ready! Open index.html or deploy to GitHub Pages.')