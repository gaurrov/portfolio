# GOAT-inspired Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the vanilla HTML/CSS/JS portfolio in GOAT's visual language (lemon story chapters, linen data sections, khaki bands, Molot + Afacad) and build a matching editable design in a new Figma file.

**Architecture:** All visual change lives in `styles.css` (new tokens at the top, every section restyled in place) plus small markup additions in `index.html` and colour constants + one title animation in `main.js`. Data rendering is untouched. The Figma file is built after the code is verified, from a capture of the running site, rebuilt as variables + components + screens.

**Tech Stack:** HTML, CSS, vanilla JS, vendored GSAP/ScrollTrigger/Lenis, Google Fonts (Molot, Afacad), Python `http.server` for local serving, Playwright MCP for browser verification, Figma MCP (`use_figma`, `create_new_file`, `generate_figma_design`).

**Spec:** `docs/superpowers/specs/2026-10-16-goat-inspired-portfolio-design.md`

## Global Constraints

- GOAT Figma file `rFgMCMkdTnnjWiUYwZjaSk` is read-only. Never call `use_figma` against it.
- No framework, no build step, no npm, no new vendored libraries.
- Do not edit `data.js`, `scripts/update_data.py`, `vendor/`, `assets/`.
- Preserve every `data-bind`, `data-count`, `data-bar`, `data-format` attribute and these IDs: `lc-heatmap`, `lc-chart`, `lc-contests`, `lc-recent`, `lc-badges`, `lc-langs`, `cf-chart`, `cf-diff`, `cf-contests`, `ac-chart`, `ac-contests`, `gh-cal`, `gh-activity`, `gh-repos`, `langbar`, `langlist`, `track`, and all section anchor IDs.
- No git commits (user instruction). The checkpoint at the end of each task is the verification passing.
- Molot is uppercase display only (headings, names, big numbers) — never paragraphs.
- Lemon is never text on a light background. Bright golds (`#CCB300`, `#D9C022`, `#DDD06A`, `#C0B303`) are fills only; gold-tinted text uses `--gold-ink`.
- Platform semantic colours stay: LeetCode easy/medium/hard, Codeforces and AtCoder rank bands, GitHub activity-kind dots, platform logo tiles.
- Every text/background pair: ≥ 4.5:1 (body), ≥ 3:1 (≥ 24px or ≥ 19px bold).

### Token values (verified contrast)

| Token | Value | Notes |
|---|---|---|
| `--lemon` | `#FFFF6C` | |
| `--linen` | `#E5E5D8` | |
| `--paper` | `#FFFFFF` | |
| `--khaki` | `#2F2F1A` | lemon on khaki 12.8:1 |
| `--ink` | `#272111` | 15.1 lemon / 12.6 linen / 16.0 white |
| `--ink-2` | `#5A5434` | 7.2 lemon / 6.0 linen / 7.6 white |
| `--gold` | `#CCB300` | fill only |
| `--gold-2` | `#D9C022` | fill only |
| `--gold-ink` | `#6E6200` | 5.8 lemon / 4.85 linen / 6.2 white |
| `--bone` | `#C7C6B7` | hairlines |
| `--heat-0..4` | `#D4D3C3`, `#DDD06A`, `#C0B303`, `#7A6C00`, `#2F2F1A` | heatmaps |
| `--display` | `"Molot", Impact, "Arial Black", sans-serif` | |
| `--font` | `"Afacad", "Segoe UI", system-ui, -apple-system, sans-serif` | |

Google Fonts URL: `https://fonts.googleapis.com/css2?family=Afacad:wght@400;500;600;700&family=Molot&display=swap`

## Review Focus

1. **Reduced motion / no JS** — every section must be fully visible and the projects list static (`.projects.is-static`); new title-split spans must not stay hidden. Owned by Task 7.
2. **390px width** — no horizontal page scroll; the experience process line goes vertical; huge Molot headings must wrap, not overflow. Owned by Tasks 2, 3, 8.
3. **Fonts failing to load (offline)** — fallbacks Impact / Segoe UI must still give legible hierarchy; the pinned slider must re-measure after font load (existing `document.fonts.ready` refresh stays). Owned by Task 8.
4. **Data sections on linen** — difficulty colours, up/down deltas and rank text only pass contrast on white panels; anything rendered by `main.js` (tables, feeds, badges, charts) must sit inside a `--p-surface: #fff` panel. Owned by Task 5.
5. **Pinned projects slider height** — taller Molot names must not push cards beyond `100svh - 11rem` at 1366×768. Owned by Task 4.

