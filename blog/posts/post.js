// ── Get post path from URL param ──
const params   = new URLSearchParams(window.location.search);
const postPath = params.get('p');

if (!postPath) {
    window.location.href = '/blog/';
}

// ── Configure marked ──
marked.setOptions({
    breaks: true,
    gfm: true,
});

function resolveAssetPaths(html, mdPath) {
    const folder = '/' + mdPath.substring(0, mdPath.lastIndexOf('/') + 1);
    // folder = /blog/_posts/2026-03-04-RootMe/
    return html.replace(/(src=["'])(?!http|\/\/|data:|\/)(.*?)(["'])/g, (match, p1, p2, p3) => {
        return `${p1}${folder}${p2}${p3}`;
    });
}

// ── Strip YAML frontmatter ──
function stripFrontmatter(text) {
    const fm = text.match(/^---[\r\n]([\s\S]*?)[\r\n]---[\r\n]?/);
    if (!fm) return { body: text, meta: {} };
    const raw  = fm[1];
    const body = text.slice(fm[0].length);
    const meta = {};
    raw.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        meta[key] = val;
    });
    return { body, meta };
}

// ── Build TOC from headings ──
function buildTOC(container) {
    const headings = container.querySelectorAll('h1, h2, h3');
    if (headings.length < 2) return;
    const tocList = document.getElementById('toc-list');
    const sidebar = document.getElementById('toc-sidebar');
    tocList.innerHTML = '';
    headings.forEach((h, i) => {
        const id = 'heading-' + i;
        h.id = id;
        const li = document.createElement('li');
        const a  = document.createElement('a');
        // Clean up the ::before pseudo text prefixes from display
        a.textContent = h.textContent.replace(/^\/\/\s*|^>\s*/,'').trim();
        a.dataset.id  = id;
        if (h.tagName === 'H3') a.classList.add('toc-h3');
        // Smooth scroll to heading on click — offset for fixed nav
        a.addEventListener('click', e => {
            e.preventDefault();
            const target = document.getElementById(id);
            if (!target) return;
            const navHeight = document.querySelector('nav')?.offsetHeight || 72;
            const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
            window.scrollTo({ top, behavior: 'smooth' });
        });
        li.appendChild(a);
        tocList.appendChild(li);
    });

    sidebar.style.display = 'block';

    // Active TOC highlight on scroll
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                tocList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                const active = tocList.querySelector(`a[data-id="${entry.target.id}"]`);
                if (active) active.classList.add('active');
            }
        });
    }, { rootMargin: '-10% 0px -80% 0px' });

    headings.forEach(h => observer.observe(h));
}

// ── Add copy buttons to code blocks ──
function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
        const btn = document.createElement('button');
        btn.className   = 'copy-btn';
        btn.textContent = 'COPY';
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code');
            navigator.clipboard.writeText(code ? code.textContent : pre.textContent).then(() => {
                btn.textContent = 'COPIED';
                btn.classList.add('copied');
                setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('copied'); }, 1800);
            });
        });
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        pre.style.position = 'static';
        wrapper.appendChild(btn);
    });
}

// ── Populate hero metadata ──
function populateHero(meta, path) {
    document.title = `5pyd3r // ${meta.title || 'Post'}`;

    const titleEl = document.getElementById('post-hero-title');
    const descEl  = document.getElementById('post-hero-desc');
    const metaRow = document.getElementById('post-meta-row');

    titleEl.textContent = meta.title || path;

    if (meta.description) descEl.textContent = meta.description;

    const platform = (meta.platform || 'OTHER').toUpperCase();
    const date     = meta.date
        ? new Date(meta.date).toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}).toUpperCase()
        : '';
    const diff     = meta.difficulty || '';

    let metaHTML = `<span class="post-platform-badge ${platform}">${platform}</span>`;
    if (date) metaHTML += `<span class="post-hero-date">${date}</span>`;
    if (diff) metaHTML += `<span class="post-difficulty ${diff}">● ${diff.toUpperCase()}</span>`;
    metaRow.innerHTML = metaHTML;
}

// ── Load prev/next from posts.json ──
async function loadPrevNext(currentPath) {
    try {
        const res   = await fetch('/blog/posts.json');
        const posts = await res.json();
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const idx   = posts.findIndex(p => p.path === currentPath);
        if (idx === -1) return;
    
        document.getElementById('post-nav').style.display = 'flex';

        if (idx < posts.length - 1) {
            const prev = posts[idx + 1];
            const btn  = document.getElementById('prev-btn');
            btn.style.display   = 'block';
            btn.href            = `/blog/posts/?p=${encodeURIComponent(prev.path)}`;
            document.getElementById('prev-title').textContent = prev.title;
        }
        if (idx > 0) {
            const next = posts[idx - 1];
            const btn  = document.getElementById('next-btn');
            btn.style.display   = 'block';
            btn.href            = `/blog/posts/?p=${encodeURIComponent(next.path)}`;
            document.getElementById('next-title').textContent = next.title;
        }
    } catch(e) { /* silent fail */ }
}

// ── Main: fetch and render the markdown ──
async function loadPost() {
    // Block absolute URLs and path traversal attempts
    if (!postPath || 
        postPath.startsWith('http') || 
        postPath.includes('../') || 
        postPath.includes('..\\') ||
        !postPath.startsWith('blog/_posts/')) {
        window.location.href = '/blog/';
    }
    const loading = document.getElementById('post-loading');
    const mdBody  = document.getElementById('md-body');

    try {
        const res = await fetch('/' + postPath);
        if (!res.ok) throw new Error('not found');
        const raw = await res.text();

        const { body, meta } = stripFrontmatter(raw);

        populateHero(meta, postPath);

        // Render markdown
        let html = marked.parse(body);

        // Fix asset paths for folder-based posts
        html = resolveAssetPaths(html, postPath);

        mdBody.innerHTML = DOMPurify.sanitize(html);

        addCopyButtons(mdBody);
        buildTOC(mdBody);

        loading.style.display = 'none';
        mdBody.style.display  = 'block';

        // Bug fix: recalculate scrollbar after content renders
        if (typeof updateScrollbar === 'function') {
            updateScrollbar();
            // recalculate after images load
            document.querySelectorAll('.md-body img').forEach(img => {
                img.addEventListener('load', updateScrollbar);
            });
        }

        loadPrevNext(postPath);

        // Re-attach cursor expand to links in post
        mdBody.querySelectorAll('a').forEach(el => {
            el.addEventListener('mouseenter', () => document.getElementById('cursor')?.classList.add('big'));
            el.addEventListener('mouseleave', () => document.getElementById('cursor')?.classList.remove('big'));
        });

    } catch(e) {
        loading.style.display = 'none';
        mdBody.innerHTML = `<div class="post-error">[ERROR] could not load writeup: <span class="post-error-path"></span><br/>make sure the file exists in _posts/</div>`;
        const errorPathEl = mdBody.querySelector('.post-error-path');
        if (errorPathEl) {
            errorPathEl.textContent = postPath || '';
        }
        mdBody.style.display = 'block';
    }
}

loadPost();
