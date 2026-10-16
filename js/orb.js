/* js/orb.js — the hero object: one liquid sphere that turns and ripples as the visitor scrolls. Owner: effects
   (BRIEF-v3 §15.3, WORKER-BRIEFS.md §2.2b).

   What it draws: a sphere whose surface is pushed in and out by a slow, smooth noise field, so it reads like a drop of
   something thick. Paper on the lit side, a deeper cobalt-tinted shade, a cobalt rim on the upper left, a warm rim on
   the lower right, one sharp highlight. The soft contact shadow and the still sphere underneath are CSS
   (styles/orb.css), so the composition is the same with or without this file.

   Motion: scroll only. Over the first two screens of scrolling the sphere turns about 160 degrees, its surface flows
   and the ripples grow; a quick flick adds a little wobble. Every value eases toward its target and the loop stops
   when they settle, and never later than 1.5 s after the last scroll (WCAG 2.2.2: nothing moves on its own). When it
   first appears it eases from the plain CSS sphere into the liquid shape, inside the same 1.5 s. No pointer input.

   Contract:  init(el, { tokens, reducedMotion }) → { pause(), resume(), destroy(), update({ tokens }) }
   - el is a [data-orb] element (aria-hidden). This file adds a <canvas class="orb__canvas"> to it and .is-live after
     the first frame; the CSS then fades the canvas in over the still sphere. destroy() removes both.
   - tokens: { ink, paper, accent, warm, dark } from shell.js readTokens().
   - WebGL 1, one indexed mesh (a displaced UV sphere, displaced in the vertex shader), one draw call per frame.
     No WebGL, a software-only GPU or a failed compile: returns quietly and the CSS sphere stays. Context loss: back to
     the CSS sphere until the context is restored.
   - DPR capped at 2. Paused while the element is off screen (IntersectionObserver) and while the tab is hidden.
   - Frame-time governor: if the drawn frames average over 4 ms of main-thread time (30 frames, or every frame of a
     shorter run), the render scale steps 1 → 0.75 → 0.5, then the picture freezes on its last frame.
   - No layout reads in the loop: the element's size comes from a ResizeObserver, the scroll position from a
     ScrollTimeline where one exists (no forced layout), otherwise from scrollY.
   Placement (styles/orb.css): 900 px and wider, right of the headline, vertically centred on the hero text and never
   over a letter; narrower, in the flow above the eyebrow, right-aligned. The CSS fixes the box size, so nothing shifts
   when the canvas arrives, and neither the canvas nor the gradients are LCP candidates. */

const VERT = `attribute vec3 aN;
uniform mat3 uRot;
uniform float uAmp;
uniform float uF;
uniform vec2 uK;
varying vec3 vN;
varying vec3 vP;
float h3(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vn(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),
             mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+1.),f.x),f.y),f.z)*2.-1.;
}
float fld(vec3 n){
  vec3 q=n*1.25+vec3(1.3,uF*.8,uF*.5);
  return vn(q)*.74+vn(q*2.1+vec3(4.1,-uF*.9,1.7))*.26;
}
vec3 disp(vec3 n){return n*(1.+uAmp*fld(n));}
void main(){
  vec3 n=aN;
  vec3 t=normalize(cross(abs(n.y)<.99?vec3(0.,1.,0.):vec3(1.,0.,0.),n));
  vec3 b=cross(n,t);
  vec3 p0=disp(n);
  vec3 g=normalize(cross(disp(normalize(n+t*.03))-p0,disp(normalize(n+b*.03))-p0));
  vec3 P=uRot*p0;
  vN=uRot*(dot(g,n)<0.?-g:g);
  vP=P;
  gl_Position=vec4(P.xy*uK/(4.-P.z),-P.z*.3,1.);
}`;

