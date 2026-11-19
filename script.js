/* =========================================================
   Embark Consulting Group: interactions & robotics
   ========================================================= */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const deg = (r) => (r * 180) / Math.PI;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const NS = "http://www.w3.org/2000/svg";
  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /** Run fn every frame only while el is on screen. */
  function whileVisible(el, fn) {
    let on = false, raf = 0, last = performance.now();
    const loop = (t) => { const dt = Math.min(50, t - last); last = t; fn(t / 1000, dt); if (on) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); }
    }, { rootMargin: "100px" }).observe(el);
  }

  const mouse = { x: innerWidth * 0.7, y: innerHeight * 0.4, moved: false };
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; }, { passive: true });

  /* =====================================================
     Intro
     ===================================================== */
  const intro = $("#intro");
  let seen = false;
  try { seen = sessionStorage.getItem("embark-intro") === "1"; sessionStorage.setItem("embark-intro", "1"); } catch (_) {}
  const introMs = reduce || seen ? 150 : 1500;
  setTimeout(() => {
    intro.classList.add("out");
    document.body.classList.remove("loading");
    document.body.classList.add("ready");
    setTimeout(() => intro.remove(), 1200);
  }, introMs);

  /* =====================================================
     Custom cursor
     ===================================================== */
  const cursor = $("#cursor");
  if (fine && !reduce) {
    let cx = mouse.x, cy = mouse.y;
    (function cur() {
      cx = lerp(cx, mouse.x, 0.22); cy = lerp(cy, mouse.y, 0.22);
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(cur);
    })();
    addEventListener("pointermove", () => cursor.classList.add("on"), { once: true });
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("hover", !!e.target.closest("a, button, .row, #bust, .member, input, select, textarea"));
    });
    document.addEventListener("pointerleave", () => cursor.classList.remove("on"));
    document.addEventListener("pointerenter", () => cursor.classList.add("on"));
  } else {
    cursor.remove();
  }

  /* =====================================================
     Dust particles
     ===================================================== */
  const dust = $("#dust"), dctx = dust.getContext("2d");
  let DW, DH, motes = [];
  function sizeDust() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    DW = innerWidth; DH = innerHeight;
    dust.width = DW * dpr; dust.height = DH * dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(clamp((DW * DH) / 22000, 25, 80));
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * DW, y: Math.random() * DH,
      r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.35 + 0.05,
      vx: (Math.random() - 0.5) * 0.12, vy: -Math.random() * 0.18 - 0.03, p: Math.random() * 6.28,
    }));
  }
  sizeDust(); addEventListener("resize", sizeDust);
  (function drawDust(t) {
    dctx.clearRect(0, 0, DW, DH);
    for (const m of motes) {
      if (!reduce) { m.x += m.vx; m.y += m.vy; }
      if (m.y < -5) { m.y = DH + 5; m.x = Math.random() * DW; }
      if (m.x < -5) m.x = DW + 5; if (m.x > DW + 5) m.x = -5;
      const tw = 0.6 + 0.4 * Math.sin((t || 0) / 900 + m.p);
      dctx.globalAlpha = m.a * tw;
      dctx.fillStyle = m.r > 1.2 ? "#8fe3ff" : "#ffffff";
      dctx.beginPath(); dctx.arc(m.x, m.y, m.r, 0, 6.283); dctx.fill();
    }
    requestAnimationFrame(drawDust);
  })();

  /* =====================================================
     Announcement banner (stays closed once dismissed)
     ===================================================== */
  const BANNER_KEY = "embark-banner-spring-2027";
  let bannerClosed = false;
  try { bannerClosed = localStorage.getItem(BANNER_KEY) === "closed"; } catch (_) {}
  if (bannerClosed) document.body.classList.remove("has-banner");
  $("#bannerClose").addEventListener("click", () => {
    document.body.classList.remove("has-banner");
    try { localStorage.setItem(BANNER_KEY, "closed"); } catch (_) {}
  });

  /* =====================================================
     Nav
     ===================================================== */
  const nav = $("#nav"), navLinks = $("#navLinks"), navToggle = $("#navToggle");
  const onNav = () => nav.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onNav, { passive: true }); onNav();
  navToggle.addEventListener("click", () => { navLinks.classList.toggle("open"); navToggle.classList.toggle("open"); });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", () => { navLinks.classList.remove("open"); navToggle.classList.remove("open"); }));

  /* =====================================================
     HERO: humanoid bust that tracks the cursor & talks
     ===================================================== */
  const hero = $(".hero"), gridBg = $(".hero-grid-bg");
  const bust = $("#bust"), bustHead = $("#bustHead"), visorEye = $("#visorEye");
  const bustSays = $("#bustSays"), waveBars = $$("#wave i");
  let hx = 0, hy = 0, ex = 260, speaking = false, blinkT = 0;

  whileVisible(hero, (t) => {
    const r = hero.getBoundingClientRect();
    gridBg.style.setProperty("--mx", mouse.x - r.left + "px");
    gridBg.style.setProperty("--my", mouse.y - r.top + "px");

    const b = bust.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height * 0.38;
    const nx = clamp((mouse.x - cx) / (innerWidth / 2), -1, 1);
    const ny = clamp((mouse.y - cy) / (innerHeight / 2), -1, 1);
    hx = lerp(hx, nx, 0.08); hy = lerp(hy, ny, 0.08);
    const idle = reduce ? 0 : Math.sin(t * 0.8) * 2;
    bustHead.style.transform = `translate(${hx * 14}px, ${hy * 8 + idle}px) rotate(${hx * 3}deg)`;
    ex = lerp(ex, 260 + nx * 40, 0.15);
    visorEye.setAttribute("cx", ex.toFixed(1));

    // blink
    blinkT -= 1 / 60;
    if (blinkT < 0) { blinkT = 2.5 + Math.random() * 3; }
    visorEye.setAttribute("ry", blinkT < 0.12 ? 1.5 : speaking ? 7 + Math.random() * 3 : 9);

    waveBars.forEach((w, i) => {
      w.style.height = speaking ? 3 + Math.abs(Math.sin(t * 18 + i * 1.7)) * 13 * Math.random() + "px" : "3px";
    });
  });

  const bustLines = [
    "I'm ECG-01. I help humanoids find their footing.",
    "Hardware. Autonomy. Economics. Ask us anything.",
    "Every robot that ships starts with one good decision.",
    "We're recruiting new analysts. Interested?",
    "My visor is tracking you. Purely for research.",
  ];
  let bustIdx = 0, bustBusy = false;
  async function bustSpeak(text) {
    if (bustBusy) return; bustBusy = true;
    speaking = true; bust.classList.add("speaking");
    bustSays.textContent = "";
    for (const ch of text) { bustSays.textContent += ch; await wait(reduce ? 0 : 28); }
    await wait(500);
    speaking = false; bust.classList.remove("speaking");
    await wait(2600);
    bustSays.textContent = "ECG-01 · LISTENING. Click to talk.";
    bustBusy = false;
  }
  bust.addEventListener("click", () => { bustSpeak(bustLines[bustIdx]); bustIdx = (bustIdx + 1) % bustLines.length; });
  setTimeout(() => { if (scrollY < innerHeight / 2) { bustSpeak(bustLines[0]); bustIdx = 1; } }, introMs + 1800);

  /* =====================================================
     Humanoid rig (side profile, facing right in local space)
     ===================================================== */
  function Humanoid(parent, x, dir) {
    const root = mk("g", { class: "rig" }, parent);
    const body = mk("g", {}, root);
    const N = { fill: "url(#metal)", stroke: "url(#rim)", "stroke-width": "1" };
    const F = { fill: "url(#metalFar)", stroke: "#ffffff", "stroke-opacity": ".05" };

    function leg(far) {
      const s = far ? F : N;
      const hip = mk("g", {}, body);
      mk("rect", { x: 89, y: 206, width: 22, height: 76, rx: 11, ...s }, hip);
      const knee = mk("g", {}, hip);
      mk("rect", { x: 91, y: 274, width: 18, height: 70, rx: 9, ...s }, knee);
      mk("circle", { cx: 100, cy: 278, r: 7.5, fill: far ? "#08090c" : "#12151a", stroke: "#8fe3ff", "stroke-opacity": far ? 0.08 : 0.35 }, knee);
      const ankle = mk("g", {}, knee);
      mk("path", { d: "M86 338 L116 338 Q128 340 128 348 L128 353 L84 353 Q83 343 86 338 Z", ...s }, ankle);
      return { hip, knee, ankle };
    }
    function arm(par, far) {
      const s = far ? F : N;
      const sh = mk("g", {}, par);
      mk("rect", { x: 92, y: 124, width: 16, height: 62, rx: 8, ...s }, sh);
      const el = mk("g", {}, sh);
      mk("rect", { x: 93, y: 180, width: 14, height: 54, rx: 7, ...s }, el);
      mk("circle", { cx: 100, cy: 182, r: 6.5, fill: "#0d0f13", stroke: "#8fe3ff", "stroke-opacity": far ? 0.08 : 0.35 }, el);
      const hand = mk("g", {}, el);
      mk("rect", { x: 93.5, y: 230, width: 13, height: 20, rx: 5, ...s }, hand);
      mk("rect", { x: 104, y: 231, width: 5, height: 12, rx: 2.5, ...s }, hand);
      mk("circle", { cx: 100, cy: 128, r: 12.5, ...s }, sh);
      return { sh, el };
    }

    const farLeg = leg(true);
    mk("rect", { x: 83, y: 194, width: 36, height: 30, rx: 11, ...N }, body); // pelvis
    const upperFar = mk("g", {}, body);
    const farArm = arm(upperFar, true);
    mk("rect", { x: 73, y: 124, width: 14, height: 50, rx: 5, ...F }, upperFar); // back pack
    mk("rect", { x: 96, y: 90, width: 12, height: 18, rx: 3, fill: "#0d0f13" }, upperFar); // neck
    mk("path", { d: "M86 118 Q86 104 99 104 L113 104 Q131 108 131 134 L127 172 Q124 197 108 201 L94 201 Q81 197 81 176 Z", ...N }, upperFar);
    mk("path", { d: "M86 176 H124 M87 186 H121 M108 110 V196", stroke: "#fff", "stroke-opacity": ".07", fill: "none" }, upperFar);
    mk("rect", { x: 125, y: 136, width: 3, height: 22, rx: 1.5, fill: "#8fe3ff", class: "chestled", filter: "url(#glow)" }, upperFar);
    const head = mk("g", {}, upperFar);
    mk("path", { d: "M103 44 C122 44 133 58 133 75 C133 90 126 101 112 103 L97 103 C85 101 78 89 78 73 C78 57 87 44 103 44 Z", ...N }, head);
    mk("path", { d: "M118 54 C129 59 134 70 133 80 C132 91 127 98 118 101 Q123 78 118 54 Z", fill: "#040506" }, head);
    mk("rect", { x: 117, y: 69, width: 15, height: 6, rx: 3, fill: "#8fe3ff", class: "visor", filter: "url(#glow)" }, head);
    mk("circle", { cx: 96, cy: 75, r: 8, ...N }, head);
    mk("circle", { cx: 96, cy: 75, r: 2.5, fill: "#8fe3ff", opacity: ".6" }, head);
    const nearLeg = leg(false);
    const upperNear = mk("g", {}, body);
    const nearArm = arm(upperNear, false);

    const rig = {
      root, x, dir,
      place(nx, nd) { this.x = nx; this.dir = nd; root.setAttribute("transform", `translate(${nx} 0) scale(${nd} 1) translate(-100 0)`); },
      set(p) {
        body.setAttribute("transform", `translate(0 ${p.y || 0})`);
        const tl = `rotate(${-p.torso} 100 210)`;
        upperFar.setAttribute("transform", tl); upperNear.setAttribute("transform", tl);
        head.setAttribute("transform", `rotate(${p.head} 102 100)`);
        nearArm.sh.setAttribute("transform", `rotate(${-p.sN} 100 128)`);
        nearArm.el.setAttribute("transform", `rotate(${-p.eN} 100 182)`);
        farArm.sh.setAttribute("transform", `rotate(${-p.sF} 100 128)`);
        farArm.el.setAttribute("transform", `rotate(${-p.eF} 100 182)`);
        for (const [L, h, k] of [[nearLeg, p.hN, p.kN], [farLeg, p.hF, p.kF]]) {
          L.hip.setAttribute("transform", `rotate(${-h} 100 212)`);
          L.knee.setAttribute("transform", `rotate(${k} 100 278)`);
          L.ankle.setAttribute("transform", `rotate(${h - k} 100 345)`);
        }
      },
    };
    rig.place(x, dir);
    return rig;
  }
  const BASE = { torso: 0, head: 0, sN: 4, eN: 12, sF: -4, eF: 12, hN: 3, kN: 4, hF: -3, kF: 4, y: 0 };

  /* =====================================================
     DIALOGUE: two humanoids talk, then shake hands
     ===================================================== */
  const talkSvg = $("#talkSvg"), stage = $("#talkStage");
  const rA = Humanoid(talkSvg, 82, 1), rB = Humanoid(talkSvg, 319, -1);
  const actors = [rA, rB].map((rig, i) => ({ rig, seed: i * 2.1, mode: "idle", cur: { ...BASE }, tgt: { ...BASE } }));
  const POSES = {
    idle: { ...BASE },
    listen: { ...BASE, head: 3, torso: 1 },
    speak: { ...BASE, sN: 40, eN: 66, torso: 3, head: -3 },
    shake: { ...BASE, sN: 78, eN: 8, torso: 4, head: 3, sF: -2 },
  };
  function setMode(a, m) { a.mode = m; a.tgt = { ...POSES[m] }; a.rig.root.classList.toggle("speaking", m === "speak"); }

  whileVisible(stage, (t) => {
    for (const a of actors) {
      for (const k in a.cur) a.cur[k] = lerp(a.cur[k], a.tgt[k], 0.07);
      const p = { ...a.cur };
      if (!reduce) {
        p.torso += Math.sin(t * 1.6 + a.seed) * 0.7;
        p.y += Math.sin(t * 1.6 + a.seed) * 0.6;
        p.sF += Math.sin(t * 1.6 + a.seed) * 1.5;
        if (a.mode === "speak") {
          p.head += Math.sin(t * 7.5) * 2.2;
          p.sN += Math.sin(t * 2.4) * 10;
          p.eN += Math.sin(t * 3.6 + 1) * 14;
        } else if (a.mode === "listen") {
          p.head += Math.sin(t * 0.9 + a.seed) * 1.6 + Math.max(0, Math.sin(t * 2.2)) * 3;
        } else if (a.mode === "shake") {
          const s = Math.sin(t * 11);
          p.eN += s * 7; p.sN += s * 2;
        }
      }
      a.rig.set(p);
    }
  });

  const bubbles = { A: $("#bubbleA"), B: $("#bubbleB") };
  const names = { A: "UNIT_A", B: "EMBARK" };
  const transcript = $("#transcript");
  const script = [
    ["A", "My actuators are the most expensive part of me. Can we bring that cost down?"],
    ["B", "We'll benchmark every motor and gearbox on the market, then model build vs. buy."],
    ["A", "Where should I be deployed first: factories, warehouses or homes?"],
    ["B", "We'll score each use case on task fit, safety and cost per robot-hour."],
    ["A", "And can I work safely beside people?"],
    ["B", "Standards, risk and certification paths, all mapped out for you."],
    ["A", "Then let's get to work."],
    ["B", "Welcome to Embark."],
  ];
  let t0 = 0;
  function log(html) {
    const s = Math.floor((performance.now() - t0) / 1000);
    const d = document.createElement("div");
    d.innerHTML = `<b>[${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}]</b> ${html}`;
    transcript.appendChild(d);
    while (transcript.children.length > 4) transcript.firstChild.remove();
  }
  async function say(who, text) {
    const b = bubbles[who];
    b.innerHTML = `<span class="who">${names[who]}</span><span class="txt"></span>`;
    const txt = $(".txt", b);
    b.classList.add("show");
    for (const ch of text) { txt.textContent += ch; await wait(reduce ? 0 : 24); }
    log(`${names[who]}: ${text}`);
  }
  async function dialogue() {
    t0 = performance.now();
    for (;;) {
      for (const [who, text] of script) {
        const sp = who === "A" ? actors[0] : actors[1], ls = who === "A" ? actors[1] : actors[0];
        setMode(sp, "speak"); setMode(ls, "listen");
        await say(who, text);
        await wait(1400);
        setMode(sp, "listen");
        bubbles[who].classList.remove("show");
        await wait(450);
      }
      actors.forEach((a) => setMode(a, "shake"));
      log("<b>// handshake: engagement initiated</b>");
      await wait(3400);
      actors.forEach((a) => setMode(a, "idle"));
      await wait(2200);
    }
  }
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); dialogue(); } }, { threshold: 0.35 }).observe(stage);

  /* =====================================================
     LAB: industrial arm with inverse kinematics
     ===================================================== */
  const armSvg = $("#armSvg"), cell = $("#cell");
  const seg1 = $("#seg1"), seg2 = $("#seg2"), wristG = $("#wrist");
  const fL = $("#fingerL"), fR = $("#fingerR"), cubeG = $("#cube");
  const laser = $("#laser"), reticle = $("#reticle");
  const hud = { mode: $("#hudMode"), j1: $("#hudJ1"), j2: $("#hudJ2"), j3: $("#hudJ3"), grip: $("#hudGrip"), load: $("#hudLoad") };
  const S = { x: 140, y: 318 }, L1 = 190, L2 = 175;
  const OPEN = 30, CLOSED = 21, GRIP_Y = 302, LIFT_Y = 215, REST_Y = 343, FLOOR = 343, PADS = [330, 490];
  const A = {
    cur: { x: 400, y: 200 }, goal: { x: 400, y: 200 }, grip: OPEN, gripGoal: OPEN,
    held: false, mode: "auto", state: "approach", timer: 0, target: 490,
    cube: { x: 330, y: REST_Y, vy: 0 }, W: { x: 0, y: 0 },
  };

  function ik(wx, wy) {
    const dx = wx - S.x, dy = wy - S.y;
    const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1, L1 + L2 - 0.5);
    const th = Math.atan2(dy, dx);
    const e = Math.acos(clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
    const a1 = th - Math.atan2(L2 * Math.sin(e), L1 + L2 * Math.cos(e));
    return { a1, a2: e };
  }
  function enter(state) {
    A.state = state;
    const c = A.cube;
    switch (state) {
      case "approach": A.goal = { x: c.x, y: LIFT_Y }; break;
      case "descend": A.goal = { x: c.x, y: GRIP_Y }; break;
      case "grip": A.gripGoal = CLOSED; A.timer = 380; break;
      case "lift": A.goal = { x: A.cur.x, y: LIFT_Y }; break;
      case "transfer":
        A.target = Math.abs(c.x - PADS[0]) > Math.abs(c.x - PADS[1]) ? PADS[0] : PADS[1];
        A.goal = { x: A.target, y: LIFT_Y }; break;
      case "lower": A.goal = { x: A.target, y: GRIP_Y }; break;
      case "release": A.gripGoal = OPEN; A.held = false; A.timer = 320; break;
      case "retreat": A.goal = { x: A.target, y: LIFT_Y }; A.timer = 900; break;
    }
  }
  enter("approach");

  function autoStep(dt, reached) {
    switch (A.state) {
      case "approach": if (reached && A.cube.y >= FLOOR - 0.5) enter("descend"); break;
      case "descend": if (reached) enter("grip"); break;
      case "grip": if ((A.timer -= dt) <= 0) { A.held = true; enter("lift"); } break;
      case "lift": if (reached) enter("transfer"); break;
      case "transfer": if (reached) enter("lower"); break;
      case "lower": if (reached) enter("release"); break;
      case "release": if ((A.timer -= dt) <= 0) enter("retreat"); break;
      case "retreat": if (reached && (A.timer -= dt) <= 0) enter("approach"); break;
    }
  }

  let lastHud = "";
  whileVisible(cell, (t, dt) => {
    const k = dt / 16.7;
    // move
    const dx = A.goal.x - A.cur.x, dy = A.goal.y - A.cur.y, d = Math.hypot(dx, dy);
    if (A.mode === "manual") {
      A.cur.x += dx * Math.min(1, 0.2 * k); A.cur.y += dy * Math.min(1, 0.2 * k);
    } else if (d > 0) {
      const step = Math.min(d, Math.max(1.5, d * 0.07) * k);
      A.cur.x += (dx / d) * step; A.cur.y += (dy / d) * step;
    }
    if (A.mode === "auto") autoStep(dt, d < 1.5);

    // kinematics
    const { a1, a2 } = ik(A.cur.x, A.cur.y);
    const W = A.W;
    W.x = S.x + L1 * Math.cos(a1) + L2 * Math.cos(a1 + a2);
    W.y = S.y + L1 * Math.sin(a1) + L2 * Math.sin(a1 + a2);
    seg1.setAttribute("transform", `translate(${S.x} ${S.y}) rotate(${deg(a1)})`);
    seg2.setAttribute("transform", `translate(${L1} 0) rotate(${deg(a2)})`);
    wristG.setAttribute("transform", `translate(${L2} 0) rotate(${-deg(a1 + a2)})`);

    // gripper
    A.grip = lerp(A.grip, A.gripGoal, Math.min(1, 0.25 * k));
    fL.setAttribute("transform", `translate(${-A.grip} 0)`);
    fR.setAttribute("transform", `translate(${A.grip} 0)`);

    // cube physics
    const c = A.cube;
    if (A.held) { c.x = W.x; c.y = W.y + 41; c.vy = 0; }
    else if (c.y < FLOOR || c.vy !== 0) {
      c.vy += 0.55 * k; c.y += c.vy * k;
      if (c.y >= FLOOR) { c.y = FLOOR; c.vy = Math.abs(c.vy) > 2.5 ? -c.vy * 0.28 : 0; }
    }
    cubeG.setAttribute("transform", `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`);

    // laser
    const ly = W.y + 58;
    laser.setAttribute("x1", W.x); laser.setAttribute("x2", W.x);
    laser.setAttribute("y1", ly); laser.setAttribute("y2", 360);
    reticle.setAttribute("transform", `translate(${W.x} 360)`);

    // HUD
    const j3 = -deg(a1 + a2);
    const s = [A.mode.toUpperCase(), Math.round(-deg(a1)), Math.round(deg(a2)), Math.round(((j3 % 360) + 540) % 360 - 180),
      A.held ? "LOCKED" : A.grip < 25 ? "CLOSED" : "OPEN", A.held ? "1.2 kg" : "0.0 kg"].join("|");
    if (s !== lastHud) {
      lastHud = s;
      const v = s.split("|");
      hud.mode.textContent = v[0]; hud.j1.textContent = v[1] + "°"; hud.j2.textContent = v[2] + "°";
      hud.j3.textContent = v[3] + "°"; hud.grip.textContent = v[4]; hud.load.textContent = v[5];
    }
  });

  // manual control
  let resumeTimer;
  function svgPoint(e) {
    const m = armSvg.getScreenCTM().inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  }
  armSvg.addEventListener("pointerenter", () => {
    clearTimeout(resumeTimer);
    A.mode = "manual"; cell.classList.add("manual");
  });
  armSvg.addEventListener("pointermove", (e) => {
    if (A.mode !== "manual") { A.mode = "manual"; cell.classList.add("manual"); }
    const p = svgPoint(e);
    A.goal = { x: clamp(p.x, 210, 500), y: clamp(p.y - 41, 70, GRIP_Y) };
  });
  armSvg.addEventListener("pointerdown", (e) => {
    const p = svgPoint(e);
    A.goal = { x: clamp(p.x, 210, 500), y: clamp(p.y - 41, 70, GRIP_Y) };
    if (A.held) { A.held = false; A.gripGoal = OPEN; return; }
    A.gripGoal = CLOSED;
    const near = Math.hypot(A.W.x - A.cube.x, A.W.y + 41 - A.cube.y) < 28;
    if (near) A.held = true;
    else setTimeout(() => { if (!A.held) A.gripGoal = OPEN; }, 280);
  });
  armSvg.addEventListener("pointerleave", () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      A.mode = "auto"; cell.classList.remove("manual");
      enter(A.held ? "lift" : "approach");
      if (!A.held) A.gripGoal = OPEN;
    }, 1200);
  });

  /* =====================================================
     PROCESS: humanoid walks as you scroll
     ===================================================== */
  const walkSvg = $("#walkSvg"), walkProgress = $("#walkProgress");
  const walker = Humanoid(walkSvg, 60, 1);
  const process = $("#process"), steps = $$(".step");
  const TICKS = [125, 375, 625, 875];
  let wX = 60, wGoal = 60, wDir = 1, amp = 0;
  function walkTarget() {
    const r = process.getBoundingClientRect();
    const p = clamp((innerHeight * 0.75 - r.top) / (r.height * 0.75), 0, 1);
    wGoal = 60 + p * 880;
  }
  addEventListener("scroll", walkTarget, { passive: true });
  addEventListener("resize", walkTarget);
  walkTarget(); wX = wGoal;

  whileVisible(process, (t, dt) => {
    const k = dt / 16.7;
    const dx = wGoal - wX;
    const v = clamp(dx * 0.06, -2.4, 2.4) * k;
    wX += Math.abs(dx) < 0.3 ? dx : v;
    if (Math.abs(v) > 0.05) wDir = v > 0 ? 1 : -1;
    amp = lerp(amp, Math.abs(dx) > 0.6 ? 1 : 0, 0.1);
    const ph = (wX / 130) * Math.PI * 2;
    const s = Math.sin(ph), c = Math.cos(ph);
    walker.place(wX, wDir);
    walker.set({
      torso: 3 * amp, head: Math.sin(ph * 2) * 1.2 * amp + (reduce ? 0 : Math.sin(t * 1.5) * (1 - amp)),
      sN: 4 - 20 * amp * s, eN: 14 + 10 * amp, sF: -4 + 20 * amp * s, eF: 14 + 10 * amp,
      hN: 3 * (1 - amp) + 24 * amp * s, kN: 4 + 38 * amp * Math.max(0, c),
      hF: -3 * (1 - amp) - 24 * amp * s, kF: 4 + 38 * amp * Math.max(0, -c),
      y: -3 * amp * Math.abs(c) + (1 - amp) * Math.sin(t * 1.6) * 0.6,
    });
    walkProgress.setAttribute("x2", wX.toFixed(1));
    steps.forEach((st, i) => st.classList.toggle("active", wX >= TICKS[i] - 40));
  });

  /* =====================================================
     Manifesto: words light up as you scroll
     ===================================================== */
  const man = $("#manifesto");
  const highlight = new Set(["That", "is", "where", "we", "work."]);
  const words = man.textContent.trim().split(/\s+/);
  const lastSentence = words.length - 5;
  man.innerHTML = words.map((w, i) => `<span class="w${i >= lastSentence && highlight.has(w) ? " hl" : ""}">${w}</span>`).join(" ");
  const wordEls = $$(".w", man);
  function lightWords() {
    const r = man.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = Math.round(p * wordEls.length);
    wordEls.forEach((w, i) => w.classList.toggle("lit", i < n));
  }
  addEventListener("scroll", lightWords, { passive: true }); lightWords();

  /* =====================================================
     Reveal on scroll
     ===================================================== */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = (i % 4) * 90 + "ms"; io.observe(el); });

  /* =====================================================
     Recruitment timeline: light up step by step
     ===================================================== */
  const tl = $("#timeline");
  new IntersectionObserver(([e], o) => {
    if (e.isIntersecting) { tl.classList.add("run"); o.disconnect(); }
  }, { threshold: 0.35 }).observe(tl);

  /* =====================================================
     Contact form
     ===================================================== */
  const toast = (msg) => {
    const t = document.createElement("div");
    t.className = "toast mono"; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 600); }, 3600);
  };
  $("#contactForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target, btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const res = await fetch("https://formsubmit.co/ajax/contact@embarkconsulting.org", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) === "false") throw new Error(data.message || "Send failed");
      toast("Message sent. We'll be in touch.");
      form.reset();
    } catch (_) {
      toast("Couldn't send. Email contact@embarkconsulting.org instead.");
    } finally {
      btn.disabled = false;
    }
  });
})();
