document.addEventListener('DOMContentLoaded', () => {
    const username = 'aaadarsh1337';
    const repoGrid = document.getElementById('repo-grid');

    // ===== CONFIGURATION =====
    const EXCLUDED_REPOS = ['aaadarsh1337.github.io'];
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
    };
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Back button: re-show file list and reload current directory
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

    // Open modal and load root contents
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

    // Load directory contents
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

    // View file: only markdown is displayed; others get a "view on GitHub" link.
    async function viewFile(repoName, fileItem) {
        const fileName = fileItem.name;
        const isMarkdown = fileName.endsWith('.md') || fileName.endsWith('.markdown');

        modalFileList.style.display = 'none';
        modalFileContent.style.display = 'block';
        modalFileDisplay.innerHTML = '';

        if (isMarkdown) {
            // Fetch and display markdown content
            modalFileDisplay.innerHTML = '<p style="color:#555;">Loading markdown...</p>';
            try {
                const rawUrl = `https://raw.githubusercontent.com/${username}/${repoName}/${fileItem.path}`;
                const res = await fetch(rawUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                // Simple plain text display (you can later add a markdown renderer)
                const pre = document.createElement('pre');
                pre.className = 'modal-code';
                pre.textContent = text;
                modalFileDisplay.innerHTML = '';
                modalFileDisplay.appendChild(pre);
            } catch (e) {
                modalFileDisplay.innerHTML = `<p style="color:#ff6b6b;">⚠️ Could not load markdown. <a href="https://github.com/${username}/${repoName}/blob/main/${fileItem.path}" target="_blank" style="color:#00ff41;">View on GitHub</a></p>`;
            }
        } else {
            // Non-markdown: show a message with a direct link
            modalFileDisplay.innerHTML = `
                <p style="color:#b3b3b3; padding:1rem 0;">
                    📄 <strong>${fileName}</strong> — preview not available for this file type.
                </p>
                <p>
                    <a href="https://github.com/${username}/${repoName}/blob/main/${fileItem.path}" target="_blank" style="color:#00ff41; border:1px solid #1f8b4c; padding:0.3rem 1rem; border-radius:20px; text-decoration:none;">
                        View on GitHub →
                    </a>
                </p>
            `;
        }
    }
});