const FRAG = `precision mediump float;
varying vec3 vN;
varying vec3 vP;
uniform vec3 uHi;
uniform vec3 uBody;
uniform vec3 uDeep;
uniform vec3 uAcc;
uniform vec3 uWarm;
uniform float uRim;
void main(){
  vec3 N=normalize(vN);
  vec3 V=normalize(vec3(0.,0.,4.)-vP);
  vec3 L=normalize(vec3(-.55,.72,.62));
  float d=dot(N,L);
  float lit=smoothstep(-.45,.95,d);
  float nv=max(dot(N,V),0.);
  float fr=pow(1.-nv,2.2);
  vec3 R=reflect(-V,N);
  vec3 col=mix(uDeep,uBody,lit);
  col=mix(col,uHi,smoothstep(.55,1.,d)*.55);
  float side=smoothstep(-.5,.5,N.x-N.y*.8);
  vec3 env=mix(uAcc,uWarm,side);
  col=mix(col,env,fr*uRim);
  float sky=smoothstep(.3,.9,R.y)*(1.-smoothstep(-.4,.2,R.x));
  col=mix(col,uHi,sky*fr*.6);
  col+=uHi*pow(max(dot(R,L),0.),70.)*.9;
  col+=uHi*pow(max(dot(R,normalize(vec3(.6,-.2,.75))),0.),18.)*.12;
  gl_FragColor=vec4(col,1.);
}`;

const SCALES = [1, 0.75, 0.5];
const BUDGET_MS = 4;
const SETTLE_MS = 1500;    // hard stop after the last input
const SEG_U = 88, SEG_V = 60;

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const ease = (dt, tau) => 1 - Math.exp(-dt / tau);
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

function rgb(str, fallback) {
  const s = String(str || '').trim();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return [m[1], m[2], m[3]].map((n) => clamp(parseFloat(n) / 255, 0, 1));
  return fallback;
}

// A UV sphere: positions on the unit sphere (they double as the undisplaced normals), and triangle indices.
function sphere() {
  const pos = new Float32Array((SEG_U + 1) * (SEG_V + 1) * 3);
  let k = 0;
  for (let j = 0; j <= SEG_V; j++) {
    const th = (j / SEG_V) * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i <= SEG_U; i++) {
      const ph = (i / SEG_U) * Math.PI * 2;
      pos[k++] = st * Math.cos(ph); pos[k++] = ct; pos[k++] = st * Math.sin(ph);
    }
  }
  const idx = new Uint16Array(SEG_U * SEG_V * 6);
  k = 0;
  for (let j = 0; j < SEG_V; j++) {
    for (let i = 0; i < SEG_U; i++) {
      const a = j * (SEG_U + 1) + i, b = a + SEG_U + 1;
      idx[k++] = a; idx[k++] = b; idx[k++] = a + 1;
      idx[k++] = a + 1; idx[k++] = b; idx[k++] = b + 1;
    }
  }
  return { pos, idx };
}

// Rotation about y (turn) then x (tilt), column-major for uniformMatrix3fv.
function rotation(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  return new Float32Array([cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]);
}

