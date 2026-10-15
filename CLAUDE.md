# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal portfolio built with vanilla HTML, CSS, and JS. No framework, no build step, no package manager, no bundler. Third-party libraries (GSAP, ScrollTrigger, Lenis) are vendored in `vendor/` and loaded locally — do not add npm/package tooling.

## Running it

Serve the folder (closest to hosted behavior):

```
python -m http.server 5500
```

Then open http://127.0.0.1:5500. Opening `index.html` directly also works. The only network dependency is the Bricolage Grotesque font from Google Fonts; offline it falls back to Segoe UI.

## Where things live

- `index.html` — all page content. Edit text, projects, and the CERTIFICATIONS & ACHIEVEMENTS section here.
- `styles.css` — colours, type, layout. Design tokens are at the top of the file.
- `main.js` — fills in stats, draws heatmaps, runs animations.
- `data.js` — **generated; do not edit by hand.** Regenerate with `python scripts/update_data.py`.
- `scripts/update_data.py` — refreshes `data.js` (and LeetCode badge images in `assets/lc-badges/`). Standard-library Python 3 only — no pip install needed. To change a handle, edit `HANDLES` at the top. If a site is unreachable it keeps the last good numbers.

## Git gotcha

This folder is **not** its own git repository. The tracked repo is the user's home directory, and its `origin` remote points at an unrelated project. Scope any `git add` to files under this folder, and do not assume commits/pushes here relate to this portfolio.
