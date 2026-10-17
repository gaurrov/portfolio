# Liquid Sky Cinematic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the portfolio to the Sky + sun palette, add a hand-written WebGL liquid background (trails + ripple) that follows the cursor, and turn every section into a scroll-driven cinematic chapter.

**Architecture:** `liquid.js` (new, self-contained IIFE) owns one fixed canvas and exposes `window.Liquid`. `main.js` keeps data binding/rendering and gains chapter choreography, cursor, magnetic buttons, chapter rail and scramble, all inside the existing motion path (`canAnimate`) with a `gsap.matchMedia` split at 861px. `styles.css` swaps tokens and makes chapters transparent over the liquid.

**Tech Stack:** HTML, CSS, vanilla JS, WebGL2/WebGL1, vendored GSAP 3 + ScrollTrigger + Lenis, Google Fonts (Russo One, Afacad), Playwright MCP + Chrome DevTools MCP (Lighthouse) for verification.

**Spec:** `docs/superpowers/specs/2026-10-16-liquid-sky-cinematic-design.md` (builds on `2026-10-16-goat-inspired-portfolio-design.md`)

## Global Constraints

- GOAT Figma file read-only. No npm/build. Do not touch `data.js`, `scripts/`, `vendor/`, `assets/`. No commits.
- Palette tokens exactly: `--sky #8ECDF5`, `--cloud #EAF6FD`, `--paper #FFFFFF`, `--midnight #0B1B2E`, `--ink-2 #2E4A66`, `--sun #FFD23F`, `--link #0F4C9A`, `--line rgba(11,27,46,.18)`, `--heat-0..4 #D6E6F0 #9FD3F3 #4FA8DE #1F6FB2 #0B1B2E`.
- Sun is never text on sky/cloud/white. Platform semantic colours only on `--paper`.
- Liquid colours only lighter than sky (white, sun).
- Every motion feature is off under `prefers-reduced-motion: reduce` and when JS fails; all content visible then.
- Pins only at `min-width: 861px`.
- Keep `.chapter` / `.data` / `.band-dark` class names (now: transparent-over-liquid / cloud / midnight).
- Verification harness, cache workaround (`page.context().route('**/*', r => r.continue())` + `?t=` query) and screenshot paths as in the previous plan; Playwright can only load files from the portfolio folder, so scripts are inlined.

## Review Focus

1. **WebGL unavailable or context lost** — page must look finished (static gradient) with zero console errors; owned by Task 2 (test with `--disable-gpu`-like context via `HTMLCanvasElement.prototype.getContext` stub).
2. **Scroll position restore / anchor jumps into pinned chapters** — nav links and `#hash` loads must land on the chapter's content, not mid-animation blank states; owned by Task 8.
3. **Touch devices** — liquid follows touch without blocking page scroll (`passive` listeners, canvas `pointer-events:none`); custom cursor never shown; owned by Tasks 2 and 8.
4. **Tab hidden / low-power** — rAF stops when hidden; owned by Task 2.
5. **Scrubbed states at load mid-page** (refresh while scrolled) — every scrubbed element must render a correct state for the current scroll position, never stuck hidden; owned by Task 9 (reload at several scroll offsets and run the contrast/visibility sweep).

---

### Task 1: Sky palette + content removal

**Files:** `styles.css` (tokens block, every `--lemon/--linen/--khaki/--ink/--gold*/--bone` use), `index.html` (remove blocks, move tape), `main.js` (chart colours, langColors, remove `contestTable` calls + `lc-recent` render).

**Interfaces — Produces:** tokens above; `--ink` renamed `--midnight` everywhere; `.chapter { background: transparent }` (sky comes from `body` now, later from the canvas); `.data { background: var(--cloud) }`; `.band-dark { background: var(--midnight); color: var(--cloud) }`; heatmap container `.tape` now lives inside `#solving` directly after `.plat-jump`.

Colour mapping for the re-point: lemon→sky (bg) · linen→cloud · khaki→midnight · ink→midnight · ink-2→`#2E4A66` · gold/gold-2 fills→sun · gold-ink text→`--link` · bone→`--line` · lemon text on dark→sun · `.btn` = midnight fill + cloud text; `.btn-lemon`→`.btn-sun` (sun fill, midnight text); `.btn-ondark` border/text sun.
`main.js` colours: langColors `["#0B1B2E","#FFD23F","#1F6FB2","#9FD3F3","#2E4A66","#4FA8DE"]`; LC line `#1F6FB2`; CF line `#0B1B2E`; CF columns `#1F6FB2`; AC line `#0B1B2E`.