---

## Verification harness (used by every task)

- Server: `python -m http.server 5500` run in the background from the portfolio folder (start once in Task 0).
- Browser: Playwright MCP — `browser_navigate` to `http://127.0.0.1:5500/`, `browser_resize`, `browser_evaluate`, `browser_take_screenshot` (full page), `browser_console_messages`.
- Screenshots go to the scratchpad directory, named `<task>-<width>.png`.
- Standard overflow check (expect `0` at every width):
  ```js
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  ```
- Standard console check: `browser_console_messages` shows no errors.

---

### Task 0: Baseline and backup

**Files:** none modified.

- [ ] **Step 1:** Copy `index.html`, `styles.css`, `main.js` into `<scratchpad>/backup/`. (`index.html` has uncommitted edits, so git cannot restore it.)
- [ ] **Step 2:** Start the server in the background; navigate; take full-page "before" screenshots at 1440 and 390 → `before-1440.png`, `before-390.png`.
- [ ] **Step 3:** Record baseline: overflow check = `0`, console errors = none. If either fails, note it as pre-existing; do not fix.

---

### Task 1: Foundations — tokens, fonts, type, buttons, nav

**Files:**
- Modify: `index.html` lines 8–11 (favicon colours, font link), line 29 (wordmark), lines 57, 161, 577–579 (button classes)
- Modify: `styles.css` lines 1–122

**Interfaces — Produces (used by every later task):**
- CSS tokens in the table above, plus keep `--gutter`, `--maxw`, `--nav-h`, `--ease`; delete `--wash`, `--cobalt`, `--cobalt-deep`, `--sun`, `--line`, `--ink-3` (replace remaining uses as you restyle each section: `--wash`→`--linen`, `--line`→`--bone`, `--ink-3`→`--ink-2`).
- Section background utilities: `.chapter` (lemon bg, ink text), `.data` (linen bg), `.band-dark` (khaki bg, lemon headings, linen body text).
- `.display` — Molot, uppercase, `line-height: .92`, `letter-spacing: .01em`, `font-weight: 400`.
- `.kicker` — Afacad 600, uppercase, `letter-spacing: .12em`, `font-size: .9rem`, colour `--ink-2`.
- `.h2` — now Molot uppercase, `font-size: clamp(2.6rem, 8vw, 6.5rem)`, `max-width: none`; headings wrap on spaces only (do not set `overflow-wrap: anywhere`).
- Buttons: `.btn` = ink fill, linen text, pill; `.btn-ghost` = transparent, 2px ink border, ink text; `.btn-lemon` = lemon fill, ink text (on dark); `.btn-ondark` = transparent, 2px lemon border, lemon text. `.btn-small`, `.btn-big` kept. Hover: `translateY(-2px)` + `.btn`→khaki, `.btn-ghost`→ink fill/lemon text.
- Renames in HTML: `btn-sun` → `btn-lemon`, `btn-onblue` → `btn-ondark`.
- Focus ring: `outline: 3px solid var(--ink)`; inside `.band-dark` and `.proj-feature`: `var(--lemon)`.
- `::selection`: lemon bg on light sections; inside `.band-dark`, lemon bg + ink text.

- [ ] **Step 1: Write the check** (run via `browser_evaluate`; it fails before this task):
  ```js
  () => {
    const cs = (s, p) => getComputedStyle(document.querySelector(s))[p];
    return {
      bodyFont: cs('body', 'fontFamily').startsWith('Afacad'),
      h2Font: cs('.h2', 'fontFamily').startsWith('Molot'),
      ink: cs('body', 'color') === 'rgb(39, 33, 17)',
      btn: cs('.hero-actions .btn', 'backgroundColor') === 'rgb(39, 33, 17)',
      noOldClasses: !document.querySelector('.btn-sun, .btn-onblue'),
      fontsLoaded: document.fonts.check('1em Molot') && document.fonts.check('1em Afacad'),
    };
  }
  ```
  Expected after: every value `true`.
