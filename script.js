/*  ============================================================
        5pyd3r // Red Team Portfolio
        Author  : 5pyd3r (Samrat Dey)
        GitHub  : https://github.com/3rr0r-505
        Version : 2.1 — null-guarded for blog pages

        CTRL+F QUICK-INDEX
        ──────────────────────
        [JS:SCROLLBAR]  — Custom DOM scrollbar thumb + drag logic
        [JS:CURSOR]     — Mouse tracking + hover expand
        [JS:EMAIL]      — Runtime email assembly to prevent bot scraping
        [JS:REVEAL]     — Scroll-triggered reveal (IntersectionObserver)
        [JS:SKILLBARS]  — Skill bar fill animation on scroll
        [JS:STAGGER]    — Card stagger delay on grid items
        [JS:COUNTER]    — Animated number counter (hero stats)
        [JS:PARTICLES]  — Canvas particle + connection line system
        ============================================================ */

    /* ─────────────────────────────────────────────────────────
    [JS:SCROLLBAR] — Custom DOM scrollbar thumb updater
    ───────────────────────────────────────────────────────── */
    const track = document.getElementById('scrollbar-track');
    const thumb  = document.getElementById('scrollbar-thumb');

    function updateScrollbar() {
        if (!track || !thumb) return;
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        const trackHeight   = track.offsetHeight;
        const thumbHeight   = Math.max(28, (window.innerHeight / document.body.scrollHeight) * trackHeight);
        const thumbTop      = scrollPercent * (trackHeight - thumbHeight);
        thumb.style.height  = thumbHeight + 'px';
        thumb.style.top     = thumbTop + 'px';
    }

    window.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);
    updateScrollbar();

    /* Drag logic */
    let isDragging   = false;
    let dragStartY   = 0;
    let dragStartScrollY = 0;

    if (thumb) {
        thumb.addEventListener('mousedown', e => {
            isDragging       = true;
            dragStartY       = e.clientY;
            dragStartScrollY = window.scrollY;
            e.preventDefault();
        });
    }

    document.addEventListener('mousemove', e => {
        if (!isDragging || !track || !thumb) return;
        const trackHeight = track.offsetHeight;
        const thumbHeight = Math.max(28, (window.innerHeight / document.body.scrollHeight) * trackHeight);
        const scrollable  = trackHeight - thumbHeight;
        const pageDelta   = (e.clientY - dragStartY) / scrollable * (document.body.scrollHeight - window.innerHeight);
        window.scrollTo(0, dragStartScrollY + pageDelta);
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    /* ─────────────────────────────────────────────────────────
        [JS:CURSOR] — Mouse tracking + hover expand
    ───────────────────────────────────────────────────────── */
    const cursor = document.getElementById('cursor');
    const dot    = document.getElementById('cursor-dot');

    if (cursor && dot) {
        document.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top  = e.clientY + 'px';
            dot.style.left    = e.clientX + 'px';
            dot.style.top     = e.clientY + 'px';
        });

        document.querySelectorAll('a, button, .cert-card, .proj-card, .skill-tag, .ctf-platform, .skill-cat, #scrollbar-thumb').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('big'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
        });
    }

    /* ─────────────────────────────────────────────────────────
        [JS:EMAIL] — Runtime email assembly
    ───────────────────────────────────────────────────────── */
    const emailLink    = document.getElementById('email-link');
    const emailDisplay = document.getElementById('email-display');

    if (emailLink && emailDisplay) {
        const e     = ['samratdey', '.career', '@', 'gmail', '.com'];
        const email = e.join('');
        emailLink.href             = 'mailto:' + email;
        emailDisplay.textContent   = email;
    }

    /* ─────────────────────────────────────────────────────────
        [JS:REVEAL] — Scroll-triggered section reveal
    ───────────────────────────────────────────────────────── */
    const ro = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('visible');
        }),
        { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => ro.observe(el));

    /* ─────────────────────────────────────────────────────────
        [JS:SKILLBARS] — Skill bar fill animation on scroll
    ───────────────────────────────────────────────────────── */
    const bo = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.querySelectorAll('.skill-bar-fill').forEach(f => f.classList.add('animate'));
            }
        }),
        { threshold: 0.3 }
    );
    document.querySelectorAll('.skill-bar').forEach(el => bo.observe(el));

    /* ─────────────────────────────────────────────────────────
        [JS:STAGGER] — Card entrance stagger delay
    ───────────────────────────────────────────────────────── */
    document.querySelectorAll('.skills-grid, .projects-grid, .certs-grid, .ctf-grid').forEach(grid =>
        grid.querySelectorAll('.reveal').forEach((el, i) =>
            el.style.transitionDelay = (i * 0.1) + 's'
        )
    );

    /* ─────────────────────────────────────────────────────────
        [JS:COUNTER] — Animated number counter (hero stats)
    ───────────────────────────────────────────────────────── */
    function animateCounter(el) {
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix;
        const start  = performance.now();

        const run = now => {
            const p = Math.min((now - start) / 1600, 1);
            const e = 1 - Math.pow(1 - p, 3);
            const v = Math.floor(e * target);

            el.textContent = suffix === 'cgpa'
                ? (v / 100).toFixed(2)
                : v + (p >= 1 && target > 0 && el.dataset.noplus === undefined && suffix !== 'cgpa' ? '+' : '');

            if (p < 1) requestAnimationFrame(run);
        };

        requestAnimationFrame(run);
    }

    const co = new IntersectionObserver(
        entries => entries.forEach(e => {
            if (e.isIntersecting) {
                animateCounter(e.target);
                co.unobserve(e.target);
            }
        }),
        { threshold: 0.5 }
    );
    document.querySelectorAll('[data-count]').forEach(el => co.observe(el));

    /* ─────────────────────────────────────────────────────────
        [JS:PARTICLES] — Canvas particle system (hero background)
    ───────────────────────────────────────────────────────── */
    const canvas = document.getElementById('particles');

    if (canvas) {
        const ctx = canvas.getContext('2d');
        let W, H, pts = [];

        function resize() {
            W = canvas.width  = canvas.parentElement.offsetWidth;
            H = canvas.height = canvas.parentElement.offsetHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        class P {
            constructor() { this.reset(); }

            reset() {
                this.x  = Math.random() * W;
                this.y  = Math.random() * H;
                this.sz = Math.random() * 1.5 + 0.3;
                this.vx = (Math.random() - .5) * .35;
                this.vy = (Math.random() - .5) * .35;
                this.o  = Math.random() * .5 + .1;
                this.c  = Math.random() > .7 ? '#ff003c' : '#00ffe7';
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.sz, 0, Math.PI * 2);
                ctx.fillStyle   = this.c;
                ctx.globalAlpha = this.o;
                ctx.fill();
            }
        }

        for (let i = 0; i < 80; i++) pts.push(new P());

        (function loop() {
            ctx.clearRect(0, 0, W, H);
            ctx.globalAlpha = 1;

            pts.forEach((p, i) => {
                pts.slice(i + 1).forEach(q => {
                    const d = Math.hypot(p.x - q.x, p.y - q.y);
                    if (d < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle  = '#00ffe7';
                        ctx.globalAlpha  = (1 - d / 100) * .07;
                        ctx.lineWidth    = .5;
                        ctx.stroke();
                    }
                });
                p.update();
                p.draw();
            });

            requestAnimationFrame(loop);
        })();
    }