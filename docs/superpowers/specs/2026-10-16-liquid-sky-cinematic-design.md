# Liquid Sky — cinematic portfolio redesign (spec v2)

Date: 2026-10-16
Status: design approved in conversation; awaiting written-spec review
Supersedes the visual direction of `2026-10-16-goat-inspired-portfolio-design.md` (lemon/linen/khaki). That spec's structure, constraints and verification approach still apply unless changed here. Its implementation is already in the working tree and is the starting point.

## Goal

Turn the portfolio into an interactive, cinematic, recruiter-impressing single page: a liquid sky background that reacts to the cursor with ripples and trails, every section a scroll-driven full-screen chapter, GOAT-style storytelling and typography.

## Decisions already made (from the user)

- GOAT Figma file is reference only; never edited.
- **Palette: Sky + sun** (replaces lemon/linen/khaki).
- **Liquid background with ripple *and* trails** following the cursor; the site must feel interactive and creative.
- **Maximum cinematic**: every section is a pinned, scroll-driven chapter.
- **Remove**: LeetCode "Recently solved" list; all contest-history tables (LeetCode `#lc-contests`, Codeforces "All rated contests" `#cf-contests`, AtCoder "Contests" `#ac-contests`).
- **Keep**: LeetCode heatmap, badges, problems solved + difficulty bars, contest stats; rating charts; Codeforces difficulty chart; AtCoder stats; CodeChef; GitHub section unchanged in content.
- Fonts unchanged: Russo One (display) + Afacad (body), Google Fonts.
- Stack unchanged: vanilla HTML/CSS/JS, no build, no npm, vendored GSAP/ScrollTrigger/Lenis. `data.js` and `scripts/update_data.py` untouched.
- No git commits unless asked.

## 1. Palette (verified contrast)

| Token | Value | Use / contrast |
|---|---|---|
| `--sky` | `#8ECDF5` | Page background (liquid base colour) |
| `--cloud` | `#EAF6FD` | Data chapter surfaces |
| `--paper` | `#FFFFFF` | Panels holding platform-coloured text |
| `--midnight` | `#0B1B2E` | Text (10.1 on sky, 15.8 cloud, 17.4 white); dark bands |
| `--ink-2` | `#2E4A66` | Secondary text (5.3 sky, 8.4 cloud, 9.2 white) |
| `--sun` | `#FFD23F` | Accent fills; text only on midnight (12.0) |
| `--link` | `#0F4C9A` | Inline links / accent text on light (4.8 sky, 7.6 cloud) |
| `--line` | `rgba(11,27,46,.18)` | Hairlines |
| `--heat-0..4` | `#D6E6F0`, `#9FD3F3`, `#4FA8DE`, `#1F6FB2`, `#0B1B2E` | Heatmaps; "today" ring in `--sun` |

Rules: sun is never text on sky/cloud/white. Platform semantic colours (LeetCode difficulty, CF/AC ranks, up/down deltas) only appear on `--paper` panels (all ≥ 4.8 there). Liquid colours are only *lighter* than `--sky` (white, sun), so trails can never lower text contrast.

## 2. Liquid background (`liquid.js`, new file)

- One fixed, full-viewport `<canvas>` behind all content (`position:fixed; inset:0; z-index:-1; pointer-events:none`), `aria-hidden`.
- Hand-written WebGL (WebGL2, falling back to WebGL1 with `OES_texture_half_float` if needed). No library.
- **Trails**: stable-fluids simulation (advect velocity → splat from pointer delta → divergence → ~20 Jacobi pressure iterations → gradient subtract → advect dye). Dye colours: white and `--sun`, with slow dissipation (~0.97/frame dye, ~0.98 velocity).
- **Ripple**: the display pass renders a sky gradient with 3–4 soft drifting cloud blobs and offsets its UVs by the velocity field (refraction-like warp), plus a short-lived circular wave on click/tap ("splash").
- Sim resolution ~128 (velocity) / ~512 (dye) on the short edge; render DPR capped at 1.5.
- Pointer: mouse move and touch move drive splats; idle → gentle ambient auto-splat every few seconds so the page is alive without input.
- Pauses on `visibilitychange` hidden and when the tab is not focused for long; resumes on return.
- Fallbacks: `prefers-reduced-motion: reduce` → no canvas, static CSS sky gradient with clouds. No WebGL / shader compile failure → same static gradient, no console errors.
- Public interface: `window.Liquid = { splash(x, y, strength), setPaused(bool) }` — used by chapters (e.g. contact "LET'S TALK" hover, intro reveal).

## 3. Cinematic chapters

All scroll choreography uses GSAP ScrollTrigger (pin + scrub) inside the existing `main.js` motion path. Wide screens (> 860px) get pins; narrow screens get simpler in-view reveals (no pins except the intro); reduced motion and no-JS get the static stacked page.

| # | Chapter | Choreography |
|---|---|---|
| 00 | **Intro** | Loader (≤ 1.2 s, skipped on repeat visits in the same session): "GN" mark, then the name assembles letter by letter (letters rise with stagger and slight rotation) while a liquid splash fires behind it. |
| 01 | **Hero** | Pinned briefly: on scroll the name scales down and drifts up, lede/buttons fade, photo parallaxes; scroll cue hides. |
| 02 | **About** | Pinned: the statement's words fill from 20% to 100% opacity as you scroll (scrubbed); facts tiles rise at the end. |
| 03 | **Experience** | Pinned: the process line draws left→right with scroll; each dot fills and its role card steps up as the line reaches it. Vertical line on narrow screens. |
| 04 | **Projects** | Existing pinned horizontal track, plus 3D tilt (rotateY by velocity, perspective) and the "how it works" process line drawing per card as it enters. |
| 05 | **Coding** | Pinned "663 PROBLEMS SOLVED" hero number counting up while the year heatmap fills day by day (scrubbed); then badges fan in; then LeetCode, Codeforces, AtCoder, CodeChef panels each slide in as you continue. Contest tables and recent list removed. |
| 06 | **GitHub** | Calendar sweeps in column by column; stats count up; activity + repos lists reveal. |
| 07 | **Certifications** | Cards arrive as a stacked deck and spread into place (scrubbed); open-source badges and courses follow. |
| 08 | **Skills** | Two counter-scrolling marquee bands of skill names (scroll speeds them up), then the grouped list for readability. |
| 09 | **Contact** | Midnight band; giant "LET'S TALK" in sun; hovering the words fires liquid splashes; magnetic buttons. |

## 4. Interaction polish

- **Custom cursor** (pointer: fine only): small dot + trailing ring; ring grows and snaps around links/buttons; hidden on touch and under reduced motion. Native cursor remains for text inputs (none exist) and is restored if JS fails.
- **Magnetic buttons**: `.btn`, `.plat-cta` lean ≤ 8px toward the cursor.
- **Chapter rail**: the nav shows chapter numbers 01–09 as GOAT process dots with the active one filled; replaces the text links on wide screens, text links kept as accessible labels.
- **Text scramble** on hover for nav labels and project names (≤ 400 ms, respects reduced motion).

## 5. Content changes

- Remove from `index.html`: the LeetCode "Recently solved" block (`#lc-recent` and its `plat-note`), `#lc-contests` table wrap, the Codeforces "All rated contests" block (`#cf-contests`), the AtCoder "Contests" block (`#ac-contests`).
- Keep the LeetCode accepted-submissions-in-the-last-year sentence by moving it under the heatmap (it is a stat, not a list).
- `main.js`: calls that render into removed IDs already guard on missing elements (`if (!el) return`) — keep code paths safe; delete the now-unused `contestTable` calls and `lc-recent` rendering.
- The LeetCode year heatmap moves from under the hero into the Coding chapter.

## 6. Files

- `index.html` — palette-neutral markup changes above, `<canvas id="liquid">`, cursor elements, chapter rail, loader, `<script src="liquid.js">` before `main.js`.
- `styles.css` — tokens replaced with the sky palette; section surfaces: chapters transparent over the liquid, data panels cloud/white, bands midnight.
- `liquid.js` — new, the WebGL liquid (self-contained, ~400 lines).
- `main.js` — chapter choreography, cursor, magnetic buttons, rail, scramble; chart colours re-pointed to the new palette.
- Not touched: `data.js`, `scripts/`, `vendor/`, `assets/`.

## 7. Performance & accessibility budgets

- 60 fps target on a mid laptop; liquid frame ≤ 4 ms GPU at 1440×900; total JS added ≤ 25 KB unminified beyond existing.
- No layout shift from the loader; content is in the DOM from first paint (loader is an overlay).
- Lighthouse (desktop) Performance ≥ 85, Accessibility ≥ 95.
- All text pairs WCAG AA; focus visible on every interactive element; pinned sections never trap keyboard focus; reduced-motion and no-JS show every piece of content.

## 8. Verification

Same harness as before (local server + Playwright): overflow = 0 at 1440/768/390; console clean (including with WebGL disabled); contrast sweep 0 fails (sampled over the liquid with trails active); reduced-motion and JS-off screenshots complete; pins tested at 1366×768 and 1440×900; liquid pauses when hidden (rAF count stops); Lighthouse run via Chrome DevTools MCP.

## 9. Figma (after code sign-off)

Unchanged in shape from spec v1: new file "Gaurrov Portfolio" with sky palette variables, text styles, components and desktop/mobile screens. The liquid is represented as a static gradient frame plus an annotation.

## Out of scope

- Editing the GOAT file; new data sources; build tooling; sound; 3D models.
