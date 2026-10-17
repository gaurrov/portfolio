/* Cinematic chapters: scroll choreography for each section, plus the intro.
   main.js calls Cinema.init() from its motion path only, so reduced motion and no-JS
   visitors never see any of this and get the plain, fully visible page. */
(() => {
  "use strict";

  const WIDE = "(min-width: 861px)";
  const NARROW = "(max-width: 860px)";
  const STAGE = "(min-width: 861px) and (min-height: 700px)";
  const NO_STAGE = "(max-width: 860px), (max-height: 699px)";

  window.Cinema = {
    init({ lenis }) {
      const mm = gsap.matchMedia();
      intro(lenis);
      heroChapter(mm);
      aboutChapter(mm);
      experienceChapter(mm);
      projectsChapter(mm);
      codingChapter(mm);
      arenaChapter(mm);
      certsChapter(mm);
      skillsChapter();
      contactChapter();
      interactions();
    },
  };

  /* Wrap each word of el in <span class="aw">, keeping the sentence as the accessible name. */
  function splitWords(el, cls) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.textContent = "";
    return words.map((w, i) => {
      if (i) el.appendChild(document.createTextNode(" "));
      const s = document.createElement("span");
      s.className = cls;
      s.setAttribute("aria-hidden", "true");
      s.textContent = w;
      el.appendChild(s);
      return s;
    });
  }

  /* Wrap each visible character of el in <span class="ch">; spaces stay plain text. */
  function splitLetters(el) {
    const text = el.textContent;
    el.textContent = "";
    const out = [];
    for (const c of text) {
      if (/\s/.test(c)) { el.appendChild(document.createTextNode(c)); continue; }
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      el.appendChild(s);
      out.push(s);
    }
    return out;
  }

  /* 00 Intro: loader wipes away, the name assembles out of the liquid */
  function intro(lenis) {
    const root = document.documentElement;
    const loader = document.querySelector(".loader");
    const seen = root.classList.contains("intro-seen");
    try { sessionStorage.setItem("gn-intro", "1"); } catch (e) { /* private mode */ }

    const letters = [];
    document.querySelectorAll(".hero-name .word").forEach((w) => letters.push(...splitLetters(w)));

    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (!seen && loader) {
      if (lenis) lenis.stop();
      gsap.set(loader, { clipPath: "inset(0% 0% 0% 0%)" });
      tl.to(".loader-bar i", { scaleX: 1, duration: 0.7, ease: "power2.inOut" })
        .to(".loader-mark", { yPercent: -30, opacity: 0, duration: 0.35, ease: "power2.in" }, "-=0.1")
        .to(loader, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.65, ease: "power4.inOut" }, "-=0.15")
        .add(() => {
          loader.remove();
          if (lenis) lenis.start();
          if (window.Liquid) window.Liquid.splash(innerWidth * 0.3, innerHeight * 0.42, 1);
        }, "-=0.3");
    } else if (loader) {
      loader.remove();
    }

    const at = seen ? 0.1 : "-=0.35";
    // y: 0 matters: GSAP reads the CSS translateY(110%) as a pixel y that yPercent alone would leave behind
    tl.fromTo(letters, { y: 0, yPercent: 110, rotate: 8 }, { y: 0, yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.035 }, at)
      .to(".hero-hello", { opacity: 1, y: 0, duration: 0.9 }, "<")
      .to(".hero-photo", { opacity: 1, y: 0, rotate: 0, duration: 1.3 }, "<0.15")
      .to(".hero-text .reveal-load:not(.hero-hello)", { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, "<0.25");
  }

  /* 01 Hero: pinned briefly, the name settles back as the page takes over */
  function heroChapter(mm) {
    mm.add(WIDE, () => {
      const fade = { opacity: 0, y: -40, ease: "none", immediateRender: false };
      gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "+=60%", pin: true, scrub: 0.6 } })
        .fromTo(".hero-name", { scale: 1, y: 0 }, { scale: 0.82, y: "-6vh", transformOrigin: "0% 50%", ease: "none", immediateRender: false }, 0)
        .fromTo([".hero-hello", ".hero-lede", ".hero-actions", ".hero-links"], { opacity: 1, y: 0 }, { ...fade, stagger: 0.04 }, 0)
        .fromTo(".hero-photo", { y: 0 }, { y: "-10vh", ease: "none", immediateRender: false }, 0)
        .fromTo(".scroll-cue", { opacity: 1 }, { opacity: 0, ease: "none", duration: 0.3, immediateRender: false }, 0);
    });
  }

  /* 02 About: the statement fills in word by word as you scroll */
  function aboutChapter(mm) {
    const title = document.getElementById("about-title");
    title.classList.remove("reveal");
    const words = splitWords(title, "aw");
    const facts = document.querySelectorAll(".facts > div");
    mm.add(WIDE, () => {
      gsap.timeline({ scrollTrigger: { trigger: ".about", start: "center center", end: "+=80%", pin: true, scrub: 0.5 } })
        .fromTo(words, { opacity: 0.18 }, { opacity: 1, stagger: 0.12, duration: 0.4, ease: "none" }, 0)
        .fromTo(facts, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.3, ease: "power2.out" }, ">-0.1");
    });
    mm.add(NARROW, () => {
      gsap.fromTo(words, { opacity: 0.18 }, {
        opacity: 1, stagger: 0.06, ease: "none",
        scrollTrigger: { trigger: title, start: "top 80%", end: "bottom 45%", scrub: true },
      });
    });
  }

  /* 03 Experience: the process line draws itself and each role steps up on its dot */
  function experienceChapter(mm) {
    const line = document.querySelector(".timeline");
    const items = gsap.utils.toArray(".tl-item");
    const stops = [0, 0.45, 0.9];
    items.slice(1).forEach((it) => it.classList.remove("reveal"));
    const reach = (p) => items.forEach((it, i) => it.classList.toggle("is-reached", p >= stops[i] - 0.001));

    mm.add(WIDE, () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#work", start: "top top", end: "+=120%", pin: true, scrub: 0.6,
          onUpdate: (self) => reach(self.progress), onLeaveBack: () => reach(0),
        },
      });
      tl.fromTo(line, { "--draw": 0 }, { "--draw": 1, duration: 1, ease: "none", immediateRender: false }, 0);
      items.slice(1).forEach((it, i) => {
        tl.fromTo(it, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out", immediateRender: false }, stops[i + 1]);
      });
      gsap.set(items.slice(1), { opacity: 0, y: 50 });
      reach(0);
      return () => { items.forEach((it) => it.classList.add("is-reached")); };
    });
    mm.add(NARROW, () => {
      gsap.fromTo(line, { "--draw": 0 }, {
        "--draw": 1, ease: "none",
        scrollTrigger: { trigger: line, start: "top 75%", end: "bottom 60%", scrub: true, onUpdate: (self) => reach(self.progress) },
      });
      items.slice(1).forEach((it) => gsap.from(it, { opacity: 0, y: 40, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: it, start: "top 85%", once: true } }));
    });
  }

  /* 04 Projects: cards slide sideways, lean into the motion, and draw their process lines */
  function projectsChapter(mm) {
    const projects = document.querySelector(".projects");
    const track = document.getElementById("track");
    const cards = gsap.utils.toArray(".proj");
    const flows = gsap.utils.toArray(".proj .flow");

    mm.add(WIDE, () => {
      projects.classList.remove("is-static");
      gsap.set(cards, { transformPerspective: 1200 });
      gsap.set(flows, { "--draw": 0 });
      const tilt = cards.map((c) => gsap.quickTo(c, "rotationY", { duration: 0.5, ease: "power3.out" }));
      let settle = 0;
      const lean = (v) => {
        const deg = gsap.utils.clamp(-12, 12, -v / 140);
        tilt.forEach((q) => q(deg));
        clearTimeout(settle);
        settle = setTimeout(() => tilt.forEach((q) => q(0)), 140);
      };

      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: ".projects-pin", start: "top top", end: () => "+=" + distance(),
          pin: true, scrub: 0.6, invalidateOnRefresh: true,
          onUpdate: (self) => lean(self.getVelocity()),
        },
      });

      cards.forEach((card) => {
        // cards already on screen before the track moves can't wait for the track: they
        // reveal on the section's arrival instead (otherwise they sit invisible just above the pin)
        const visibleAtStart = card.offsetLeft < innerWidth * 0.7; // offsetLeft ignores the track's transform
        const when = (start) => (visibleAtStart
          ? { trigger: ".projects-pin", start: "top 70%", once: true }
          : { trigger: card, containerAnimation: tween, start, once: true });
        gsap.from(card.querySelectorAll(".proj-top, .flow, .proj-foot, .btn"), {
          opacity: 0, y: 30, stagger: 0.06, duration: 0.7, ease: "power3.out", scrollTrigger: when("left 85%"),
        });
        const flow = card.querySelector(".flow");
        if (flow) gsap.to(flow, { "--draw": 1, duration: 1.1, ease: "power2.inOut", scrollTrigger: when("left 70%") });
      });
      return () => {
        clearTimeout(settle);
        projects.classList.add("is-static");
        gsap.set(flows, { "--draw": 1 });
      };
    });

    mm.add(NARROW, () => {
      projects.classList.add("is-static");
      cards.forEach((card) => {
        gsap.from(card, { opacity: 0, y: 40, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
      });
    });
  }

  /* 05 Coding: the count climbs while the year of LeetCode fills in, day by day */
  function codingChapter(mm) {
    const stage = document.querySelector(".cp-stage");
    const countEl = document.querySelector(".cp-count");
    const cells = gsap.utils.toArray("#lc-heatmap i:not(.pad)");
    if (!stage || !countEl) return;
    const target = +countEl.dataset.target || +countEl.textContent.replace(/\D/g, "") || 0;
    const fill = (p) => {
      countEl.textContent = String(Math.round(p * target));
      const n = Math.round(p * cells.length);
      cells.forEach((c, i) => c.classList.toggle("on", i < n));
    };
    const scrubbed = (st) => {
      stage.classList.add("is-scrubbed");
      fill(st.progress);
    };

    mm.add(WIDE, () => {
      const st = ScrollTrigger.create({
        trigger: stage, start: "center center", end: "+=150%", pin: true, scrub: true,
        onUpdate: (self) => fill(self.progress),
        onRefresh: (self) => fill(self.progress),
      });
      scrubbed(st);
      return () => { stage.classList.remove("is-scrubbed"); fill(1); };
    });
    mm.add(NARROW, () => {
      const st = ScrollTrigger.create({
        trigger: stage, start: "top 75%", end: "bottom 55%", scrub: true,
        onUpdate: (self) => fill(self.progress),
        onRefresh: (self) => fill(self.progress),
      });
      scrubbed(st);
      return () => { stage.classList.remove("is-scrubbed"); fill(1); };
    });

    // badges fan in like a hand of cards
    const badges = gsap.utils.toArray("#lc-badges li");
    if (badges.length) {
      gsap.from(badges, {
        opacity: 0, y: 60, rotate: (i) => (i % 2 ? 14 : -14), x: (i) => (i - badges.length / 2) * -18,
        duration: 0.9, ease: "back.out(1.6)", stagger: 0.06,
        scrollTrigger: { trigger: "#lc-badges", start: "top 85%", once: true },
      });
    }

    // each platform band slides in from the right as it arrives
    gsap.utils.toArray("#solving .plat:not(.scene) > .wrap").forEach((w) => {
      gsap.fromTo(w, { xPercent: 6, opacity: 0 }, {
        xPercent: 0, opacity: 1, ease: "power2.out",
        scrollTrigger: { trigger: w, start: "top 92%", end: "top 55%", scrub: 0.5 },
      });
    });
  }

  /* 05b Arena: each platform pins as a scene; the rating counts up, the rank meter fills,
     the chart draws itself and LeetCode's ring sweeps in, all with scroll */
  function arenaChapter(mm) {
    const scenes = gsap.utils.toArray("#solving .scene");
    const rail = document.querySelector(".plat-rail");
    const links = rail ? gsap.utils.toArray(".plat-rail a") : [];

    const ease2 = gsap.parseEase("power2.out"), ease3 = gsap.parseEase("power3.out");
    const clamp = gsap.utils.clamp(0, 1);
    scenes.forEach((scene) => {
      const grid = scene.querySelector(".scene-grid");
      const num = scene.querySelector(".scene-num");
      const meter = scene.querySelector(".rank-meter");
      const ring = scene.querySelector(".lc-ring");
      const charts = gsap.utils.toArray(scene.querySelectorAll(".chart:not(.chart-short)"));
      charts.forEach((c) => c.classList.add("is-scrubbed"));
      const target = num ? +num.dataset.target || +num.textContent.replace(/\D/g, "") || 0 : 0;
      const meterTo = () => (meter ? parseFloat(getComputedStyle(meter).getPropertyValue("--to")) || 1 : 1);

      const play = (p) => {
        const a = clamp(p / 0.45);
        if (num) num.textContent = String(Math.round(target * ease2(a)));
        if (meter) meter.style.setProperty("--fill", (meterTo() * ease2(clamp((p - 0.05) / 0.5))).toFixed(4));
        const c = clamp((p - 0.1) / 0.75);
        charts.forEach((ch) => (ch._scrub ? ch._scrub(c) : (ch._p = c)));
        if (ring && ring._scrub) ring._scrub(ease3(clamp(p / 0.6)));
      };

      mm.add(STAGE, () => {
        ScrollTrigger.create({
          trigger: grid, start: "center center", end: "+=90%", pin: true, scrub: true,
          onUpdate: (self) => play(self.progress), onRefresh: (self) => play(self.progress),
        });
        return () => play(1);
      });
      mm.add(NO_STAGE, () => {
        ScrollTrigger.create({
          trigger: grid, start: "top 80%", end: "center 45%", scrub: true,
          onUpdate: (self) => play(self.progress), onRefresh: (self) => play(self.progress),
        });
        return () => play(1);
      });
    });

    // created after the pins, so these positions include the pins' extra scroll length
    if (rail) {
      ScrollTrigger.create({
        trigger: "#leetcode", endTrigger: "#codechef", start: "top 60%", end: "bottom 40%",
        onToggle: (self) => rail.classList.toggle("is-on", self.isActive),
      });
      ["#leetcode", "#codeforces", "#atcoder", "#codechef"].forEach((id, i) => {
        ScrollTrigger.create({
          trigger: id, start: "top 50%", end: "bottom 50%",
          onToggle: (self) => self.isActive && links.forEach((a, j) => a.classList.toggle("is-active", j === i)),
        });
      });
    }
  }

  /* 07 Certifications: the two cards arrive as a stacked deck and deal out into place */
  function certsChapter(mm) {
    const deck = document.querySelector(".cert-feature");
    const cards = gsap.utils.toArray(".cert-feature .cert-card");
    if (!deck || cards.length < 2) return;
    mm.add(WIDE, () => {
      cards.forEach((c) => c.classList.remove("reveal"));
      gsap.set(cards[1], { zIndex: 2 });
      gsap.timeline({ scrollTrigger: { trigger: deck, start: "center 55%", end: "+=60%", pin: true, scrub: 0.6 } })
        .fromTo(cards[1], { xPercent: -104, yPercent: 6, rotate: -7, scale: 0.94 }, { xPercent: 0, yPercent: 0, rotate: 0, scale: 1, ease: "power2.inOut" }, 0)
        .fromTo(cards[0], { rotate: 3, yPercent: 3 }, { rotate: 0, yPercent: 0, ease: "power2.inOut" }, 0);
    });
  }

  /* 08 Skills: two marquee bands of every skill, running faster while you scroll */
  function skillsChapter() {
    const grid = document.querySelector(".skill-grid");
    const names = gsap.utils.toArray(".skill-group li").map((li) => li.textContent.trim());
    if (!grid || !names.length) return;
    const half = Math.ceil(names.length / 2);
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const row = (list, cls) => {
      const r = document.createElement("div");
      r.className = "mq-row" + (cls ? " " + cls : "");
      const chunk = list.map((n) => `<span>${esc(n)}</span><i></i>`).join("");
      r.innerHTML = chunk + chunk; // two copies: sliding by half loops seamlessly
      return r;
    };
    const marquee = document.createElement("div");
    marquee.className = "marquee";
    marquee.setAttribute("aria-hidden", "true");
    const a = row(names.slice(0, half)), b = row(names.slice(half), "mq-rev");
    marquee.append(a, b);
    grid.parentNode.insertBefore(marquee, grid);

    const loops = [
      gsap.fromTo(a, { xPercent: 0 }, { xPercent: -50, duration: 46, ease: "none", repeat: -1 }),
      gsap.fromTo(b, { xPercent: -50 }, { xPercent: 0, duration: 52, ease: "none", repeat: -1 }),
    ];
    ScrollTrigger.create({
      trigger: ".skills", start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        const boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 350);
        loops.forEach((l) => gsap.to(l, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: () => gsap.to(l, { timeScale: 1, duration: 1.2 }) }));
      },
      onToggle: (self) => loops.forEach((l) => (self.isActive ? l.play() : l.pause())),
    });
  }

  /* 09 Contact: a giant LET'S TALK that ripples the liquid as you move across it */
  function contactChapter() {
    const big = document.querySelector(".contact-big");
    if (!big) return;
    big.classList.remove("reveal");
    // keep each word whole so the line only breaks between words
    const words = big.textContent.trim().split(/\s+/);
    big.textContent = "";
    const letters = [];
    words.forEach((w, i) => {
      if (i) big.appendChild(document.createTextNode(" "));
      const span = document.createElement("span");
      span.className = "cw";
      span.textContent = w;
      big.appendChild(span);
      letters.push(...splitLetters(span));
    });
    gsap.fromTo(letters, { yPercent: 60, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.04,
      scrollTrigger: { trigger: big, start: "top 85%", once: true },
    });
    let last = 0;
    big.addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - last < 80 || !window.Liquid) return;
      last = now;
      window.Liquid.splash(e.clientX, e.clientY, 0.6);
    });
  }

  /* Cursor, magnetic buttons and scrambled labels: fine pointers only */
  function interactions() {
    document.querySelectorAll(".nav ul a span, .proj h3").forEach((el) => el.addEventListener("mouseenter", () => scramble(el)));
    if (!matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    const cursor = document.querySelector(".cursor");
    const dot = cursor && cursor.querySelector(".cursor-dot");
    const ring = cursor && cursor.querySelector(".cursor-ring");
    if (!cursor || !dot || !ring) return;
    root.classList.add("has-cursor");

    const dx = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3" });
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      cursor.classList.add("is-on");
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const t = e.target instanceof Element ? e.target : null;
      ring.classList.toggle("is-link", !!(t && t.closest("a, button")));
      cursor.classList.toggle("on-dark", !!(t && t.closest(".band-dark, .proj-feature, .lc-side")));
    }, { passive: true });
    document.addEventListener("mouseleave", () => cursor.classList.remove("is-on"));
    document.addEventListener("mouseenter", () => cursor.classList.add("is-on"));

    gsap.utils.toArray(".btn, .plat-cta, .nav-mark").forEach((el) => magnetize(el, 8));

    // spotlight panels: a glow follows the pointer
    document.querySelectorAll(".spot").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
      el.addEventListener("pointerleave", () => { el.style.removeProperty("--mx"); el.style.removeProperty("--my"); });
    });

    // badges tilt toward the pointer
    document.querySelectorAll(".lc-badges li").forEach((li) => {
      gsap.set(li, { transformPerspective: 500 });
      const rx = gsap.quickTo(li, "rotationX", { duration: 0.4, ease: "power3" });
      const ry = gsap.quickTo(li, "rotationY", { duration: 0.4, ease: "power3" });
      li.addEventListener("pointermove", (e) => {
        const r = li.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 26);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 26);
      });
      li.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* Lean an element toward the pointer, up to `strength` px, and spring back on leave. */
  function magnetize(el, strength) {
    const mx = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
    const my = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      mx(gsap.utils.clamp(-1, 1, px) * strength);
      my(gsap.utils.clamp(-1, 1, py) * strength);
    });
    el.addEventListener("pointerleave", () => { mx(0); my(0); });
  }

  /* Shuffle a label through random glyphs for a moment, then land on the real text. */
  function scramble(el) {
    if (el.dataset.scrambling) return;
    const text = el.textContent;
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    el.dataset.scrambling = "1";
    const start = performance.now(), dur = 380;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const keep = Math.floor(p * text.length);
      el.textContent = text.split("").map((c, i) => (i < keep || /\s/.test(c) ? c : glyphs[(Math.random() * glyphs.length) | 0])).join("");
      if (p < 1) requestAnimationFrame(tick);
      else { el.textContent = text; delete el.dataset.scrambling; }
    };
    requestAnimationFrame(tick);
  }
})();