- [ ] **Step 2:** Run it now; confirm at least `bodyFont`, `h2Font`, `ink` are `false`.
- [ ] **Step 3:** Replace the font `<link>` with the Molot + Afacad URL; favicon rect fill `%232F2F1A`, text fill `%23FFFF6C`; nav wordmark text `GAURROV` with class `nav-mark display` (keep `aria-label`, drop the `<span>.</span>`).
- [ ] **Step 4:** Rewrite `styles.css` lines 1–122 to the interfaces above. Body `font-size: 1.125rem`, `line-height: 1.55`, background `--lemon`. Nav: `background: rgba(229,229,216,.85)` + existing blur; `.is-scrolled` border `--bone`; links Afacad 600 `--ink-2`, hover/active `--ink` on `rgba(39,33,17,.08)`. Progress bar fill `--gold`.
- [ ] **Step 5:** Rename the button classes in `index.html`.
- [ ] **Step 6:** Re-run the check → all `true`. Overflow check at 1440 and 390 = `0`. Console clean.

---

### Task 2: Hero + LeetCode tape

**Files:**
- Modify: `index.html` lines 46–89
- Modify: `styles.css` hero + tape block (current lines 124–197)

**Interfaces:**
- Consumes: `.chapter`, `.data`, `.kicker`, `.display`, button classes (Task 1).
- Produces: `.soft-shape` (decorative blob: `position:absolute; border-radius:50%; background: radial-gradient(circle, var(--gold-2), transparent 70%); filter: blur(40px); opacity:.55; pointer-events:none; z-index:0`, `aria-hidden="true"`) — reused in Tasks 3, 6. `.scroll-cue` element.

- [ ] **Step 1: Write the check:**
  ```js
  () => ({
    heroBg: getComputedStyle(document.querySelector('.hero')).backgroundColor === 'rgb(255, 255, 108)',
    kicker: document.querySelector('.hero-hello').textContent.trim().toUpperCase().includes('AI/ML ENGINEER'),
    nameFont: getComputedStyle(document.querySelector('.hero-name')).fontFamily.startsWith('Molot'),
    cue: !!document.querySelector('.scroll-cue[aria-hidden="true"]'),
    tapeBg: getComputedStyle(document.querySelector('.tape')).backgroundColor === 'rgb(229, 229, 216)',
    heatL4: getComputedStyle(document.querySelector('.heatmap i.l4') || document.body).backgroundColor === 'rgb(47, 47, 26)',
    cells: document.querySelectorAll('#lc-heatmap i').length > 360,
  })
  ```
- [ ] **Step 2:** Run → expect several `false`.
- [ ] **Step 3: Markup** — `.hero` gets class `chapter`; `.hero-hello` text becomes `AI/ML engineer · Chennai` with added class `kicker`; add `<div class="soft-shape" aria-hidden="true"></div>` inside `.hero-photo`; add after `.hero-grid`: `<a class="scroll-cue" href="#about-title" aria-hidden="true" tabindex="-1"><span>Scroll</span><i></i></a>` (mouse outline drawn in CSS, `<i>` is the wheel). `.tape` gets class `data`.
- [ ] **Step 4: CSS** — hero name: `.display`-style Molot, `font-size: clamp(3.2rem, 12vw, 10rem)`, `line-height: .88`; second line colour `--ink` (no accent colour; GOAT is mono-ink). Photo: drop the `::before` sun block; soft-shape sits behind (`inset: -15%`). Figcaption on `--paper` with `--bone` border. `.hero-links a` underline colour `--bone`, hover `--gold-ink`. Scroll cue: bottom-right of hero, Molot "SCROLL" label .8rem, 22×34px rounded mouse outline 2px ink, wheel dot animates down 6px on a 1.6s loop; hidden `@media (max-width: 860px)` and under reduced motion. Tape: `--heat-*` colours; `.heatmap i.today` ring `0 0 0 2px var(--ink)`; `.tape-meta strong` colour `--ink` weight 700.
- [ ] **Step 5:** Re-run check → all `true`. Screenshots at 1440 and 390 → `t2-1440.png`, `t2-390.png`; confirm the name wraps within the viewport at 390. Overflow = `0`.