- [ ] **Step 1: Check (RED):**
  ```js
  () => {
    const bg = s => getComputedStyle(document.querySelector(s)).backgroundColor;
    return {
      body: bg('body'), proj: bg('.proj:not(.proj-feature)'), contact: bg('.contact'), feature: bg('.proj-feature'),
      removed: ['#lc-recent', '#lc-contests', '#cf-contests', '#ac-contests'].every(s => !document.querySelector(s)),
      tapeInCoding: !!document.querySelector('#solving .tape #lc-heatmap'),
      submissionsStat: !!document.querySelector('#solving [data-count="lc.submissionsLastYear"]'),
      noLegacy: ![...document.styleSheets[1]?.cssRules || []].some(r => /--(lemon|linen|khaki|gold|bone)\b/.test(r.cssText)),
    };
  }
  ```
  Expected after: `body "rgb(142, 205, 245)"`, `proj "rgb(142, 205, 245)"` or transparent-over-sky (accept `rgba(0, 0, 0, 0)` + body sky), `contact "rgb(11, 27, 46)"`, `feature "rgb(11, 27, 46)"`, `removed/tapeInCoding/submissionsStat/noLegacy: true`.
- [ ] **Step 2:** Run → RED.
- [ ] **Step 3:** Token + mapping changes; `.proj` cards become `rgba(255,255,255,.55)` glass with `backdrop-filter: blur(10px)` and midnight border; feature card midnight with sun headline.
- [ ] **Step 4:** Markup: delete the four blocks; LeetCode `plat-cols` keeps only the "Contest rating" chart block, set full width (`.plat-block` outside `.plat-cols`); the submissions sentence moves into `.tape` under the legend; CF `plat-cols` keeps only the difficulty chart (full width); AC keeps only the rating chart (full width). Move `.tape` out of `.hero` into `#solving` after `.plat-jump`.
- [ ] **Step 5:** `main.js`: remove `contestTable(...)` calls and the `lcRecent` render (and `contestTable` function itself); update colours.
- [ ] **Step 6:** GREEN; contrast sweep (from previous plan) 0 fails at 1440 and 390; overflow 0; console clean.

---

### Task 2: Liquid engine (`liquid.js`)

**Files:** Create `liquid.js`. Modify `index.html` (add `<canvas id="liquid" aria-hidden="true"></canvas>` as first child of `body`; `<script src="liquid.js"></script>` before `main.js`), `styles.css` (canvas + static fallback).

**Interfaces — Produces:**
- `window.Liquid = { splash(x: number, y: number, strength?: number): void, setPaused(p: boolean): void, active: boolean, frames: number }` (`frames` increments per rendered frame — used by tests; `active` false when fallback).
- `html.liquid-on` class when WebGL runs; absent → CSS fallback gradient on `body`.

**Algorithm (decided):**
- Init: `canvas.getContext('webgl2', {alpha:false, antialias:false, preserveDrawingBuffer:false})`; fallback `webgl` + `OES_texture_half_float` + `OES_texture_half_float_linear`. If neither or any shader fails → `active=false`, return (no throw, no console output).
- Double-buffered FBOs: `velocity` (RG16F, sim res 128 on short edge), `dye` (RGBA16F, 512), `pressure` (R16F, sim), `divergence` (R16F, sim).
- Per frame (dt clamped ≤ 1/30): `advect(velocity, dissipation .985)` → pointer splats (velocity += delta·6000·gaussian(r=.0025·aspect); dye += colour·gaussian, colour alternates white `[1,1,1]` and sun `[1,.82,.25]` × .35) → `divergence` → 20 Jacobi `pressure` iterations (pressure decay .8) → `gradientSubtract` → `advect(dye, dissipation .975)`.
- Display shader: base = vertical sky gradient (`#A9DBF8` top → `#8ECDF5` → `#7FC4F0` bottom) + 4 soft cloud blobs (white, alpha .35, centres drifting with `sin(t·.05+i)`); sample base at `uv + velocity·.0009` (ripple warp) + splash wave term (`sin(40·d - t·12)·exp(-d·8)·exp(-age·2.5)` added to uv offset); final = mix(base, dye.rgb, clamp(length(dye.rgb)·.9, 0, .55)) — guarantees result ≥ base luminance (dye only lighter).
- Ambient: if no pointer move for 2.5 s, auto-splat along a slow Lissajous path every 120 ms.
- Pointer: `pointermove` + `touchmove` on `window` (passive); `pointerdown` → `splash`.
- Resize: debounce 150 ms, recreate FBOs; DPR `min(devicePixelRatio, 1.5)`.
- Pause: `document.hidden` → cancel rAF; resume on visible. `setPaused(true)` also stops.
- Reduced motion → do not init; `active=false`.
- Context lost → `active=false`, remove `liquid-on` class.

