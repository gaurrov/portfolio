# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal portfolio built with vanilla HTML, CSS, and JS. No framework, no build step, no package manager, no bundler. Third-party libraries (GSAP, ScrollTrigger, Lenis) are vendored in `vendor/` and loaded locally — do not add npm/package tooling.

Live at **https://gaurrov.vercel.app** (see Deploying).

## Running it

Serve the folder (closest to hosted behavior):

```
python -m http.server 5500
```

Then open http://127.0.0.1:5500. Opening `index.html` directly also works. The only network dependency is the Russo One (display) and Afacad (body) fonts from Google Fonts; offline they fall back to Impact/Arial Black and Segoe UI.

## Where things live

- `index.html` — all page content. Edit text, projects, and the CERTIFICATIONS & ACHIEVEMENTS section here. Script order matters: `data.js`, vendor, `liquid.js`, `cinema.js`, `main.js`. The `<head>` holds the Open Graph / Twitter link-preview tags (absolute `gaurrov.vercel.app` URLs).
- `styles.css` — colours, type, layout. Design tokens (sky + sun palette) are at the top of the file.
- `main.js` — fills in stats, draws heatmaps and charts, section reveals. Calls `Cinema.init()` when motion is allowed.
- `cinema.js` — the scroll-driven chapters (pins, scrubs), intro loader, custom cursor and pointer interactions. Skipped under `prefers-reduced-motion`.
- `liquid.js` — the WebGL fluid sky behind the page (`window.Liquid`). Falls back to a CSS gradient without WebGL or with reduced motion.
- `data.js` — **generated; do not edit by hand.** Regenerate with `python scripts/update_data.py`.
- `scripts/update_data.py` — refreshes `data.js` (and LeetCode badge images in `assets/lc-badges/`). Standard-library Python 3 only — no pip install needed. To change a handle, edit `HANDLES` at the top. If a site is unreachable it keeps the last good numbers.
- `assets/` — portraits (`gaurrov-hero.*` in the hero arch, `gaurrov-devfest.*` in About; WebP with JPG fallback), `og-card.jpg` (1200×630 link-preview card made from the hero portrait — remake it if the photo or headline changes), the résumé PDF, and cert/badge images.
- `docs/superpowers/` — design specs and plans. Not deployed.

## Git

This folder is its own git repository: `origin` is https://github.com/gaurrov/portfolio, branch `main`.

## Deploying

The site is the Vercel project `gaurrov`, connected to the GitHub repo: **every push to `main` deploys to production** in a few seconds. `vercel deploy --prod --yes` from this folder also deploys directly (CLI is installed globally; `.vercel/` holds the local link).

- `.vercelignore` keeps `docs/`, `scripts/`, `CLAUDE.md`, `README.md`, `.superpowers/`, `.env*` and `.vercel/` off the public site. Add new private files there.
- `.env.local` (written by `vercel link`) holds a Vercel OIDC token. It is gitignored — never commit or deploy it.
- After changing the preview tags or `og-card.jpg`, refresh LinkedIn's cached preview with the Post Inspector (https://www.linkedin.com/post-inspector/).