---

### Task 3: About + Experience (stat tiles, process line)

**Files:**
- Modify: `index.html` lines 92–139 (add `chapter` to both sections; add class `about-statement` to `#about-title`; add a soft-shape to `.about`)
- Modify: `styles.css` about + timeline block (current lines 199–231)

**Interfaces:**
- Produces: process-line styling pattern — horizontal rule + ring dots (`16px` circle, `3px` ink border, lemon fill; first/current dot filled ink) — reused for `.flow` in Task 4.

- [ ] **Step 1: Write the check** (at 1440, then at 390):
  ```js
  () => {
    const items = [...document.querySelectorAll('.tl-item')].map(e => e.getBoundingClientRect());
    return {
      horizontal: items[0].top === items[1].top && items[1].left > items[0].left,
      factsCols: getComputedStyle(document.querySelector('.facts')).gridTemplateColumns.split(' ').length,
      aboutBg: getComputedStyle(document.querySelector('.about')).backgroundColor,
    };
  }
  ```
  Expected at 1440: `horizontal: true`, `factsCols: 4`, `aboutBg: "rgb(255, 255, 108)"`. At 390: `horizontal: false`, `factsCols: 2`.
- [ ] **Step 2:** Run → expect `horizontal: false`, `factsCols: 2` at 1440.
- [ ] **Step 3: CSS** — About: headline `.h2` here stays sentence-case Afacad 600 at `clamp(1.8rem, 3.6vw, 2.8rem)` (it is a sentence, not a title — add class `about-statement` to override `.h2` Molot); `.about-grid` becomes single column with the statement full width, then body + facts in two columns. `.facts` → 4 columns ≥ 900px, 2 below; `dd` in Molot `clamp(1.4rem, 2.6vw, 2rem)`, `dt` as `.kicker` style; top border 2px ink. Experience: `.timeline` → `display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 2rem` ≥ 900px; `::before` becomes a horizontal 2px ink line at dot centre spanning the row; each `.tl-item::before` dot sits on that line; `.tl-when` as Molot `1.4rem`; `.tl-body` card on `--paper` with radius 1.25rem and padding 1.5rem. Below 900px: keep the current vertical layout recoloured (line `--ink`, dots ring style).
- [ ] **Step 4:** Re-run check at 1440 and 390 → matches expected. Screenshots `t3-1440.png`, `t3-390.png`. Overflow = `0`.

---

### Task 4: Projects chapter cards

**Files:**
- Modify: `index.html` line 142 (add `chapter` to `.projects`), line 145 (title text stays "Projects")
- Modify: `styles.css` projects block (current lines 233–287) and the pinned-slider overrides (current lines 564–577)

**Interfaces:**
- Consumes: process-line pattern (Task 3), `.btn-lemon` (Task 1).

- [ ] **Step 1: Write the check** (at 1366×768):
  ```js
  () => {
    const f = document.querySelector('.proj-feature'), p = document.querySelectorAll('.proj')[1];
    const maxH = innerHeight - 11 * 16;
    return {
      featureBg: getComputedStyle(f).backgroundColor === 'rgb(47, 47, 26)',
      cardBorder: getComputedStyle(p).borderTopColor === 'rgb(39, 33, 17)',
      nameFont: getComputedStyle(p.querySelector('h3')).fontFamily.startsWith('Molot'),
      fits: [...document.querySelectorAll('.proj')].every(c => c.getBoundingClientRect().height <= maxH + 1),
      flowDots: getComputedStyle(p.querySelector('.flow span'), '::after').content !== 'none',
    };
  }
  ```
  Expected: all `true`.