- [ ] **Step 1: Check (RED):**
  ```js
  async () => {
    const L = window.Liquid; if (!L) return { exists: false };
    const f0 = L.frames; await new Promise(r => setTimeout(r, 500)); const f1 = L.frames;
    return { exists: true, active: L.active, running: f1 > f0, cls: document.documentElement.classList.contains('liquid-on') };
  }
  ```
  Expected after: `exists, active, running, cls` all `true`.
- [ ] **Step 2:** Pixel response check (via Playwright): screenshot a 200×200 region at viewport centre, move mouse across it in 10 steps, screenshot again; mean absolute pixel difference > 3 (compute in-page with `OffscreenCanvas` from the PNG buffers or in Python from saved files). RED before.
- [ ] **Step 3:** Hidden-tab check: `document.dispatchEvent(new Event('visibilitychange'))` after `Object.defineProperty(document,'hidden',{value:true,configurable:true})` → frames stop increasing within 200 ms.
- [ ] **Step 4:** Fallback checks: (a) `emulateMedia({reducedMotion:'reduce'})` → `Liquid.active === false`, no `liquid-on`, body background-image contains `gradient`; (b) `page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; })` → same, console has 0 errors.
- [ ] **Step 5:** Implement `liquid.js` per the algorithm; CSS: `#liquid { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; display: none }`, `.liquid-on #liquid { display: block }`, `body { background: var(--sky) radial-gradient(...) cloud fallback }`, `.liquid-on body { background: var(--sky) }`.
- [ ] **Step 6:** All checks GREEN; screenshot with trails → `liquid-1440.png`; contrast sweep with active trails still 0 fails; record frame-time: `performance.now()` around 120 frames, mean ≤ 16.7 ms at 1440×900.

---

### Task 3: Intro loader + hero chapter

**Files:** `index.html` (loader overlay `<div class="loader" aria-hidden="true"><span class="display">GN</span></div>` after `.progress`; hero name split into per-letter spans by JS, not markup), `styles.css`, `main.js`.

**Interfaces — Produces:** `splitLetters(el): HTMLElement[]` (wraps each letter of each `.word` in `<span class="ch">`, keeps `aria-label` on the `h1`); `sessionStorage['gn-intro']='1'` after first play.

- [ ] **Step 1: Check (RED):** after load + 2.5 s: `{ loaderGone: !document.querySelector('.loader') || getComputedStyle(document.querySelector('.loader')).visibility === 'hidden', letters: document.querySelectorAll('.hero-name .ch').length, label: document.querySelector('.hero-name').getAttribute('aria-label') }` → expected `loaderGone: true`, `letters: 17` (GAURROV + SNARAYANAN), `label: "Gaurrov S Narayanan"`. Second load in same session: loader never visible (sample at 100 ms).
- [ ] **Step 2:** Run → RED.
- [ ] **Step 3:** Loader: midnight overlay, sun "GN" pulses, exits with a clip-path wipe upward (≤ 1.2 s total) and calls `Liquid.splash(innerWidth*.3, innerHeight*.45, 1)`. Name letters rise from `yPercent:110, rotate:8` with `stagger:.035`. Desktop pin: `.hero` pinned `+=60%` scrub — name `scale .82, y -6vh`, `.hero-lede/.hero-actions/.hero-links` opacity→0, photo `y -8vh`, `.scroll-cue` opacity 0. No pin < 861px.
- [ ] **Step 4:** GREEN; reduced-motion: no loader rendered (`display:none`), letters not split.

---

### Task 4: About + Experience chapters

**Files:** `main.js`, `styles.css`.

- [ ] **Step 1: Check (RED)** at 1440×900, after scrolling to the end of each pin:
  `{ aboutWords: document.querySelectorAll('#about-title .aw').length, aboutFull: [...document.querySelectorAll('#about-title .aw')].every(w => +getComputedStyle(w).opacity > .95), lineScale: getComputedStyle(document.querySelector('.timeline'), '::before').transform, cardsUp: [...document.querySelectorAll('.tl-item')].every(i => +getComputedStyle(i).opacity > .95) }`
  Expected: `aboutWords` = word count of the statement (13), `aboutFull: true`, `lineScale` matrix with scaleX 1 (implemented via CSS var `--draw` on `.timeline` → `::before { transform: scaleX(var(--draw)) }`), `cardsUp: true`. At the *start* of the experience pin: first card opacity 1, third < .2.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** About: split statement into `.aw` spans (aria-label on h2); pin `.about` `+=80%`, scrub `.aw` opacity .2→1 stagger; facts tiles rise at 80–100%. Experience: pin `#work` `+=120%`, scrub `--draw` 0→1 on `.timeline`; each `.tl-item` timeline-positioned at its dot (0, .45, .9) fading/rising in; dot fill turns sun as reached. < 861px: in-view reveals only.
- [ ] **Step 4:** GREEN; reduced motion: all words opacity 1, `--draw:1`.

---

### Task 5: Projects depth

**Files:** `main.js` (inside existing `mm.add("(min-width: 861px)")` block), `styles.css`.

- [ ] **Step 1: Check (RED):** during horizontal scroll mid-pin, `getComputedStyle(document.querySelectorAll('.proj')[2]).transform` is not `none` and has a rotateY component (matrix3d); after the pin, each card's `.flow` has `--draw` = 1.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** `.track { perspective: 1200px }`; on ScrollTrigger `onUpdate` of the horizontal tween, set `rotateY = clamp(-10, 10, -velocity/120)` on all cards via `gsap.quickTo` (ease back to 0 after 200 ms idle). `.flow::before` connector lines scale with `--draw` (0→1) when the card is 70% in view (containerAnimation trigger).
- [ ] **Step 4:** GREEN; `fits` check from the previous plan still true at 1366×768.

---

### Task 6: Coding chapter

**Files:** `index.html` (add `<div class="cp-hero"><span class="cp-count display" data-count="lc.solved.All">663</span><span class="cp-label display">problems solved</span></div>` at top of `#solving .wrap` replacing the h2 visual; keep `h2#solving-title` visually hidden for outline), `main.js`, `styles.css`.

- [ ] **Step 1: Check (RED):** at 1440×900 scroll to 50% of the coding pin: `{ count: +document.querySelector('.cp-count').textContent.replace(/,/g,''), filled: document.querySelectorAll('#lc-heatmap i.on').length, total: document.querySelectorAll('#lc-heatmap i:not(.pad)').length }` → `0 < count < 663`, `0 < filled < total`. At pin end: `count === 663`, `filled === total`. Badges: after scrolling past, all `.lc-badges li` opacity 1.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** Pin `.cp-stage` (wraps `.cp-hero` + `.tape`) `+=150%`; scrub a proxy `{p:0}` → count = round(p·663), heatmap cells get class `on` for index < p·total (cells without `on` render at `opacity:.15`, `scale(.6)` — CSS only applies under `.js-motion`); the old page-load heatmap animation in `main.js` (cells `scale` tween) moves here. Badges: `gsap.from` fan (rotate ±12, x offset, stagger .06). Each `.plat` band: `xPercent: 8 → 0, opacity 0 → 1` scrubbed on enter. < 861px: count-up on view, heatmap fades in.
- [ ] **Step 4:** GREEN; data-count count-up for `.cp-count` must not double-run (exclude it from the generic `[data-target]` loop).

---

### Task 7: GitHub, Certifications, Skills, Contact

**Files:** `index.html` (skills marquee: `<div class="marquee" aria-hidden="true"><div class="mq-row">…all skill names…</div><div class="mq-row mq-rev">…</div></div>` above `.skill-grid`), `main.js`, `styles.css`.

- [ ] **Step 1: Check (RED):**
  `{ ghCols: getComputedStyle(document.querySelector('#gh-cal i:not(.pad)')).opacity, certRot: getComputedStyle(document.querySelector('.cert-oci')).transform, mq: document.querySelectorAll('.mq-row').length, splashes: (window.__splashCount||0) }` — after scrolling through: GitHub cells opacity 1; cert cards transform `none`/identity at rest after spread; `mq: 2`; hovering `.contact-big` increments a `Liquid.splash` spy (`window.__splashCount`, installed by test) ≥ 1.
