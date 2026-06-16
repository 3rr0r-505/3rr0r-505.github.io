
// ── Load posts.json and render ──
let allPosts = [];
let activeFilter = 'ALL';

async function loadPosts() {
    try {
        const res = await fetch('posts.json');
        allPosts = await res.json();
        // Sort by date descending
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateStats();
        renderPosts(allPosts);
        if (window._onPostsLoaded) window._onPostsLoaded();
    } catch(e) {
        document.getElementById('posts-grid').innerHTML =
            `<div class="no-posts"><span>[</span> no posts found. run gen.py to generate posts.json <span>]</span></div>`;
            if (window._onPostsLoaded) window._onPostsLoaded();
    }
}

// ── Boot overlay sequence ──
(function bootSequence() {
    const lines    = document.querySelectorAll('.boot-line');
    const overlay  = document.getElementById('boot-overlay');
    document.getElementById('cursor').style.display = 'none';
    document.getElementById('cursor-dot').style.display = 'none';
    const delays   = [0, 500, 1000, 1500, 2100];
    const total    = 2200; // ms before overlay lifts

    lines.forEach((line, i) => {
        setTimeout(() => line.classList.add('visible'), delays[i]);
    });

    // Wait for both: sequence done AND posts loaded
    let sequenceDone = false;
    let postsDone    = false;

    function tryLift() {
        if (!sequenceDone || !postsDone) return;
        document.getElementById('cursor').style.display = '';
        document.getElementById('cursor-dot').style.display = '';
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 650);
    }

    setTimeout(() => { sequenceDone = true; tryLift(); }, total);

    // Hook into loadPosts completion
    window._onPostsLoaded = () => { postsDone = true; tryLift(); };
})();

function updateStats() {
    animCount(document.getElementById('stat-total'), allPosts.length);
    animCount(document.getElementById('stat-thm'),   allPosts.filter(p => p.platform === 'THM').length);
    animCount(document.getElementById('stat-htb'),   allPosts.filter(p => p.platform === 'HTB').length);
}

function animCount(el, target) {
    if (!el || target === 0) { if(el) el.textContent = '0'; return; }
    const start = performance.now();
    const run = now => {
        const p = Math.min((now - start) / 800, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(e * target);
        if (p < 1) requestAnimationFrame(run);
        else el.textContent = target;
    };
    requestAnimationFrame(run);
}

function renderPosts(posts) {
    const grid = document.getElementById('posts-grid');

    if (posts.length === 0) {
        grid.innerHTML = `<div class="no-posts"><span>[</span> no results found <span>]</span></div>`;
        return;
    }

    grid.innerHTML = posts.map((p, i) => {
        const diffClass = p.difficulty || 'Easy';
        const platform  = p.platform  || 'OTHER';
        const date      = new Date(p.date).toLocaleDateString('en-GB', {
            day:'2-digit', month:'short', year:'numeric'
        }).toUpperCase();

        return `
        <a class="post-card" href="/blog/posts/?p=${encodeURIComponent(p.path)}"
            style="transition-delay:${Math.min(i * 0.07, 0.5)}s">
            <div class="post-platform ${platform}">${platform}</div>
            <div class="post-date">${date}</div>
            <div class="post-title">${p.title}</div>
            <div class="post-desc">${p.description || ''}</div>
            <div class="post-footer">
                <span class="post-read">READ_MORE ↗</span>
                ${p.difficulty ? `<span class="post-diff ${diffClass}">● ${diffClass.toUpperCase()}</span>` : ''}
            </div>
        </a>`;
    }).join('');

    // Stagger reveal
    requestAnimationFrame(() => {
        grid.querySelectorAll('.post-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('visible'), Math.min(i * 70, 500));
        });
        if (typeof updateScrollbar === 'function') updateScrollbar();
    });

    // Re-attach cursor expand to new cards
    grid.querySelectorAll('.post-card').forEach(el => {
        el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('big'));
        el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('big'));
    });
}

// ── Filter ──
document.getElementById('filter-bar').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilters();
});

// ── Search ──
document.getElementById('search-input').addEventListener('input', applyFilters);

function applyFilters() {
    const q = document.getElementById('search-input').value.toLowerCase().trim();
    let filtered = allPosts;
    if (activeFilter !== 'ALL') filtered = filtered.filter(p => p.platform === activeFilter);
    if (q) filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
    renderPosts(filtered);
}

loadPosts();
