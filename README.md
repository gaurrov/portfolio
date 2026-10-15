# Gaurrov S Narayanan — Portfolio

A single-page portfolio that runs entirely on your machine. No build step, no hosting.

## Open it

Double-click `index.html`, or serve the folder (smoother, and closest to how it will behave once hosted):

```
cd portfolio
python -m http.server 5500
```

Then visit http://127.0.0.1:5500.

The only thing it loads from the internet is the Bricolage Grotesque font from Google Fonts. Offline, it falls back to Segoe UI.

## Refresh your stats

Everything in the competitive programming and GitHub sections lives in `data.js`, a snapshot the page reads at load time. That covers LeetCode stats, badges, contests and recent solves; Codeforces and AtCoder ratings and full contest history; CodeChef solves; and GitHub contributions, recent activity and repositories. LeetCode badge images are saved to `assets/lc-badges/`. To update everything:

```
python scripts/update_data.py
```

If a site is unreachable, the script keeps the last good numbers for that site.

**Codeforces:** to change the handle, edit `HANDLES["codeforces"]` at the top of `scripts/update_data.py` and rerun it. Handle is set to `gaurrov2007`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | All page content. Edit text and projects here. |
| `styles.css` | Colours, type and layout. Tokens are at the top. |
| `main.js` | Fills in stats, draws the heatmaps, runs the animations. |
| `data.js` | Generated stats snapshot. Don't edit by hand. |
| `scripts/update_data.py` | Refreshes `data.js`. |
| `vendor/` | GSAP, ScrollTrigger and Lenis, stored locally. |
| `assets/` | Photo, résumé PDF, LeetCode badges (`lc-badges/`) and certificate badges (`certs/`). |

## Certifications

Certifications, achievements, open source badges and courses are written directly in `index.html`, in the section marked `CERTIFICATIONS & ACHIEVEMENTS`. Badge images are in `assets/certs/`.

## Motion

- On load: the name rises into place and a year of LeetCode activity fills in day by day.
- Projects slide sideways as you scroll down. On screens narrower than 860px they stack vertically instead.
- Sections fade up as they enter, and counters and difficulty bars animate in.
- With "reduce motion" turned on in the OS, all animation is skipped and everything shows immediately.

## When you get a domain

Upload the whole folder as-is to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