- [ ] **Step 2:** RED (`mq: 0`, no spy hits).
- [ ] **Step 3:** GitHub: calendar columns reveal with stagger by column index (scrubbed). Certs: pin `.cert-feature` `+=60%`; cards start stacked (second card `x:-55%, rotate:-6, y:20`) and spread to identity. Skills: two marquee rows of all skill names separated by sun dots, CSS `@keyframes` translateX loop (40 s / 50 s reverse), scroll velocity bumps `--mq-speed` via ScrollTrigger `onUpdate`; reduced motion → rows hidden. Contact: `.contact-big` split per letter; `pointermove` over it → `Liquid.splash(x, y, .6)` throttled 80 ms; letters lift on hover.
- [ ] **Step 4:** GREEN.

---

### Task 8: Cursor, magnetic buttons, chapter rail, scramble

**Files:** `index.html` (cursor: `<div class="cursor" aria-hidden="true"><i class="cursor-dot"></i><i class="cursor-ring"></i></div>`; rail: chapter numbers added to each nav `<a>` as `<b class="rail-n">01</b>` with label text kept in `<span>`), `main.js`, `styles.css`.

**Interfaces:** `magnetize(el, strength=8)`, `scramble(el)`; body class `has-cursor` only when `matchMedia('(pointer: fine)')` and motion allowed.

- [ ] **Step 1: Check (RED):**
  - fine pointer 1440: after `mouse.move(500,400)` → `.cursor-ring` transform contains translate ≈ (500,400) ±30; hovering `.hero-actions .btn` → ring has class `is-link`; button transform translate non-zero toward cursor.
  - `html.has-cursor` → `body { cursor: none }` but `a, button { cursor: none }` only while the custom cursor is visible.
  - touch emulation (`hasTouch`, `pointer: coarse`) → `.cursor` `display: none`, no `has-cursor`.
  - rail: 6 nav links each contain `.rail-n` with text 01–06 (Work=03 … mapping: Work 03, Projects 04, Coding 05, GitHub 06, Certifications 07, Skills 08); active link has `is-active`.
  - anchor jump: click nav "Coding" → after 2 s, `#solving` top within ±120px of viewport top and `.cp-count` visible.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** Implement with `gsap.quickTo` for dot (duration .1) and ring (.35); `mouseleave` window → hide. Magnetic on `.btn, .plat-cta, .nav-mark` (pointer fine only). Scramble on `mouseenter` of `.nav ul a span` and `.proj h3`: cycle random A–Z/0–9 for ≤ 400 ms, restoring exact original text. Nav links show `rail-n` + label on wide screens (dot-style number badges, active filled sun).
- [ ] **Step 4:** GREEN; keyboard tab order unchanged; focus ring still visible (custom cursor never hides focus outlines).

---

### Task 9: Full verification

- [ ] **Step 1:** Overflow 0 at 1440×900, 1366×768, 768×1024, 390×844; console 0 errors/warnings (normal, reduced motion, WebGL stubbed off, JS disabled).
- [ ] **Step 2:** Contrast sweep 0 fails at 1440 (with trails active after a mouse sweep) and 390.
- [ ] **Step 3:** Mid-page reload at 25/50/75% scroll → visibility sweep: no element with text has computed opacity < .9 inside the viewport after 2.5 s (except `.aw`/heatmap cells inside an active scrub at partial progress — expected partial).
- [ ] **Step 4:** Lighthouse via Chrome DevTools MCP (`lighthouse_audit`, desktop) → Performance ≥ 85, Accessibility ≥ 95. If below, fix the top offender and re-run once.
- [ ] **Step 5:** Full-page stitched screenshots 1440 + 390, a short sequence of frames through each pinned chapter, before/after comparison; show the user and get go-ahead before Figma.

### Tasks 10–12: Figma

As Tasks 9–11 of the previous plan, with the sky palette tokens; liquid shown as a static gradient frame + note. Run only after the user's go-ahead in Task 9.

### Task 13: Final review + hand-off

Self-review against the spec (no fresh-reviewer budget unless the user wants one), clean `.playwright-mcp/` from the portfolio folder, report rulings and deferred minors, ask about committing.