- [ ] **Step 2:** Run → expect `false` values.
- [ ] **Step 3: CSS** — `.proj`: lemon bg, `2px solid var(--ink)` border, radius 1.5rem. `.proj h3` Molot uppercase `clamp(2rem, 4vw, 3.2rem)`. `.proj-tag` `.kicker` style. `.proj-feature`: khaki bg, linen text, lemon `h3`, lemon `.proj-tag`, flow labels linen, CTA `.btn-lemon` (already renamed). `.proj-more`: `--gold-2` fill, ink text. `.proj-metric strong` Molot. `.flow`: render as a process line — each `span` loses its chip background, gets a ring dot via `::after` above the label and a connecting 2px line via `span + span::before`; labels Afacad 600 `.85rem`; 4 steps fill the card width (`display:grid; grid-template-columns: repeat(4, 1fr)`); below 480px the flow becomes 2×2. `.proj-foot` border `--bone` (feature: `rgba(229,229,216,.25)`). `.projects-hint` colour `--ink-2`.
- [ ] **Step 4:** If `fits` is `false`, reduce `.proj` gap to `1.25rem` and h3 max to `2.8rem` in the pinned state only (`.projects:not(.is-static)`), then re-run.
- [ ] **Step 5:** Re-run check → all `true`. Scroll through the pinned slider at 1440×900 and take screenshots at start and end of the pin → `t4-start.png`, `t4-end.png`. At 390 confirm the static stacked list. Overflow = `0`.

---

### Task 5: Competitive programming + GitHub on linen

**Files:**
- Modify: `index.html` line 252 (add `data` to `#solving`), line 417 (add `data` to `#github`)
- Modify: `styles.css` platform block (current lines 289–469)
- Modify: `main.js` lines 70, 243, 264, 265, 277 (colour constants only)

**Interfaces:**
- Consumes: tokens (Task 1).
- `main.js` exact changes:
  - line 70: `const langColors = ["#2F2F1A", "#CCB300", "#5A5434", "#C7C6B7", "#7A6C00", "#DDD06A"];`
  - line 243: `{ color: "#ffa116" }` → `{ color: "#7A6C00" }`. Deviation from spec (which said `--gold`): `#CCB300` is only 2.1:1 on white, below the 3:1 needed for a chart line; `#7A6C00` is 5.3:1.
  - line 264: `color: "#272111"`; line 265: `color: "#2F2F1A"`; line 277: `color: "#272111"`.
  - Rank band arrays (lines 256–262, 270–275) unchanged.

- [ ] **Step 1: Write the check:**
  ```js
  () => {
    const bg = s => getComputedStyle(document.querySelector(s)).backgroundColor;
    const surfaces = ['.lc', '.plat-cf .plat-block', '.plat-ac .plat-block', '.plat-gh .plat-block', '.gh-cal-wrap'].map(bg);
    return {
      sectionBgs: ['#solving', '.plat-lc', '.plat-cf', '.plat-ac', '.plat-gh'].map(bg),
      surfacesWhite: surfaces.every(c => c === 'rgb(255, 255, 255)'),
      ccDark: bg('.plat-cc') === 'rgb(47, 47, 26)',
      ghL4: getComputedStyle(document.querySelector('.gh-cal i.l4') || document.body).backgroundColor,
      cfLine: document.querySelector('#cf-chart path.line')?.getAttribute('stroke'),
      jumpFont: getComputedStyle(document.querySelector('.pj b')).fontFamily.startsWith('Molot'),
    };
  }
  ```
  Expected: every `sectionBgs` entry `"rgb(229, 229, 216)"`, `surfacesWhite: true`, `ccDark: true`, `ghL4: "rgb(47, 47, 26)"`, `cfLine: "#272111"`, `jumpFont: true`.