export function init(el, { tokens, reducedMotion = false } = {}) {
  const noop = { pause() {}, resume() {}, destroy() {}, update() {} };
  if (!el || reducedMotion) return noop;

  const win = window;
  const docEl = document.documentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'orb__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: true, depth: true, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true
  });
  if (!gl) return noop;
  el.appendChild(canvas);

  // ---- State -----------------------------------------------------------------------------------------------
  let prog = null, uni = {}, vbo = null, ibo = null, count = 0, ready = false, compiling = null;
  let raf = 0, lastTs = 0, live = false, paused = false, frozen = false, dead = false;
  let hidden = document.visibilityState === 'hidden', onScreen = true;
  let cssW = 0, cssH = 0, vh = win.innerHeight || 1, maxScroll = 1, dpr = 1, si = 0;
  let colours = null;
  // Targets and eased values: p is scroll progress over the first two screens (0..1), v the scroll speed in screens
  // per second (it fades once scrolling stops), a the appearance (0 = the plain CSS sphere, 1 = liquid).
  let pT = 0, p = 0, vT = 0, v = 0, a = 0;
  let lastY = 0, lastScrollT = 0, lastInput = 0, scrolled = false;
  let gN = 0, gCpu = 0;

  function setTokens(t) {
    const tk = t || {};
    const dark = !!tk.dark;
    const ink = rgb(tk.ink, dark ? [0.945, 0.925, 0.89] : [0.09, 0.078, 0.059]);
    const paper = rgb(tk.paper, dark ? [0.071, 0.067, 0.063] : [0.961, 0.945, 0.918]);
    const acc = rgb(tk.accent, dark ? [0.5, 0.643, 1] : [0.118, 0.31, 0.839]);
    const warm = rgb(tk.warm, [0.788, 0.545, 0.306]);
    colours = dark
      ? { hi: mix(ink, [1, 1, 1], 0.3), body: mix(paper, ink, 0.2), deep: mix(paper, acc, 0.16), acc, warm, rim: 0.95 }
      : { hi: mix(paper, [1, 1, 1], 0.7), body: mix(paper, [1, 1, 1], 0.25), deep: mix(mix(paper, acc, 0.42), ink, 0.12), acc, warm, rim: 0.85 };
  }
  setTokens(tokens);

  // ---- GL setup ----------------------------------------------------------------------------------------------
  function shader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }
  function setup() {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    compiling = gl.getExtension('KHR_parallel_shader_compile');
    ready = false;
    const { pos, idx } = sphere();
    count = idx.length;
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  }
  function finishLink() {
    if (compiling && !gl.getProgramParameter(prog, compiling.COMPLETION_STATUS_KHR)) return false;
    compiling = null;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { destroy(); return false; }
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, 'aN');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    uni = {};
    ['uRot', 'uAmp', 'uF', 'uK', 'uHi', 'uBody', 'uDeep', 'uAcc', 'uWarm', 'uRim'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CW);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    ready = true;
    return true;
  }

  // ---- Sizes (from the ResizeObserver and resize events, never in the loop) -------------------------------------
  function sizeBuffer() {
    if (!cssW || !cssH) return;
    dpr = Math.min(win.devicePixelRatio || 1, 2) * SCALES[si];
    const w = Math.max(1, Math.round(cssW * dpr)), h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  // ---- Drawing -------------------------------------------------------------------------------------------------
  // At rest (top of the page) the surface already ripples a little; two screens down it is at its liveliest.
  function draw() {
    const w = canvas.width, h = canvas.height;
    gl.viewport(0, 0, w, h);
    const e = p * p * (3 - 2 * p);
    const wob = Math.min(Math.abs(v), 1.5);
    gl.uniformMatrix3fv(uni.uRot, false, rotation(0.35 + e * 2.8 + v * 0.12, -0.32 + e * 0.5));
    gl.uniform1f(uni.uAmp, a * (0.085 + 0.15 * e + 0.07 * wob));
    gl.uniform1f(uni.uF, e * 1.9 + v * 0.05);
    // Radius 1 fills 74% of the shorter side (the CSS sphere's size), whatever the box's aspect.
    gl.uniform2f(uni.uK, 2.87 * Math.min(1, h / w), 2.87 * Math.min(1, w / h));
    gl.uniform3fv(uni.uHi, colours.hi);
    gl.uniform3fv(uni.uBody, colours.body);
    gl.uniform3fv(uni.uDeep, colours.deep);
    gl.uniform3fv(uni.uAcc, colours.acc);
    gl.uniform3fv(uni.uWarm, colours.warm);
    gl.uniform1f(uni.uRim, colours.rim);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
  }

  function frame(ts) {
    raf = 0;
    if (dead || paused || hidden || frozen || !onScreen) { lastTs = 0; return; }
    if (!ready && !finishLink()) { if (!dead) raf = win.requestAnimationFrame(frame); return; }
    if (!cssW) return;
    const dt = lastTs ? clamp(ts - lastTs, 1, 64) : 16.7;
    lastTs = ts;
    if (!lastInput) lastInput = ts;
    if (scrolled) readScroll(ts);
    const t0 = performance.now();

    vT *= Math.exp(-dt / 120);
    p += (pT - p) * ease(dt, 170);
    v += (vT - v) * ease(dt, 110);
    a += (1 - a) * ease(dt, 260);
    const settled = Math.abs(pT - p) < 5e-4 && Math.abs(v) < 2e-3 && Math.abs(vT) < 2e-3 && 1 - a < 2e-3;
    const late = ts - lastInput > SETTLE_MS;
    if (settled || late) { p = pT; v = vT = 0; a = 1; }

    draw();
    if (!live) { live = true; el.classList.add('is-live'); }
    govern(performance.now() - t0, settled || late);
    if (settled || late || frozen) { lastTs = 0; lastInput = 0; return; }
    raf = win.requestAnimationFrame(frame);
  }

  function govern(cpu, last) {
    gN++; gCpu += cpu;
    if (gN < 30 && !(last && gN >= 8)) return;
    const avg = gCpu / gN;
    gN = gCpu = 0;
    if (avg <= BUDGET_MS) return;
    if (si < SCALES.length - 1) { si++; sizeBuffer(); }
    else frozen = true;
  }

  function kick() {
    if (!raf && !dead && !paused && !hidden && !frozen && onScreen) raf = win.requestAnimationFrame(frame);
  }

  // ---- Input ---------------------------------------------------------------------------------------------------
  let timeline = null;
  try { if (typeof win.ScrollTimeline === 'function') timeline = new win.ScrollTimeline({ source: docEl, axis: 'block' }); } catch (e) { timeline = null; }
  function scrollTop() {
    const t = timeline && timeline.currentTime;
    if (t && typeof t.value === 'number' && Number.isFinite(t.value)) return (t.value / 100) * maxScroll;
    return win.scrollY || 0;
  }
  function readScroll(ts) {
    scrolled = false;
    const y = scrollTop();
    const dt = Math.max(8, ts - lastScrollT);
    if (ts - lastScrollT < 200) vT = clamp(vT * 0.5 + ((y - lastY) / vh / dt) * 1000 * 0.5 * 0.25, -2, 2);
    lastY = y;
    lastScrollT = ts;
    pT = clamp(y / (2 * vh), 0, 1);
  }
  function onScroll() { scrolled = true; lastInput = 0; kick(); }
  function measurePage() {
    vh = win.innerHeight || docEl.clientHeight || 1;
    maxScroll = Math.max(1, docEl.scrollHeight - vh);
  }
  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measurePage(); scrolled = true; kick(); }, 150);
  }
  function onVisibility() {
    hidden = document.visibilityState === 'hidden';
    if (hidden) { if (raf) win.cancelAnimationFrame(raf); raf = 0; lastTs = 0; }
    else { scrolled = true; lastScrollT = 0; kick(); }
  }
  function onLost(e) {
    e.preventDefault();
    ready = false;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    live = false;
    el.classList.remove('is-live');
  }
  function onRestored() { if (dead) return; setup(); sizeBuffer(); kick(); }

  // The element's own size, and the page height (for the ScrollTimeline's percentage), read only after layout.
  let ro = null, io = null;
  if ('ResizeObserver' in win) {
    ro = new ResizeObserver((entries) => {
      for (const en of entries) {
        if (en.target === el) { cssW = en.contentRect.width; cssH = en.contentRect.height; sizeBuffer(); }
        else maxScroll = Math.max(1, docEl.scrollHeight - vh);
      }
      scrolled = true;
      kick();
    });
    ro.observe(el);
    ro.observe(document.body || docEl);
  } else {
    const r = el.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
  }
  if ('IntersectionObserver' in win) {
    io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) { scrolled = true; lastScrollT = 0; kick(); }
      else if (raf) { win.cancelAnimationFrame(raf); raf = 0; lastTs = 0; }
    });
    io.observe(el);
  }

  const passive = { passive: true };
  win.addEventListener('scroll', onScroll, passive);
  win.addEventListener('resize', onResize, passive);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  // ---- Start ---------------------------------------------------------------------------------------------------
  measurePage();
  lastY = win.scrollY || 0;
  pT = p = clamp(lastY / (2 * vh), 0, 1);
  setup();
  sizeBuffer();
  kick();

  function destroy() {
    if (dead) return;
    dead = true;
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(resizeTimer);
    win.removeEventListener('scroll', onScroll, passive);
    win.removeEventListener('resize', onResize, passive);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (ro) ro.disconnect();
    if (io) io.disconnect();
    try {
      if (!gl.isContextLost()) {
        if (prog) gl.deleteProgram(prog);
        if (vbo) gl.deleteBuffer(vbo);
        if (ibo) gl.deleteBuffer(ibo);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    } catch (e) { /* nothing to free */ }
    live = false;
    el.classList.remove('is-live');
    canvas.remove();
  }

  return {
    pause() { paused = true; if (raf) win.cancelAnimationFrame(raf); raf = 0; lastTs = 0; },
    resume() { if (!paused) return; paused = false; measurePage(); scrolled = true; kick(); },
    destroy,
    update({ tokens: t } = {}) {
      if (dead) return;
      setTokens(t);
      if (frozen) { if (ready && !hidden) draw(); } else kick();
    }
  };
}

export default init;
