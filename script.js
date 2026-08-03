document.addEventListener('DOMContentLoaded', () => {
    const username = 'aaadarsh1337';
    const repoGrid = document.getElementById('repo-grid');
    // Exclude the portfolio repo itself (and any others you want to hide)
    const EXCLUDED_REPOS = ['aaadarsh1337.github.io']; // add more if needed

    // Modal elements
    const modal = document.getElementById('repoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalLang = document.getElementById('modalLang');
    const modalStars = document.getElementById('modalStars');
    const modalReadme = document.getElementById('modalReadme');
    const modalGitHubLink = document.getElementById('modalGitHubLink');
    const modalClose = document.getElementById('modalClose');

    // Close modal
    const closeModal = () => modal.classList.remove('active');
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Fetch repos
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`)
        .then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); })
        .then(repos => {
            // Filter out excluded repos
            repos = repos.filter(repo => !EXCLUDED_REPOS.includes(repo.name));
            if (!repos || repos.length === 0) {
                repoGrid.innerHTML = '<p style="color:#555;grid-column:1/-1;text-align:center;">No public repos found.</p>';
                return;
            }
            repoGrid.innerHTML = '';
            repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            repos.forEach(repo => {
                const card = document.createElement('div');
                card.className = 'repo-card';
                // Click to open modal
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
            repoGrid.innerHTML = '<p style="color:#ff6b6b;grid-column:1/-1;text-align:center;">⚠️ Failed to load repos. Try again later.</p>';
        });

    // ===== Open Modal and fetch README =====
    async function openModal(repo) {
        modalTitle.textContent = repo.name;
        modalDesc.textContent = repo.description || 'No description provided.';
        modalLang.textContent = `Language: ${repo.language || 'N/A'}`;
        modalStars.textContent = `★ ${repo.stargazers_count || 0}`;
        modalGitHubLink.href = repo.html_url;
        modalReadme.textContent = 'Loading README...';
        modal.classList.add('active');

        try {
            // Fetch README from GitHub API
            const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`);
            if (!readmeRes.ok) {
                modalReadme.textContent = 'No README available.';
                return;
            }
            const data = await readmeRes.json();
            // Decode base64 content
            const content = atob(data.content);
            // Render as plain text (or you can use a markdown parser)
            modalReadme.textContent = content;
        } catch (e) {
            modalReadme.textContent = 'Could not load README.';
        }
    }
});