- [ ] **Step 2:** Run → expect mismatches (GitHub is dark, bands are tinted).
- [ ] **Step 3: CSS** — `.plat` base tokens become: `--p-bg: var(--linen); --p-surface: var(--paper); --p-ink: var(--ink); --p-muted: var(--ink-2); --p-accent: var(--gold); --p-accent-ink: var(--gold-ink); --p-line: var(--bone)`. Delete the per-platform token overrides for `.plat-lc`, `.plat-cf`, `.plat-ac`, `.plat-gh`; `.plat-cc` becomes the khaki band (`--p-bg: var(--khaki); --p-ink: var(--linen); --p-muted: rgba(229,229,216,.8); --p-accent: var(--lemon); --p-accent-ink: var(--lemon); --p-line: rgba(229,229,216,.25)`). Bands are separated by a `1px solid var(--bone)` top border. Platform logo tiles keep their brand colours. `.plat-name` and `.plat-stats dd`, `.pj b`, `.lc-total .count`, `.lc-side dd`, `.cc-stat b` → Molot. `.plat-stats` wraps in a white panel (`background: var(--p-surface); border-radius: 1.25rem; padding: 1.25rem 1.5rem`) so `.cf-rank-text` / AtCoder brown pass contrast. `.lc-side` → khaki bg, linen text, first `dd` lemon. `.lc-total .count` underline `--gold`. `.diff-bar` track `--linen`. Badge hover bg `--linen`; meter track `--linen`, fill `--gold`. `.feed .tag` bg `--linen`, colour `--ink-2`. `.plat-cta` hover: ink fill, linen text (delete the LC/CF-specific hovers). `.pj`: white panel, left border keeps platform colour. GitHub calendar cells use `--heat-*` (`.gh-cal i` base `--heat-0`). `.chart-tip` bg `--khaki`, text linen.
- [ ] **Step 4:** Apply the `main.js` colour changes listed above.
- [ ] **Step 5:** Re-run check → expected values. Screenshots at 1440 and 390 of `#solving` and `#github` → `t5-*.png`. Hover one chart dot and confirm the tooltip renders. Console clean. Overflow = `0`.

---

### Task 6: Certifications, Skills, Contact

**Files:**
- Modify: `index.html` lines 459, 540 (add `chapter`), 573–586 (add `band-dark`; add `<p class="contact-big display" aria-hidden="true">Let's talk</p>` before the `h2`)
- Modify: `styles.css` certs, skills, contact blocks (current lines 471–551) and the trailing overrides (lines 585–590)

- [ ] **Step 1: Write the check:**
  ```js
  () => {
    const cs = (s, p) => getComputedStyle(document.querySelector(s))[p];
    return {
      certsBg: cs('#certifications', 'backgroundColor'),
      awsCard: cs('.cert-aws', 'backgroundColor'),
      skillChip: cs('.skill-group li', 'backgroundColor'),
      contactBg: cs('.contact', 'backgroundColor'),
      bigFont: cs('.contact-big', 'fontFamily').startsWith('Molot'),
      bigColor: cs('.contact-big', 'color'),
    };
  }
  ```
  Expected: `certsBg` `"rgb(255, 255, 108)"`, `awsCard` `"rgb(255, 255, 255)"`, `skillChip` `"rgba(0, 0, 0, 0)"`, `contactBg` `"rgb(47, 47, 26)"`, `bigFont: true`, `bigColor` `"rgb(255, 255, 108)"`.
- [ ] **Step 2:** Run → expect mismatches.
- [ ] **Step 3: CSS** — Certs: `.cert-card` white surface, `2px solid var(--ink)`, radius 1.5rem; remove AWS/OCI brand backgrounds and button colour overrides (verify buttons use `.btn`); `.cert-issuer` colour `--gold-ink`. `.certs-sub` Molot `clamp(1.6rem, 3.4vw, 2.4rem)`. `.oss-badge` white surface + ink border; `.oss-mark` keeps its GSSoC orange. `.course-group h4` `.kicker` style in `--ink`; `.course-group li` border `--bone`; `.course-tags li` outline pill (`1.5px solid var(--ink)`, transparent bg, radius 999px). Delete the unused `.ach*` rules (no `.ach` markup remains in `index.html` — confirm with a search first). Skills: groups stay in the 3/2/1-column grid with ink/bone borders; `h3` Molot `1.3rem`; `ul` becomes a vertical list, each `li` Afacad 500 `1.05rem` with a `10px` ring bullet (`::before`, 2px ink border) and no background; `.skill-lead h3` `1.8rem` and its items `1.2rem` with filled ink bullets. Contact: `.band-dark` khaki; `.contact-big` Molot lemon `clamp(4rem, 16vw, 13rem)`, `line-height: .85`; `.contact-title` Afacad 600 linen `clamp(1.6rem, 3.4vw, 2.6rem)`; buttons: email `.btn-lemon .btn-big`, others `.btn-ondark`; `.foot` linen at 85% opacity, border `rgba(229,229,216,.2)`.
- [ ] **Step 4:** Re-run check → expected. Screenshots `t6-1440.png`, `t6-390.png`; confirm "LET'S TALK" does not overflow at 390. Overflow = `0`.

