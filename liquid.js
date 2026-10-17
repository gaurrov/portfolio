/* Liquid sky: a small stable-fluids simulation drawn over a painted sky.
   The cursor stirs white and sun-yellow "ink" (trails) and bends the sky behind it (ripple).
   No dependencies. If WebGL is missing, or motion is reduced, the CSS sky gradient stays. */
(() => {
  "use strict";

  const api = { active: false, frames: 0, splash() {}, setPaused() {} };
  window.Liquid = api;

  const canvas = document.getElementById("liquid");
  const root = document.documentElement;
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const CFG = {
    simRes: 128,
    dyeRes: 512,
    velocityDissipation: 0.985,
    dyeDissipation: 0.972,
    pressureDissipation: 0.8,
    pressureIterations: 20,
    curl: 22,
    splatRadius: 0.0026,
    splatForce: 5200,
    warp: 0.00032,
    maxDpr: 1.5,
  };
  const INK = [[1, 1, 1], [1, 0.82, 0.25]]; // white, sun

  let gl, ext;
  try {
    ({ gl, ext } = getContext(canvas));
  } catch (e) {
    gl = null;
  }
  if (!gl) return;

  /* ---------- Shaders (GLSL ES 1.00 runs on WebGL1 and WebGL2) ---------- */
  const baseVertex = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;

  const frag = {
    clear: `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,

    splat: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
      }`,

    advection: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
      #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
      #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
      #endif
        gl_FragColor.a = 1.0;
      }`,

    divergence: `
      precision mediump float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,

    curl: `
      precision mediump float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,

    vorticity: `
      precision highp float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
        gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
      }`,

    pressure: `
      precision mediump float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float d = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
      }`,

    gradientSubtract: `
      precision mediump float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }`,

    display: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uDye;
      uniform sampler2D uVelocity;
      uniform float uTime;
      uniform float uAspect;
      uniform float uWarp;
      uniform vec3 uSplash;   // x, y in uv, age in seconds
      uniform float uSplashAmp;

      vec3 sky (vec2 uv) {
        vec3 top = vec3(0.663, 0.859, 0.973);
        vec3 mid = vec3(0.557, 0.804, 0.961);
        vec3 bot = vec3(0.498, 0.769, 0.941);
        vec3 c = uv.y > 0.5 ? mix(mid, top, (uv.y - 0.5) * 2.0) : mix(bot, mid, uv.y * 2.0);
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          vec2 cp = vec2(0.12 + 0.27 * fi + 0.07 * sin(uTime * 0.05 + fi * 1.7),
                         0.22 + 0.56 * fract(fi * 0.37 + 0.1) + 0.05 * cos(uTime * 0.04 + fi));
          vec2 d = uv - cp;
          d.x *= uAspect;
          d.y *= 1.9;
          float a = smoothstep(0.2 + 0.05 * fi, 0.0, length(d));
          c = mix(c, vec3(1.0), a * 0.32);
        }
        return c;
      }

      void main () {
        vec2 vel = texture2D(uVelocity, vUv).xy * uWarp;
        float vl = length(vel);
        if (vl > 0.045) vel *= 0.045 / vl;
        vec2 uv = vUv + vel;

        if (uSplashAmp > 0.0) {
          vec2 d = vUv - uSplash.xy;
          d.x *= uAspect;
          float dist = length(d);
          float front = uSplash.z * 0.55;
          float ring = exp(-pow((dist - front) * 9.0, 2.0));
          float wave = sin(dist * 46.0 - uSplash.z * 14.0) * ring * exp(-uSplash.z * 1.6);
          uv += (d / (dist + 0.0001)) * wave * 0.014 * uSplashAmp;
        }

        vec3 base = sky(uv);
        vec3 dye = texture2D(uDye, vUv).rgb;
        float m = max(max(dye.r, dye.g), dye.b);
        vec3 tint = m > 0.0001 ? dye / m : vec3(1.0);
        float a = clamp(m * 0.95, 0.0, 0.62);
        // screen blend: ink only adds light, so sun over sky turns warm, never green
        gl_FragColor = vec4(1.0 - (1.0 - base) * (1.0 - tint * a), 1.0);
      }`,
  };

  let programs, quad;
  try {
    programs = {};
    for (const name of Object.keys(frag)) {
      const keywords = name === "advection" && !ext.supportLinearFiltering ? ["MANUAL_FILTERING"] : [];
      programs[name] = makeProgram(baseVertex, frag[name], keywords);
    }
    quad = makeQuad();
  } catch (e) {
    return; // shader compile/link failure: stay on the CSS sky
  }

  /* ---------- State ---------- */
  let dye, velocity, divergence, curl, pressure;
  let dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
  const pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, colorIdx: 0, last: performance.now() };
  const splash = { x: 0.5, y: 0.5, start: -10, amp: 0 };
  let lastTime = performance.now();
  let raf = 0;
  let paused = false;
  let ambientT = 0;
  let lastAmbient = 0;

  try {
    resize(true);
    if (!fboOk()) return;
  } catch (e) {
    return;
  }

  api.active = true;
  api.splash = (x, y, strength = 1) => {
    if (!api.active) return;
    const u = x / window.innerWidth, v = 1 - y / window.innerHeight;
    splash.x = u; splash.y = v; splash.start = performance.now(); splash.amp = Math.min(1.5, strength);
    // a ring of outward pushes plus a puff of ink
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      splat(u, v, Math.cos(a) * 900 * strength, Math.sin(a) * 900 * strength, [0, 0, 0]);
    }
    splat(u, v, 0, 0, scale(INK[1], 0.6 * strength));
  };
  api.setPaused = (p) => { paused = !!p; p ? stop() : start(); };

  /* ---------- Input ---------- */
  const move = (clientX, clientY) => {
    const x = clientX / window.innerWidth, y = 1 - clientY / window.innerHeight;
    const aspect = canvas.width / canvas.height;
    let dx = x - pointer.x, dy = y - pointer.y;
    if (aspect < 1) dx *= aspect; else dy /= aspect;
    pointer.dx = dx * CFG.splatForce;
    pointer.dy = dy * CFG.splatForce;
    pointer.x = x; pointer.y = y;
    pointer.moved = Math.abs(dx) + Math.abs(dy) > 0;
    pointer.last = performance.now();
  };
  window.addEventListener("pointermove", (e) => move(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    pointer.x = e.clientX / window.innerWidth; pointer.y = 1 - e.clientY / window.innerHeight;
    api.splash(e.clientX, e.clientY, 0.8);
  }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { try { resize(false); } catch (e) { shutdown(); } }, 150);
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); shutdown(); });

  root.classList.add("liquid-on");
  start();

  /* ---------- Loop ---------- */
  function start() {
    if (raf || paused || document.hidden || !api.active) return;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function shutdown() {
    stop();
    api.active = false;
    root.classList.remove("liquid-on");
  }

  function frame(now) {
    raf = 0;
    if (paused || document.hidden || !api.active) return;
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (pointer.moved) {
      pointer.moved = false;
      pointer.colorIdx = (pointer.colorIdx + 1) % 24;
      const color = scale(INK[pointer.colorIdx < 16 ? 0 : 1], 0.2);
      splat(pointer.x, pointer.y, pointer.dx, pointer.dy, color);
    } else if (now - pointer.last > 2500 && now - lastAmbient > 120) {
      // nobody is moving the mouse: a slow figure-eight keeps the sky alive
      lastAmbient = now;
      ambientT += 0.06;
      const x = 0.5 + 0.32 * Math.sin(ambientT * 0.7), y = 0.5 + 0.22 * Math.sin(ambientT * 1.1);
      splat(x, y, 140 * Math.cos(ambientT * 0.7), 160 * Math.cos(ambientT * 1.1), scale(INK[ambientT % 6 < 4 ? 0 : 1], 0.05));
    }

    step(dt);
    render(now);
    api.frames++;
    raf = requestAnimationFrame(frame);
  }

  function step(dt) {
    gl.disable(gl.BLEND);

    use(programs.curl, velocity.texelSize);
    gl.uniform1i(programs.curl.u.uVelocity, velocity.read.attach(0));
    blit(curl);

    use(programs.vorticity, velocity.texelSize);
    gl.uniform1i(programs.vorticity.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(programs.vorticity.u.uCurl, curl.attach(1));
    gl.uniform1f(programs.vorticity.u.curl, CFG.curl);
    gl.uniform1f(programs.vorticity.u.dt, dt);
    blit(velocity.write); velocity.swap();

    use(programs.divergence, velocity.texelSize);
    gl.uniform1i(programs.divergence.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    use(programs.clear, pressure.texelSize);
    gl.uniform1i(programs.clear.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(programs.clear.u.value, CFG.pressureDissipation);
    blit(pressure.write); pressure.swap();

    use(programs.pressure, velocity.texelSize);
    gl.uniform1i(programs.pressure.u.uDivergence, divergence.attach(0));
    for (let i = 0; i < CFG.pressureIterations; i++) {
      gl.uniform1i(programs.pressure.u.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    use(programs.gradientSubtract, velocity.texelSize);
    gl.uniform1i(programs.gradientSubtract.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(programs.gradientSubtract.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    const k = dt * 60;
    use(programs.advection, velocity.texelSize);
    if (!ext.supportLinearFiltering) gl.uniform2f(programs.advection.u.dyeTexelSize, velocity.texelSize[0], velocity.texelSize[1]);
    const vId = velocity.read.attach(0);
    gl.uniform1i(programs.advection.u.uVelocity, vId);
    gl.uniform1i(programs.advection.u.uSource, vId);
    gl.uniform1f(programs.advection.u.dt, dt);
    gl.uniform1f(programs.advection.u.dissipation, Math.pow(CFG.velocityDissipation, k));
    blit(velocity.write); velocity.swap();

    if (!ext.supportLinearFiltering) gl.uniform2f(programs.advection.u.dyeTexelSize, dye.texelSize[0], dye.texelSize[1]);
    gl.uniform1i(programs.advection.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(programs.advection.u.uSource, dye.read.attach(1));
    gl.uniform1f(programs.advection.u.dissipation, Math.pow(CFG.dyeDissipation, k));
    blit(dye.write); dye.swap();
  }

  function render(now) {
    const p = programs.display;
    use(p, [1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight]);
    gl.uniform1i(p.u.uDye, dye.read.attach(0));
    gl.uniform1i(p.u.uVelocity, velocity.read.attach(1));
    gl.uniform1f(p.u.uTime, now / 1000);
    gl.uniform1f(p.u.uAspect, canvas.width / canvas.height);
    gl.uniform1f(p.u.uWarp, CFG.warp);
    const age = (now - splash.start) / 1000;
    gl.uniform3f(p.u.uSplash, splash.x, splash.y, age);
    gl.uniform1f(p.u.uSplashAmp, age < 2.2 ? splash.amp : 0);
    blit(null);
  }

  function splat(x, y, dx, dy, color) {
    const p = programs.splat;
    use(p, velocity.texelSize);
    gl.uniform1i(p.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(p.u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(p.u.point, x, y);
    gl.uniform3f(p.u.color, dx, dy, 0);
    gl.uniform1f(p.u.radius, radius(CFG.splatRadius));
    blit(velocity.write); velocity.swap();

    if (color[0] + color[1] + color[2] > 0) {
      gl.uniform1i(p.u.uTarget, dye.read.attach(0));
      gl.uniform3f(p.u.color, color[0], color[1], color[2]);
      blit(dye.write); dye.swap();
    }
  }

  function radius(r) {
    const aspect = canvas.width / canvas.height;
    return aspect > 1 ? r * aspect : r;
  }

  /* ---------- Sizing and buffers ---------- */
  function resize(first) {
    dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (!first && w === canvas.width && h === canvas.height) return;
    canvas.width = w; canvas.height = h;
    const sim = resolution(CFG.simRes), dyeR = resolution(CFG.dyeRes);
    const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
    const t = ext.halfFloatTexType;
    // free the previous buffers first: phones fire resize whenever the address bar moves
    [dye, velocity, divergence, curl, pressure].forEach(dispose);
    dye = doubleFbo(dyeR.w, dyeR.h, ext.rgba, t, filter);
    velocity = doubleFbo(sim.w, sim.h, ext.rg, t, filter);
    divergence = fbo(sim.w, sim.h, ext.r, t, gl.NEAREST);
    curl = fbo(sim.w, sim.h, ext.r, t, gl.NEAREST);
    pressure = doubleFbo(sim.w, sim.h, ext.r, t, gl.NEAREST);
  }

  function fboOk() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok;
  }

  function resolution(res) {
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(res), max = Math.round(res * aspect);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
  }

  function fbo(w, h, fmt, type, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      fbo: fb, texture, width: w, height: h, texelSize: [1 / w, 1 / h],
      attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
    };
  }

  function doubleFbo(w, h, fmt, type, filter) {
    let a = fbo(w, h, fmt, type, filter), b = fbo(w, h, fmt, type, filter);
    return {
      width: w, height: h, texelSize: [1 / w, 1 / h],
      get read() { return a; }, get write() { return b; },
      swap() { const t = a; a = b; b = t; },
      parts: () => [a, b],
    };
  }

  function dispose(target) {
    if (!target) return;
    for (const f of target.parts ? target.parts() : [target]) {
      gl.deleteFramebuffer(f.fbo);
      gl.deleteTexture(f.texture);
    }
  }

  /* ---------- GL plumbing ---------- */
  function use(program, texel) {
    gl.useProgram(program.p);
    if (program.u.texelSize) gl.uniform2f(program.u.texelSize, texel[0], texel[1]);
  }

  function blit(target) {
    if (target) {
      gl.viewport(0, 0, target.width, target.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function makeQuad() {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    return true;
  }

  function makeProgram(vsSrc, fsSrc, keywords) {
    const defs = keywords.map((k) => `#define ${k}\n`).join("");
    const vs = shader(gl.VERTEX_SHADER, vsSrc);
    const fs = shader(gl.FRAGMENT_SHADER, defs + fsSrc);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "aPosition");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("compile");
    return s;
  }

  function getContext(el) {
    const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    let g = el.getContext("webgl2", params);
    const isGL2 = !!g;
    if (!g) g = el.getContext("webgl", params) || el.getContext("experimental-webgl", params);
    if (!g) return { gl: null };

    let halfFloatTexType, supportLinearFiltering;
    if (isGL2) {
      g.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = true; // half-float textures are filterable in WebGL2 core
      halfFloatTexType = g.HALF_FLOAT;
    } else {
      const hf = g.getExtension("OES_texture_half_float");
      if (!hf) return { gl: null };
      supportLinearFiltering = !!g.getExtension("OES_texture_half_float_linear");
      halfFloatTexType = hf.HALF_FLOAT_OES;
    }

    const pick = (internal, format) => (renderable(g, internal, format, halfFloatTexType) ? { internal, format } : null);
    let rgba, rg, r;
    if (isGL2) {
      rgba = pick(g.RGBA16F, g.RGBA);
      rg = pick(g.RG16F, g.RG) || rgba;
      r = pick(g.R16F, g.RED) || rg;
    } else {
      rgba = pick(g.RGBA, g.RGBA);
      rg = rgba; r = rgba;
    }
    if (!rgba) return { gl: null };
    return { gl: g, ext: { rgba, rg, r, halfFloatTexType, supportLinearFiltering } };
  }

  function renderable(g, internal, format, type) {
    const tex = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texImage2D(g.TEXTURE_2D, 0, internal, 4, 4, 0, format, type, null);
    const fb = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, fb);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
    const ok = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.deleteFramebuffer(fb);
    g.deleteTexture(tex);
    return ok;
  }

  function scale(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
})();
