<div align="center">

# me.5pyd3r.org — Site Info

![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=F38020)
![Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=F7DF1E)
![DNSSEC](https://img.shields.io/badge/DNSSEC-Enabled-00B4D8?logo=cloudflare&logoColor=F38020)

</div>

Personal portfolio site built with vanilla HTML/CSS/JS, deployed via Cloudflare Pages.

- **Live Site:** [me.5pyd3r.org](https://me.5pyd3r.org)
- **GitHub mirror:** [3rr0r-505/3rr0r-505.github.io](https://github.com/3rr0r-505/3rr0r-505.github.io)
- **GitLab mirror:** [3rr0r-505/Portfolio](https://gitlab.com/3rr0r-505/portfolio)

## Stack
- **Frontend:** Vanilla HTML/CSS/JS — no frameworks, no build tools
- **Hosting:** Cloudflare Pages
- **DNS:** Cloudflare (DNSSEC enabled)
- **SSL:** Full Strict + HSTS
- **CI/CD:** GitHub Actions

## Structure
- `assets/` — fonts, icons, certs, curriculum vitae
- `blog/` — posts, drafts, and blog index
- `.github/` — workflows and Dependabot config
- `backup/` — font zip archives

## Security
- Security headers enforced via Cloudflare
- Dependency updates automated via Dependabot
- Branch protection on `main`
- CodeQL + OSSF Scorecards enabled
- [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure