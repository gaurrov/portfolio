# GOAT-inspired portfolio redesign — design spec

Date: 2026-10-16
Status: approved in conversation, awaiting written-spec review

## Goal

Restyle the personal portfolio (vanilla HTML/CSS/JS in this folder) using the visual language of the "GOAT New" Figma file as inspiration, and produce a matching, editable design in a new Figma file.

## Decisions already made

- **GOAT Figma file (`rFgMCMkdTnnjWiUYwZjaSk`) is read-only.** It is a style source only. Nothing in it is edited, and GOAT is not mentioned or showcased on the site.
- **Direction B — "Yellow chapters, calm data."** Story sections use GOAT's lemon chapters; data-heavy sections use calm linen; khaki bands for contrast.
- **No content is removed.** All existing sections, copy, links and live stats stay.
- **Figma output goes in a new, separate Figma file** named "Gaurrov Portfolio".
- **Stack constraints unchanged:** no framework, no build step, no npm. GSAP / ScrollTrigger / Lenis stay vendored in `vendor/`. Fonts come from Google Fonts like today.
- **No git commits** unless the user asks; any commit is scoped to files in this folder.

## Reference: what GOAT uses

| Element | Value |
|---|---|
| Background | `#FFFF6C` |
| Ink | `#272111` |
| Display type | Molot (Google Fonts), uppercase, ~96–100px on a 1440 frame |
| Body type | Afacad Medium / SemiBold |
| Buttons | Solid black pills, 60px radius |
| Motifs | Process line with ring dots; line-icon lists; blurred soft shape for depth; one idea per screen |
| Swatch | `#E5E5D8` Soft Linen, `#2F2F1A` Dark Khaki, `#CCB300` / `#D9C022` / `#C0B303` / `#B0B033` golds, `#C7C6B7` Bone, `#DDD06A` / `#CBC65E` Golden Sand |

## 1. Visual system

### Colour tokens (replace the current set at the top of `styles.css`)

| Token | Value | Use |
|---|---|---|
| `--lemon` | `#FFFF6C` | Story chapter backgrounds; text only on khaki |
| `--linen` | `#E5E5D8` | Data section backgrounds |
| `--paper` | `#FFFFFF` | Panels/cards inside linen sections |
| `--khaki` | `#2F2F1A` | Dark bands (feature project card, contact, footer) |
| `--ink` | `#272111` | Primary text everywhere |
| `--ink-2` | olive grey, chosen to reach ≥ 4.5:1 on both lemon and linen | Secondary text |
| `--gold` | `#CCB300` | Accents, bars, chart lines |
| `--gold-2` | `#D9C022` | Secondary accent |
| `--gold-ink` | `#6E6200` | Gold-tinted text (bright golds fail contrast as text) |
| `--bone` | `#C7C6B7` | Hairlines, borders |
| `--heat-0..4` | `#D4D3C3` → `#DDD06A` → `#C0B303` → `#7A6C00` → `#2F2F1A` | LeetCode and GitHub heatmaps (revised during planning: original ramp had two near-identical steps and a level-0 equal to the linen background) |

Kept unchanged because they carry platform meaning: `--easy`, `--medium`, `--hard`, Codeforces rank bands, AtCoder rank bands.

Rules:
- Lemon is never used as text on a light background.
- Every text/background pair used must pass WCAG AA (4.5:1 body, 3:1 large text).
- Focus ring: 3px solid `--ink` (on khaki: `--lemon`).

### Type

- `--display: "Molot", Impact, "Arial Black", sans-serif` — uppercase only; hero name, section titles, big numbers, project names. Never paragraphs.
- `--font: "Afacad", "Segoe UI", system-ui, sans-serif` — body and UI, weights 400/500/600.
- Base body size goes up slightly from 1.0625rem to ~1.125rem; Afacad runs small.
- Google Fonts link replaces Bricolage Grotesque with Molot + Afacad (`display=swap`).

### Components

- **Pill button**: primary = ink/khaki fill, lemon or white text; outline = 2px ink border, transparent; on-dark = lemon fill, ink text. Radius 999px. Min height 3rem (tap target).
- **Process line**: horizontal rule with ring dots and labels beneath; 3- and 4-step variants; becomes vertical below ~720px.
- **Stat tile**: large Molot number + small Afacad label.
- **Line-bullet list**: list items with a small ring/line glyph instead of chips (skills).
- **Soft shape**: one blurred gold blob per lemon chapter, CSS only (radial gradient + blur), decorative, `aria-hidden`. GOAT's leaf image is not used.

### Motion

- Existing GSAP + Lenis + ScrollTrigger setup is kept.
- New: chapter titles reveal word-by-word (slide up), reusing the existing `.line`/`.word` pattern from the hero.
- `prefers-reduced-motion: reduce` disables all of it, as today. The `js-motion` / `motion-ready` safety fallback stays.

## 2. Page structure

☀ lemon chapter · ▤ linen data section · ■ khaki band

1. **Nav** — Molot "GAURROV" wordmark, Afacad links, ink pill "Résumé". Background is translucent linen (~85% opacity) with backdrop blur on every section, so it reads on both lemon and linen without per-section switching. Same anchors as today. Horizontal scroll on mobile unchanged.
2. **☀ Hero** — small Afacad kicker "AI/ML ENGINEER · CHENNAI"; name in very large Molot over two lines; lede; pill buttons (projects, email); photo in a rounded frame with a soft gold shape behind it; "SCROLL" cue with mouse glyph at bottom right (hidden on mobile and for reduced motion); profile links as a compact row.
3. **▤ LeetCode year tape** — stays directly under the hero on a linen strip; heatmap recoloured to the heat ramp.
4. **☀ About** — headline sentence large in Afacad SemiBold; two paragraphs; facts become a 4-up stat-tile row (Based in / Studying / CGPA / Open to).
5. **☀ Experience** — Molot "EXPERIENCE"; timeline rendered as a 3-step process line (Ongoing → Feb–Apr 2026 → Jun 2025) with a role card under each dot. Vertical on mobile.
6. **Projects** — pinned horizontal slider kept. Each project is a near-full-height chapter card: Molot name, tag, description, the "how it works" flow drawn as a 4-step process line, stack as a list, pill CTA. Feature card (Student Readiness Intelligence Platform) is khaki with lemon headline; others are lemon with an ink border. "More on GitHub" card keeps its role.
7. **▤ Competitive programming** — linen. Jump links become big Molot stat tiles. Each platform band keeps its current structure (stats, charts, tables, badges, recent feed); panels are white on linen with bone hairlines; rating chart lines use ink, with gold for LeetCode; rank bands unchanged.
8. **▤ GitHub** — linen; heatmap on heat ramp; language colours replaced with a gold/khaki/bone/olive set that stays distinguishable (each adjacent pair ≥ 3:1 or separated by a gap).
9. **☀ Certifications & achievements** — certificate cards on lemon (white card surface where the badge images need it); Open source and Courses groups kept; course tags as outline pills.
10. **☀ Skills** — Molot title; each group a column of line-bullet items; "LLMs & agentic AI" group set larger.
11. **■ Contact + footer** — khaki band; "LET'S TALK" in very large lemon Molot above the existing sentence; lemon pill for email, outline-on-dark pills for LinkedIn and résumé; small footer with the refreshed date.

### Files touched

- `index.html` — font link, class names / small structural wrappers for new components (kicker, scroll cue, soft shapes, process-line markup). All `data-bind`, `data-count`, `data-bar`, `data-format` attributes and the IDs `main.js` renders into (`lc-heatmap`, `lc-chart`, `lc-contests`, `lc-recent`, `lc-badges`, `lc-langs`, `cf-chart`, `cf-diff`, `cf-contests`, `ac-chart`, `ac-contests`, `gh-cal`, `gh-activity`, `gh-repos`, `langbar`, `langlist`, `track`) are preserved.
- `styles.css` — new tokens and full restyle.
- `main.js` — colour constants only, plus chapter-title word animation. Rendering logic unchanged. Exact colour changes: `langColors` → gold/khaki/bone/olive set; LeetCode rating line `#ffa116` → `#7A6C00` (dark gold; `--gold` is too faint on white for a chart line); Codeforces rating line `#0f2230` → `--ink`; Codeforces difficulty columns `#1f8acb` → `--khaki`; AtCoder rating line `#000` → `--ink`. Codeforces/AtCoder rank band colours are not changed.
- **Not touched:** `data.js`, `scripts/update_data.py`, `vendor/`, `assets/`.

## 3. Figma deliverable

New Figma file "Gaurrov Portfolio" (GOAT file untouched):

- **Foundations** — colour variables mirroring CSS token names 1:1; text styles (Display XL, Display L, H3, Body, Body Large, Label, Stat); spacing and radius variables.
- **Components** — Pill button (primary / outline / on-dark), Process line (3-step / 4-step), Stat tile, Project chapter card (feature / default), Skill list, Platform panel.
- **Screens** — full desktop page at 1440 and full mobile page at 390, assembled from the components and bound to the variables.
- **Method** — after the code is done: capture the running site into Figma as a pixel reference, rebuild as editable auto-layout frames using the variables/components, compare against the capture, then delete the capture.

## 4. Verification

- Serve with `python -m http.server 5500` and load in a real browser.
- Screenshots at 1440, 768 and 390 wide; compare against intent.
- No horizontal page scroll at 390; no console errors.
- Heatmaps, charts, tables, badges, counters and the projects slider all render and animate.
- Reduced-motion emulation: everything visible, no pinned slider trap.
- Accessibility pass: contrast of every token pair in use, focus visibility, tap targets ≥ 44px.
- Before/after screenshots shown to the user at the end.

## Out of scope

- Any change to the GOAT Figma file.
- Content/copy rewrites (beyond the new hero kicker and "LET'S TALK").
- New sections, new data sources, or changes to the data pipeline.
- Adding build tooling or packages.
