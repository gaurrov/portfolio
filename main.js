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
  const langColors = ["#0B1B2E", "#FFD23F", "#1F6FB2", "#9FD3F3", "#2E4A66", "#4FA8DE"];
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

      // crosshair: a vertical guide that snaps to the nearest contest
      const xhair = svgEl("line", { class: "xhair", x1: 0, x2: 0, y1: m.t, y2: H - m.b }, svg);
      const tip = tipFor(el);
      const dots = [];
      const htmlFor = (p) => `<strong>${p.y}${p.delta != null ? ` <span>(${signed(p.delta)})</span>` : ""}</strong>${esc(p.name)}<br><span>${fmtDate(p.date, true)}${p.rank ? `, rank ${p.rank.toLocaleString("en-US")}` : ""}</span>`;
      const show = (i) => {
        const cx = x(i), cy = y(points[i].y);
        xhair.setAttribute("x1", cx); xhair.setAttribute("x2", cx);
        el.classList.add("is-tracking");
        dots.forEach((d, k) => d.classList.toggle("on", k === i));
        tip.show(cx, cy, htmlFor(points[i]));
      };
      const hide = () => { el.classList.remove("is-tracking"); dots.forEach((d) => d.classList.remove("on")); tip.hide(); };
      const track = svgEl("rect", { class: "xtrack", x: m.l, y: m.t, width: Math.max(0, W - m.l - m.r), height: Math.max(0, H - m.t - m.b) }, svg);
      track.addEventListener("pointermove", (e) => {
        const r = svg.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        let best = 0;
        points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
        show(best);
      });
      track.addEventListener("pointerleave", hide);

      points.forEach((p, i) => {
        const cx = x(i), cy = y(p.y);
        const band = bands.find((b) => p.y >= b.from && p.y < b.to);
        dots.push(svgEl("circle", { cx, cy, r: 4.5, class: "dot", fill: band && band.dot ? band.dot : color }, svg));
        const hit = svgEl("circle", { cx, cy, r: 14, class: "hit", role: "img", tabindex: 0, "aria-label": `${p.name}: rating ${p.y}` }, svg);
        hit.addEventListener("pointerenter", () => show(i));
        hit.addEventListener("focus", () => show(i));
        hit.addEventListener("pointerleave", hide);
        hit.addEventListener("blur", hide);
      });

      // the peak gets a label
      const peak = ys.lastIndexOf(Math.max(...ys));
      const px = x(peak), py = y(ys[peak]);
      const above = py - 16 > m.t + 4;
      const bestRing = svgEl("circle", { cx: px, cy: py, r: 9, class: "best-ring" }, svg);
      const bestLabel = svgEl("text", { x: px, y: above ? py - 15 : py + 24, "text-anchor": points.length > 1 && peak === points.length - 1 ? "end" : "middle", class: "best" }, svg);
      bestLabel.textContent = "BEST";

      // scenes can draw the line with scroll: p in 0..1
      const apply = () => {
        if (el._p == null) return;
        const p = el._p;
        line.style.transition = "none";
        line.style.strokeDashoffset = len * (1 - p);
        const lastShown = p * Math.max(1, points.length - 1) + 1e-6;
        dots.forEach((d, k) => (d.style.opacity = k <= lastShown ? 1 : 0));
        const peakShown = peak <= lastShown;
        bestRing.style.opacity = bestLabel.style.opacity = peakShown ? 1 : 0;
      };
      el._scrub = (p) => { el._p = p; apply(); };
      apply();
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

  /* ---------- LeetCode ---------- */
  const lcBadges = document.getElementById("lc-badges");
  if (lcBadges) {
    lcBadges.innerHTML =
      (lc.badges || []).map((b) => `<li><img src="${esc(b.icon)}" alt="" width="88" height="88" loading="lazy"><strong>${esc(b.name)}</strong><span>Earned ${fmtDate(b.date, true)}</span></li>`).join("") +
      (lc.upcomingBadges || []).map((b) => `<li class="upcoming"><img src="${esc(b.icon)}" alt="" width="88" height="88" loading="lazy"><strong>${esc(b.name)}</strong><span>${b.progress}% there</span><span class="meter" aria-hidden="true"><i style="width:${b.progress}%"></i></span></li>`).join("");
  }
  const lcHist = (lc.contestHistory || []).map((h, i, a) => ({ ...h, delta: i ? h.rating - a[i - 1].rating : null }));
  ratingChart(document.getElementById("lc-chart"), lcHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#1F6FB2" });
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
  ratingChart(document.getElementById("cf-chart"), cfHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#0B1B2E", bands: cfBands });
  columnChart(document.getElementById("cf-diff"), Object.entries(cf.solvedByRating || {}).map(([k, v]) => ({ label: k, value: v })), { color: "#1F6FB2", unit: "problems" });

  /* ---------- AtCoder ---------- */
  const ac = D.atcoder || {};
  const acBands = [
    { from: 0, to: 400, color: "#808080", dot: "#808080", name: "Gray" },
    { from: 400, to: 800, color: "#804000", dot: "#804000", name: "Brown" },
    { from: 800, to: 1200, color: "#008000", dot: "#008000", name: "Green" },
    { from: 1200, to: 1600, color: "#00c0c0", dot: "#00c0c0", name: "Cyan" },
  ];
  const acHist = (ac.contestHistory || []).map((h) => ({ ...h, delta: h.rating - h.old }));
  ratingChart(document.getElementById("ac-chart"), acHist.map((h) => ({ y: h.rating, name: h.name, date: h.date, rank: h.rank, delta: h.delta })), { color: "#0B1B2E", bands: acBands });

  /* ---------- Rank meters: how far to the next title ---------- */
  const setMeter = (key, label, fill, color) => {
    const m = document.querySelector(`[data-meter="${key}"]`);
    if (!m) return;
    m.querySelector(".meter-label").textContent = label;
    m.style.setProperty("--to", Math.max(0.02, Math.min(1, fill)).toFixed(4));
    if (color) m.style.setProperty("--meter-color", color);
  };
  const bandMeter = (key, rating, bands) => {
    if (typeof rating !== "number") return null;
    const i = bands.findIndex((b) => rating >= b.from && rating < b.to);
    if (i < 0) return null;
    const b = bands[i], next = bands[i + 1];
    const label = next
      ? `${b.name} now. ${next.name} at ${next.from}, ${next.from - rating} to go.`
      : `${b.name}.`;
    setMeter(key, label, (rating - b.from) / (b.to - b.from), b.dot);
    return b;
  };
  bandMeter("cf", cf.rating, cfBands);
  const acBand = bandMeter("ac", ac.rating, acBands);
  document.querySelectorAll(".ac-rank-text").forEach((el) => acBand && (el.textContent = acBand.name));
  const top = lc.contest && lc.contest.topPercentage;
  if (typeof top === "number") {
    setMeter("lc", top <= 25 ? `Top ${top}% of contestants. Knight badge earned.` : `Top ${top}% of contestants. Knight badge at top 25%.`, (100 - top) / 75, "#ffa116");
  }

  /* ---------- LeetCode difficulty ring, drawn like LeetCode's own ---------- */
  const ringEl = document.getElementById("lc-ring");
  if (ringEl && lc.solved && lc.totals) {
    const R = 52, C = 2 * Math.PI * R, GAP = 7;
    const kinds = [["Easy", "#00b8a3"], ["Medium", "#ffc01e"], ["Hard", "#ff375f"]];
    const sum = kinds.reduce((t, [k]) => t + (lc.totals[k] || 0), 0) || 1;
    const svg = svgEl("svg", { viewBox: "0 0 120 120", "aria-hidden": "true" });
    const g = svgEl("g", { transform: "rotate(-90 60 60)" }, svg);
    const center = ringEl.querySelector(".ring-center");
    const big = center && center.querySelector("b"), small = center && center.querySelector("span");
    const reset = () => { if (big) { big.textContent = lc.solved.All; small.textContent = "solved"; } ringEl.classList.remove("is-hot"); g.querySelectorAll(".seg").forEach((s) => s.classList.remove("hot")); };
    let offset = 0;
    const arcs = [];
    kinds.forEach(([k, color]) => {
      const seg = Math.max(0, ((lc.totals[k] || 0) / sum) * C - GAP);
      const len = seg * Math.min(1, (lc.solved[k] || 0) / (lc.totals[k] || 1));
      const grp = svgEl("g", { class: "seg", "data-k": k }, g);
      const dash = (l) => `${l} ${C - l}`;
      svgEl("circle", { cx: 60, cy: 60, r: R, class: "track", stroke: color, "stroke-dasharray": dash(seg), "stroke-dashoffset": -offset }, grp);
      const arc = svgEl("circle", { cx: 60, cy: 60, r: R, class: "arc", stroke: color, "stroke-dasharray": dash(len), "stroke-dashoffset": -offset }, grp);
      arc._len = len; arc._dash = dash; arcs.push(arc);
      svgEl("circle", { cx: 60, cy: 60, r: R, class: "seg-hit", "stroke-dasharray": dash(seg), "stroke-dashoffset": -offset }, grp);
      const hot = () => {
        reset();
        grp.classList.add("hot"); ringEl.classList.add("is-hot");
        if (big) { big.textContent = lc.solved[k]; small.textContent = `of ${lc.totals[k]} ${k.toLowerCase()}`; }
      };
      grp.addEventListener("pointerenter", hot);
      grp.addEventListener("pointerleave", reset);
      const row = document.querySelector(`.diff-row.${k.toLowerCase()}`);
      if (row) { row.addEventListener("pointerenter", hot); row.addEventListener("pointerleave", reset); }
      offset += seg + GAP;
    });
    ringEl.prepend(svg);
    ringEl.setAttribute("aria-label", `${lc.solved.All} of ${lc.totals.All || sum} LeetCode problems solved: ${lc.solved.Easy} easy, ${lc.solved.Medium} medium, ${lc.solved.Hard} hard`);
    ringEl._scrub = (p) => arcs.forEach((a) => a.setAttribute("stroke-dasharray", a._dash(a._len * p)));
  }

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

  // The cinematic chapters live in cinema.js; without it, a plain load sequence keeps the hero visible
  if (window.Cinema) {
    window.Cinema.init({ lenis });
  } else {
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .to(".hero-hello", { opacity: 1, y: 0, duration: 0.9 }, 0.05)
      .to(".hero-photo", { opacity: 1, y: 0, rotate: 0, duration: 1.3 }, 0.3)
      .to(".hero-text .reveal-load:not(.hero-hello)", { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0.55);
  }


  // Chapter titles rise word by word, like the hero name
  function splitTitle(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.classList.remove("reveal");
    el.textContent = "";
    words.forEach((w, i) => {
      const outer = document.createElement("span");
      const inner = document.createElement("span");
      outer.className = "tw";
      outer.setAttribute("aria-hidden", "true");
      inner.textContent = w;
      outer.appendChild(inner);
      if (i) el.appendChild(document.createTextNode(" "));
      el.appendChild(outer);
    });
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: () => gsap.to(el.querySelectorAll(".tw > span"), { y: 0, duration: 1, ease: "expo.out", stagger: 0.08 }),
    });
  }
  document.querySelectorAll(".chapter .h2:not(.about-statement), .certs-sub").forEach(splitTitle);

  // Section reveals
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
  });

  // Count-ups and bars
  document.querySelectorAll("[data-target]").forEach((el) => {
    if (el.closest(".hero") || el.hasAttribute("data-scrub") || el.classList.contains("cp-count")) return;
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
  document.querySelectorAll(".chart:not(.is-scrubbed)").forEach((el) => {
    el.classList.add("is-pending");
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => el._reveal && el._reveal() });
  });
  gsap.from("#gh-cal i:not(.pad)", {
    opacity: 0, duration: 0.4, stagger: { each: 0.0018 },
    scrollTrigger: { trigger: "#gh-cal", start: "top 85%", once: true },
  });

  // Projects slide sideways in cinema.js; without it they stack
  if (!window.Cinema) document.querySelector(".projects").classList.add("is-static");

  addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
