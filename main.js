(() => {
  const D = window.PORTFOLIO_DATA || {};
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canAnimate = !reduce && window.gsap && window.ScrollTrigger;

  /* ---------- Data binding ---------- */
  const lc = D.leetcode || {};
  const sources = {
    lc: { ...lc, topLang: lc.languages && lc.languages[0] && lc.languages[0].name },
    gh: D.github || {},
    ac: D.atcoder || {},
    cc: D.codechef || {},
    cf: { ...(D.codeforces || {}), contestCount: ((D.codeforces || {}).contestHistory || []).length },
  };
  const pick = (path) => {
    const [src, ...rest] = path.split(".");
    return rest.reduce((o, k) => (o == null ? o : o[k]), sources[src]);
  };
  const fmt = (n, el) => (el.dataset.format === "comma" ? Math.round(n).toLocaleString("en-US") : String(Math.round(n)));

  if (D.updated) {
    const human = new Date(D.updated + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    document.querySelectorAll('[data-bind="updated-human"]').forEach((el) => (el.textContent = human));
  }
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const v = pick(el.dataset.bind);
    if (v != null && v !== "") el.textContent = v;
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const v = pick(el.dataset.count);
    if (typeof v === "number") { el.dataset.target = v; el.textContent = fmt(v, el); }
  });

  /* ---------- Heatmaps ---------- */
  const day = 864e5;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const end = D.updated ? Date.parse(D.updated + "T00:00:00Z") : Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  function buildCalendar(el, levelOf, { weeks = 53, markToday = false } = {}) {
    if (!el) return;
    const endDow = new Date(end).getUTCDay();
    const start = end - (weeks * 7 - 1 - (6 - endDow)) * day; // grid ends on the Saturday of this week
    const frag = document.createDocumentFragment();
    for (let t = start; t <= end + (6 - endDow) * day; t += day) {
      const i = document.createElement("i");
      if (t > end) i.className = "pad";
      else {
        const lv = levelOf(iso(t));
        if (lv) i.className = "l" + lv;
        if (markToday && t === end) i.classList.add("today");
      }
      frag.appendChild(i);
    }
    el.appendChild(frag);
  }

  const cal = lc.calendar || {};
  const lcLevel = (d) => { const n = cal[d] || 0; return n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : 4; };
  buildCalendar(document.getElementById("lc-heatmap"), lcLevel, { markToday: true });

  const ghLevels = (D.github && D.github.contributionLevels) || {};
  buildCalendar(document.getElementById("gh-cal"), (d) => ghLevels[d] || 0);

  // Start the LeetCode tape scrolled to today on narrow screens
  const tape = document.querySelector(".tape-scroll");
  if (tape) tape.scrollLeft = tape.scrollWidth;

  /* ---------- GitHub languages ---------- */
  const langColors = ["#2b3ff0", "#ffc933", "#00a889", "#ef4743", "#7d8cff", "#141833"];
  const langs = (D.github && D.github.languages) || [];
  const totalRepos = langs.reduce((s, l) => s + l.repos, 0) || 1;
  const bar = document.getElementById("langbar");
  const list = document.getElementById("langlist");
  langs.slice(0, 6).forEach((l, idx) => {
    const c = langColors[idx];
    const seg = document.createElement("i");
    seg.style.cssText = `flex:${l.repos};background:${c}`;
    bar && bar.appendChild(seg);
    const li = document.createElement("li");
    li.innerHTML = `<i style="background:${c}"></i>${l.name}<span>${Math.round((l.repos / totalRepos) * 100)}%</span>`;
    list && list.appendChild(li);
  });

  /* ---------- Helpers for the platform bands ---------- */
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const thisYear = (D.updated || "").slice(0, 4);
  const fmtDate = (iso, withYear) => {
    if (!iso) return "";
    const dt = new Date(iso + "T00:00:00Z");
    const opts = { day: "numeric", month: "short", timeZone: "UTC" };
    if (withYear || iso.slice(0, 4) !== thisYear) opts.year = "numeric";
    return dt.toLocaleDateString("en-GB", opts);
  };
  const monthYear = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const signed = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "±0");
  const SVG = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n);
    return n;
  };
  const niceStep = (span) => {
    const raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  };

  // Shared tooltip, positioned inside each chart box
  function tipFor(el) {
    let tip = el.querySelector(".chart-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip"; tip.setAttribute("role", "status"); el.appendChild(tip); }
    return {
      show: (x, y, html) => { tip.innerHTML = html; tip.style.left = x + "px"; tip.style.top = y + "px"; tip.classList.add("on"); },
      hide: () => tip.classList.remove("on"),
    };
  }

  // Draws on every resize; the first scroll into view plays the line draw
  function responsive(el, draw) {
    if (!el) return;
    let revealed = false;
    el._reveal = () => { revealed = true; el.classList.remove("is-pending"); el.querySelectorAll(".line").forEach((p) => (p.style.strokeDashoffset = 0)); };
    const run = () => {
      if (!el.clientWidth) return;
      draw(el.clientWidth, el.clientHeight, revealed);
    };
    new ResizeObserver(run).observe(el);
  }

  /* Single-series rating line over the platform's own rank bands */
  function ratingChart(el, points, { color, bands = [], pad = 50 } = {}) {
    if (!el || !points.length) return;
    responsive(el, (W, H, revealed) => {
      el.querySelectorAll("svg").forEach((n) => n.remove());
      const m = { l: 44, r: 14, t: 10, b: 26 };
      const ys = points.map((p) => p.y);
      let lo, hi;
      if (bands.length) {
        lo = 0;
        hi = (bands.find((b) => b.to > Math.max(...ys) + 40) || bands[bands.length - 1]).to;
      } else {
        lo = Math.floor((Math.min(...ys) - pad) / pad) * pad;
        hi = Math.ceil((Math.max(...ys) + pad) / pad) * pad;
      }
      const x = (i) => m.l + (points.length === 1 ? (W - m.l - m.r) / 2 : (i / (points.length - 1)) * (W - m.l - m.r));
      const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": el.getAttribute("aria-label") || "Rating history" });
      el.prepend(svg);

      bands.filter((b) => b.from < hi).forEach((b) => {
        const top = y(Math.min(b.to, hi)), bottom = y(b.from);
        svgEl("rect", { x: m.l, y: top, width: W - m.l - m.r, height: bottom - top, fill: b.color, opacity: 0.2 }, svg);
        if (bottom - top > 16) {
          // label on whichever side the line is farther from it
          const ly = top + 10, leftGap = Math.abs(y(ys[0]) - ly), rightGap = Math.abs(y(ys[ys.length - 1]) - ly);
          const left = leftGap >= rightGap;
          svgEl("text", { x: left ? m.l + 8 : W - m.r - 8, y: top + 14, "text-anchor": left ? "start" : "end", class: "band-label" }, svg).textContent = b.name;
        }
      });

      const grid = svgEl("g", { class: "grid" }, svg), axis = svgEl("g", { class: "axis" }, svg);
      const step = bands.length ? 200 : niceStep(hi - lo);
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
        if (!bands.length) svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, grid);
        svgEl("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, axis).textContent = v;
      }
      const first = points[0], last = points[points.length - 1];
      svgEl("text", { x: x(0), y: H - 6, "text-anchor": "start" }, axis).textContent = monthYear(first.date);
      if (points.length > 1) svgEl("text", { x: x(points.length - 1), y: H - 6, "text-anchor": "end" }, axis).textContent = monthYear(last.date);

      const d = points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.y).toFixed(1)).join(" ");
      const line = svgEl("path", { d, class: "line", stroke: color }, svg);
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = revealed || !el.classList.contains("is-pending") ? 0 : len;
      line.style.transition = "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.1,1)";

      const tip = tipFor(el);
      points.forEach((p, i) => {
        const cx = x(i), cy = y(p.y);
        const band = bands.find((b) => p.y >= b.from && p.y < b.to);
        svgEl("circle", { cx, cy, r: 4.5, class: "dot", fill: band && band.dot ? band.dot : color }, svg);
        const hit = svgEl("circle", { cx, cy, r: 14, class: "hit", role: "img", tabindex: 0, "aria-label": `${p.name}: rating ${p.y}` }, svg);
        const html = `<strong>${p.y}${p.delta != null ? ` <span>(${signed(p.delta)})</span>` : ""}</strong>${esc(p.name)}<br><span>${fmtDate(p.date, true)}${p.rank ? `, rank ${p.rank.toLocaleString("en-US")}` : ""}</span>`;
        const on = () => tip.show(cx, cy, html);
        hit.addEventListener("pointerenter", on);
        hit.addEventListener("focus", on);
        hit.addEventListener("pointerleave", tip.hide);
        hit.addEventListener("blur", tip.hide);
      });
    });
  }

  /* Single-series column chart, value printed on each of the few bars */
  function columnChart(el, items, { color, unit = "" } = {}) {
    if (!el || !items.length) return;
    responsive(el, (W, H) => {
      el.querySelectorAll("svg").forEach((n) => n.remove());
      const m = { l: 8, r: 8, t: 20, b: 26 };
      const max = Math.max(...items.map((d) => d.value));
      const slot = (W - m.l - m.r) / items.length, bw = Math.max(6, slot - 6);
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": el.getAttribute("aria-label") || "" });
      el.prepend(svg);
      const axis = svgEl("g", { class: "axis" }, svg);
      const tip = tipFor(el);
      items.forEach((d, i) => {
        const h = Math.max(3, (d.value / max) * (H - m.t - m.b));
        const bx = m.l + i * slot + (slot - bw) / 2, by = H - m.b - h;
        svgEl("path", { class: "bar", fill: color, d: `M${bx} ${by + 4}a4 4 0 0 1 4-4h${bw - 8}a4 4 0 0 1 4 4V${H - m.b}H${bx}Z` }, svg);
        svgEl("text", { x: bx + bw / 2, y: by - 6, "text-anchor": "middle", class: "bar-label" }, svg).textContent = d.value;
        svgEl("text", { x: bx + bw / 2, y: H - 8, "text-anchor": "middle" }, axis).textContent = d.label;
        const hit = svgEl("rect", { x: m.l + i * slot, y: m.t, width: slot, height: H - m.t - m.b, class: "hit", role: "img", tabindex: 0, "aria-label": `${d.value} ${unit} rated ${d.label}` }, svg);
        const on = () => tip.show(bx + bw / 2, by, `<strong>${d.value} solved</strong><span>Problem rating ${d.label}</span>`);
        hit.addEventListener("pointerenter", on);
        hit.addEventListener("focus", on);
        hit.addEventListener("pointerleave", tip.hide);
        hit.addEventListener("blur", tip.hide);
      });
    });
  }

  function contestTable(el, rows, { link, showSolved = false } = {}) {
    if (!el) return;
    const newest = rows.slice().reverse();
    el.innerHTML =
      `<thead><tr><th scope="col">Contest</th><th scope="col" class="num">Rank</th>${showSolved ? '<th scope="col" class="num">Solved</th>' : ""}<th scope="col" class="num">Change</th><th scope="col" class="num">Rating</th></tr></thead><tbody>` +
      newest.map((r) => {
        const name = link ? `<a href="${esc(link(r))}" target="_blank" rel="noopener">${esc(r.name)}</a>` : esc(r.name);
        const cls = r.delta > 0 ? "up" : r.delta < 0 ? "down" : "";
        return `<tr><td>${name}<span class="muted">${fmtDate(r.date, true)}</span></td><td class="num">${r.rank.toLocaleString("en-US")}</td>${showSolved ? `<td class="num">${r.solved}/${r.of}</td>` : ""}<td class="num ${cls}">${r.delta == null ? "–" : signed(r.delta)}</td><td class="num"><b>${r.rating}</b></td></tr>`;
      }).join("") + "</tbody>";
  }

  /* ---------- LeetCode ---------- */
  const lcBadges = document.getElementById("lc-badges");
  if (lcBadges) {
    lcBadges.innerHTML =
      (lc.badges || []).map((b) => `<li><img src="${esc(b.icon)}" alt="" width="88" height="88" loading="lazy"><strong>${esc(b.name)}</strong><span>Earned ${fmtDate(b.date, true)}</span></li>`).join("") +
      (lc.upcomingBadges || []).map((b) => `<li class="upcoming"><img src="${esc(b.icon)}" alt="" width="88" height="88" loading="lazy"><strong>${esc(b.name)}</strong><span>${b.progress}% there</span><span class="meter" aria-hidden="true"><i style="width:${b.progress}%"></i></span></li>`).join("");
  }
  const lcHist = (lc.contestHistory || []).map((h, i, a) => ({ ...h, delta: i ? h.rating - a[i - 1].rating : null }));
  ratingChart(document.getElementById("lc-chart"), lcHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#ffa116" });
  contestTable(document.getElementById("lc-contests"), lcHist, { showSolved: true, link: (r) => "https://leetcode.com/contest/" + r.name.toLowerCase().replace(/\s+/g, "-") + "/" });
  const lcRecent = document.getElementById("lc-recent");
  if (lcRecent) {
    const langName = { java: "Java", python3: "Python", python: "Python", cpp: "C++", c: "C", mysql: "MySQL" };
    lcRecent.innerHTML = (lc.recent || []).slice(0, 10).map((r) =>
      `<li><time datetime="${r.date}">${fmtDate(r.date)}</time><span><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><span class="tag">${esc(langName[r.lang] || r.lang)}</span></span></li>`).join("");
  }
  const lcLangs = document.getElementById("lc-langs");
  if (lcLangs && lc.languages) lcLangs.textContent = lc.languages.map((l) => `${l.name} ${l.count}`).join(", ");

  /* ---------- Codeforces ---------- */
  const cf = D.codeforces || {};
  const cfBands = [
    { from: 0, to: 1200, color: "#9e9e9e", dot: "#808080", name: "Newbie" },
    { from: 1200, to: 1400, color: "#3fbf3f", dot: "#008000", name: "Pupil" },
    { from: 1400, to: 1600, color: "#03a89e", dot: "#03a89e", name: "Specialist" },
    { from: 1600, to: 1900, color: "#4d5bff", dot: "#0000ff", name: "Expert" },
    { from: 1900, to: 2100, color: "#aa00aa", dot: "#aa00aa", name: "Candidate master" },
  ];
  const cfHist = (cf.contestHistory || []).map((h) => ({ ...h, delta: h.rating - h.old }));
  ratingChart(document.getElementById("cf-chart"), cfHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#0f2230", bands: cfBands });
  columnChart(document.getElementById("cf-diff"), Object.entries(cf.solvedByRating || {}).map(([k, v]) => ({ label: k, value: v })), { color: "#1f8acb", unit: "problems" });
  contestTable(document.getElementById("cf-contests"), cfHist, { link: (r) => "https://codeforces.com/contest/" + r.id });

  /* ---------- AtCoder ---------- */
  const ac = D.atcoder || {};
  const acBands = [
    { from: 0, to: 400, color: "#808080", dot: "#808080", name: "Gray" },
    { from: 400, to: 800, color: "#804000", dot: "#804000", name: "Brown" },
    { from: 800, to: 1200, color: "#008000", dot: "#008000", name: "Green" },
    { from: 1200, to: 1600, color: "#00c0c0", dot: "#00c0c0", name: "Cyan" },
  ];
  const acHist = (ac.contestHistory || []).map((h) => ({ ...h, delta: h.rating - h.old }));
  ratingChart(document.getElementById("ac-chart"), acHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#000", bands: acBands });
  contestTable(document.getElementById("ac-contests"), acHist, { link: (r) => r.url });

  /* ---------- GitHub activity ---------- */
  const gh = D.github || {};
  const ghFeed = document.getElementById("gh-activity");
  if (ghFeed) {
    ghFeed.innerHTML = (gh.activity || []).slice(0, 12).map((a) =>
      `<li><time datetime="${a.date}">${fmtDate(a.date)}</time><span><i class="kind ${esc(a.kind)}" aria-hidden="true"></i><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.text)}</a>${a.times > 1 ? ` <span class="times">${a.times} times</span>` : ""}</span></li>`).join("");
  }
  const ghRepos = document.getElementById("gh-repos");
  if (ghRepos) {
    ghRepos.innerHTML = (gh.recentRepos || []).map((r) =>
      `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><p>${r.description ? esc(r.description.trim()) + ". " : ""}${r.language ? esc(r.language) + ", " : ""}updated ${fmtDate(r.pushed)}${r.stars ? `, ${r.stars} star${r.stars > 1 ? "s" : ""}` : ""}</p></li>`).join("");
  }

  /* ---------- Difficulty bars ---------- */
  const barTargets = [...document.querySelectorAll("[data-bar]")].map((el) => {
    const k = el.dataset.bar;
    const solved = (lc.solved || {})[k] || 0, total = (lc.totals || {})[k] || 1;
    return { el, pct: Math.max(2, (solved / total) * 100) };
  });

  /* ---------- Nav: progress, hide on scroll down, active link ---------- */
  const nav = document.querySelector(".nav");
  const progress = document.querySelector(".progress span");
  let lastY = 0;
  const onScroll = (y) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("is-scrolled", y > 8);
    nav.classList.toggle("is-hidden", y > lastY && y > 400);
    lastY = y;
  };
  const links = [...document.querySelectorAll(".nav ul a")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => { const s = document.querySelector(a.getAttribute("href")); s && io.observe(s); });

  /* ---------- No-motion path ---------- */
  if (!canAnimate) {
    root.classList.remove("js-motion");
    barTargets.forEach((b) => (b.el.style.width = b.pct + "%"));
    document.querySelector(".projects").classList.add("is-static");
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    return;
  }

  /* ---------- Motion ---------- */
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("motion-ready");

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const lenis = window.Lenis ? new Lenis({ lerp: 0.11, smoothWheel: true }) : null;
  window.lenis = lenis;
  if (lenis) {
    lenis.on("scroll", (e) => { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      ev.preventDefault();
      lenis ? lenis.scrollTo(target, { offset: a.getAttribute("href") === "#top" ? 0 : -20 }) : target.scrollIntoView();
      if (a.classList.contains("skip")) target.focus({ preventScroll: true });
    });
  });

  // Page-load sequence: name rises, intro follows, then the year of LeetCode fills in day by day
  const cells = document.querySelectorAll(".heatmap i:not(.pad)");
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .to(".hero-name .word", { y: 0, duration: 1.2, stagger: 0.12 }, 0.1)
    .to(".hero-hello", { opacity: 1, y: 0, duration: 0.9 }, 0.05)
    .to(".hero-photo", { opacity: 1, y: 0, rotate: 0, duration: 1.3 }, 0.3)
    .to(".hero-text .reveal-load:not(.hero-hello)", { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0.55)
    .to(cells, { scale: 1, duration: 0.5, ease: "back.out(2.2)", stagger: { each: 0.0026, from: "start" } }, 0.75);

  // Section reveals
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
  });

  // Count-ups and bars
  document.querySelectorAll("[data-target]").forEach((el) => {
    if (el.closest(".hero")) return;
    const target = +el.dataset.target;
    const o = { v: 0 };
    el.textContent = fmt(0, el);
    ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: "power3.out", onUpdate: () => (el.textContent = fmt(o.v, el)) }),
    });
  });
  ScrollTrigger.create({
    trigger: ".diff", start: "top 88%", once: true,
    onEnter: () => barTargets.forEach((b, i) => gsap.to(b.el, { width: b.pct + "%", duration: 1.4, delay: i * 0.12, ease: "power3.out" })),
  });
  // Charts draw their line (or grow their bars) the first time they scroll into view
  document.querySelectorAll(".chart").forEach((el) => {
    el.classList.add("is-pending");
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => el._reveal && el._reveal() });
  });
  gsap.from("#gh-cal i:not(.pad)", {
    opacity: 0, duration: 0.4, stagger: { each: 0.0018 },
    scrollTrigger: { trigger: "#gh-cal", start: "top 85%", once: true },
  });

  // Projects slide sideways while you scroll down (wide screens only)
  const mm = gsap.matchMedia();
  const projects = document.querySelector(".projects");
  const track = document.getElementById("track");
  mm.add("(min-width: 861px)", () => {
    projects.classList.remove("is-static");
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".projects-pin",
        start: "top top",
        end: () => "+=" + distance(),
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    // each panel eases in as it reaches the viewport
    gsap.utils.toArray(".proj").forEach((panel) => {
      gsap.from(panel.querySelectorAll(".proj-top, .flow, .proj-foot, .btn"), {
        opacity: 0, y: 30, stagger: 0.06, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left 85%", once: true },
      });
    });
    return () => projects.classList.add("is-static");
  });
  mm.add("(max-width: 860px)", () => {
    projects.classList.add("is-static");
    gsap.utils.toArray(".proj").forEach((panel) => {
      gsap.from(panel, { opacity: 0, y: 40, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: panel, start: "top 88%", once: true } });
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