---

### Task 7: Chapter title motion

**Files:**
- Modify: `main.js` — add `splitTitle` before the "Motion" block; call it inside the motion path only
- Modify: `styles.css` — motion-preparation block (current lines 553–562)

**Interfaces:**
- Produces: `splitTitle(el: HTMLElement): void` — sets `el.setAttribute('aria-label', el.textContent.trim())`, replaces content with one `<span class="tw" aria-hidden="true"><span>word</span></span>` per whitespace-separated word (spaces preserved between `.tw` spans). Applied to `.chapter .h2:not(.about-statement)` and `.certs-sub`.
- Animation: on enter (`start: "top 85%"`, `once: true`), `gsap.to(el.querySelectorAll('.tw > span'), { y: 0, duration: 1, ease: "expo.out", stagger: 0.08 })`.

- [ ] **Step 1: Write the check** (two runs):
  ```js
  () => {
    const h = document.querySelector('#work-title');
    return { label: h.getAttribute('aria-label'), words: h.querySelectorAll('.tw').length, visible: getComputedStyle(h.querySelector('.tw > span') || h).transform };
  }
  ```
  Normal motion, after scrolling `#work` into view: `label: "Experience"`, `words: 1`, `visible` is `"none"` or an identity matrix. With `browser_emulate_media` `reducedMotion: "reduce"` + reload: `words: 0` (no split), title visible.
- [ ] **Step 2:** Run → `words: 0` in both (not implemented yet).
- [ ] **Step 3:** Implement `splitTitle` and the ScrollTrigger in `main.js` after `root.classList.add("motion-ready")`. CSS: `.tw { display:inline-block; overflow:hidden; vertical-align: top; padding-bottom: .06em }` and `.js-motion .tw > span { display:inline-block; transform: translateY(105%) }`. The existing 2.5 s `js-motion` removal fallback in `index.html` must still reveal titles (it does, because the transform rule is scoped to `.js-motion`). Remove `.reveal` from those titles so the two animations don't stack.
- [ ] **Step 4:** Re-run both modes → expected. Also load with JS disabled (`browser_run_code_unsafe` launching a context with `javaScriptEnabled: false`) and confirm all titles readable.

---

### Task 8: Full-page verification

