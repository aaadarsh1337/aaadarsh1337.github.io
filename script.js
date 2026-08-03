document.addEventListener('DOMContentLoaded', () => {
    const username = 'aaadarsh1337';
    const repoGrid = document.getElementById('repo-grid');
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`)
        .then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); })
        .then(repos => {
            if (!repos || repos.length === 0) { repoGrid.innerHTML = '<p style="color:#555;grid-column:1/-1;text-align:center;">No public repos found.</p>'; return; }
            repoGrid.innerHTML = '';
            repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            repos.forEach(repo => {
                const card = document.createElement('div');
                card.className = 'repo-card';
                const nameLink = document.createElement('a');
                nameLink.href = repo.html_url;
                nameLink.target = '_blank';
                nameLink.className = 'repo-name';
                nameLink.textContent = repo.name;
                card.appendChild(nameLink);
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
});