**Files:** none unless fixes are needed (fixes go in the owning task's files).

- [ ] **Step 1:** At 1440×900, 768×1024, 390×844: overflow check = `0`; full-page screenshots `final-<w>.png`; console clean.
- [ ] **Step 2:** Contrast sweep script — for every element with a direct text node, compare computed `color` against the nearest opaque ancestor background; report pairs below 4.5 (or below 3 for ≥ 24px / ≥ 19px bold):
  ```js
  () => { /* walk document.body; for each element whose childNodes include non-empty text, compute ratio via WCAG relative luminance; collect {selector, fg, bg, ratio, size} where ratio fails; return the list */ }
  ```
  Expected: empty list (decorative `aria-hidden` elements excluded).
- [ ] **Step 3:** Keyboard: Tab from the top through nav → hero buttons → first project CTA; each focused element shows a visible outline (screenshot one on lemon, one on khaki).
- [ ] **Step 4:** Offline-font check: block `fonts.googleapis.com` via `browser_run_code_unsafe` (`page.route('**/fonts.*/**', r => r.abort())`), reload, screenshot 1440 → `final-nofont.png`; overflow = `0`, slider still pins.
- [ ] **Step 5:** Tap targets at 390: every `a, button` in `main` has a box ≥ 44×44 or is inline text within a paragraph.
- [ ] **Step 6:** Show the user before/after screenshots (1440 and 390) and get their go-ahead before starting the Figma build.

---

### Task 9: Figma — new file + foundations

**Files:** none local. Figma: new file "Gaurrov Portfolio".

**Skills to load first:** `figma:figma-create-new-file`, `figma:figma-use`, `figma:figma-generate-library`.

**Interfaces — Produces:**
- Variable collection `Color` with variables named exactly like the CSS tokens without `--` (`lemon`, `linen`, `paper`, `khaki`, `ink`, `ink-2`, `gold`, `gold-2`, `gold-ink`, `bone`, `heat-0` … `heat-4`).
- Variable collection `Space` (`4, 8, 12, 16, 24, 32, 48, 64, 96`) and `Radius` (`sm 8`, `md 16`, `lg 24`, `pill 999`).
- Text styles: `Display/XL` (Molot 160/0.88), `Display/L` (Molot 104/0.92), `Display/M` (Molot 48/1), `Heading/H3` (Afacad SemiBold 28/1.2), `Body/L` (Afacad Medium 22/1.5), `Body/M` (Afacad Regular 18/1.55), `Label` (Afacad SemiBold 14, 12% tracking, uppercase), `Stat` (Molot 56/1).
- Pages: `Foundations`, `Components`, `Screens`.

- [ ] **Step 1:** `whoami` → pick the user's plan; `create_new_file` named "Gaurrov Portfolio". Record the fileKey in the task notes.
- [ ] **Step 2:** `use_figma`: create pages, variable collections, text styles (load Molot and Afacad fonts first; if Molot is unavailable in Figma, stop and tell the user).
- [ ] **Step 3:** `use_figma`: build a Foundations board — swatches bound to each colour variable with name + hex labels, and a type specimen for each text style.
- [ ] **Step 4: Verify** — `get_variable_defs` on the Foundations board lists all 15 colour variables with the exact hex values from the token table; `get_screenshot` of the board looks complete.

---

### Task 10: Figma — components

**Skills:** `figma:figma-use`, `figma:figma-generate-library`.

**Interfaces — Produces** (component sets on the `Components` page, all fills/strokes/text bound to Task 9 variables and styles):
- `Button` — `Variant=Primary|Outline|Lemon|OnDark`, `Size=Small|Default|Big`, text property `Label`.
- `Process line` — `Steps=3|4`, `Orientation=Horizontal|Vertical`, text properties per step label.
- `Stat tile` — text properties `Value`, `Label`.
- `Project card` — `Variant=Feature|Default`, text properties `Tag`, `Name`, `Description`; nested `Process line` + `Button`.
- `Skill list` — `Lead=True|False`.
- `Platform panel` — white surface, slot frame for content.

- [ ] **Step 1:** Build each component set with auto-layout and variable bindings.
- [ ] **Step 2: Verify** — `use_figma` read script: every component's fills/strokes have `boundVariables` (no raw hex), every text node uses a text style; returns a list of offenders → expected empty. `get_screenshot` of the Components page.

---

### Task 11: Figma — desktop + mobile screens

**Skills:** `figma:figma-use`, `figma:figma-generate-design`.

- [ ] **Step 1:** With the local server running, `generate_figma_design` to capture `http://127.0.0.1:5500/` at 1440 and 390 into the `Screens` page as references.
- [ ] **Step 2:** `use_figma`: build `Desktop — 1440` and `Mobile — 390` frames section by section (11 sections from the spec), using Task 10 component instances and Task 9 variables/styles; data-heavy blocks (charts, heatmaps, tables) as placeholders or flattened images from the capture, clearly named `Live data — rendered by main.js`.
- [ ] **Step 3: Verify** — `get_screenshot` of each built frame compared side by side with the capture; fix visible mismatches in layout/colour/type.
- [ ] **Step 4:** Delete the captured reference frames. Final `get_metadata` of the `Screens` page shows only the two built frames.

---

### Task 12: Hand-off

- [ ] **Step 1:** Report to the user: what changed per file, before/after screenshots, the Figma file link, any deviations from the spec and why, any pre-existing issues noted in Task 0.
- [ ] **Step 2:** Ask whether they want the changes committed (scoped to this folder) — do not commit otherwise.
