/* js/background.js — the scroll-reactive ink-and-paper background. Owner: effects (WORKER-BRIEFS.md §2.2).

   What it draws: four movements, one after another down the page (BRIEF-v3 §14.1). Each one dissolves into the next
   in soft patches as the visitor scrolls, and the colour of the marks and of the wash drifts with them:
     0. Contour lines (the hero): ink lines like an engraved map, every fourth heavier, one level cobalt, a warm wash
        on the high ground. Scroll speed combs them sideways.
     1. A dot grid (the build): a halftone grid like a design canvas, cobalt crosses every sixth point, a cool wash.
        The dots swell in drifting islands as the page scrolls and stretch into streaks with scroll speed.
     2. Long slow waves (what you get, the samples): ribbons of fine warm lines that swell with scroll speed; the wash
        cools from warm to cobalt further down.
     3. A near-still field (the calls to action at the end): paper grain and a soft dusk wash that pools low, moving
        at a twentieth of the scroll.
   On the home page the hand-offs follow the sections (#build, #offer, .closing); other pages spread them over their
   own length, fewer on short pages. Scroll is the only input: the pointer does nothing (Ethan, 2026-10-16: the field
   forming around the mouse was distracting). Nothing moves on its own: the loop runs only while an eased value is
   catching up with the scroll, then stops (WCAG 2.2.2: no automatic motion).

   Contract:  init(canvasEl, { tokens, reducedMotion, intensity }) → { pause(), resume(), destroy(), update({ tokens }) }
   - canvasEl is #bg-canvas inside .bg (which paints the static gradient fallback). .is-live goes on .bg after the
     first frame; the canvas then fades in over the gradient (styles/shell.css).
   - tokens: { ink, paper, accent, warm, alpha, dark } from shell.js readTokens(). Every colour is a token or a mix of
     two. Whatever the movement, no pixel covers the paper at more than tokens.alpha (70% of it on light paper, see
     setTokens), and ink is the strongest mark in both schemes, so every text colour keeps AA over the densest mark.
   - intensity 'full' (home) or 'low' (inner pages: fewer marks, lower alpha, half the scroll-speed response).
   - DPR capped at 2 (1.5 below 700 px wide, and a pixel budget on big screens). Paused while the tab is hidden.
   - Frame-time governor: if the last 30 drawn frames average over 4 ms of main-thread time, the render scale steps
     1 → 0.75 → 0.5, then the picture freezes on its last frame. Slow frame intervals (GPU-bound) step the scale too.
   - WebGL 1, one full-screen triangle, one draw call per frame. Only the one or two movements on screen are computed
     (branches on a uniform), and derivatives are taken outside those branches. No WebGL (or a software-only GPU):
     returns quietly and the gradient stays. Context loss: back to the gradient until the context is restored.
   - No layout reads in the loop: sizes and section positions are cached on resize and when the page height changes. */

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

// Field units: 1 = one viewport height. uK picks the movement (0..3; between two whole numbers, both are drawn and
// dissolve into each other). Each movement returns premultiplied colour and alpha; main() caps the alpha at uA.
// FW(x, e) is fwidth(x) where derivatives exist, else the estimate e; it is only ever used outside a branch.
const FRAG = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
FWDEF
uniform vec2 uR;
uniform float uS;
uniform float uT;
uniform float uP;
uniform float uV;
uniform vec3 uInk;
uniform vec3 uAcc;
uniform vec3 uWarm;
uniform float uA;
uniform float uD;
uniform float uK;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 grad(vec2 i){float a=hash(i)*6.2831853;return vec2(cos(a),sin(a));}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(dot(grad(i),f),dot(grad(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),
             mix(dot(grad(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(grad(i+1.),f-1.),u.x),u.y);
}
vec4 over(vec3 lc,float la,vec3 wc,float wa){return vec4(lc*la+wc*wa*(1.-la),la+wa*(1.-la));}
float lineAt(float x,float fw,float wpx){return clamp(wpx*uS+.5-abs(fract(x+.5)-.5)/fw,0.,1.)*(1.-smoothstep(.1,.42,fw));}
vec4 grid(vec2 uv){
  float n=uD*4.;
  vec2 g=vec2(uv.x,uv.y-uT*.55)*n;
  vec2 id=floor(g),c=fract(g)-.5,ac=abs(c);
  float h=noise(id*.085+vec2(3.1,-uT*.3));
  float r=mix(.04,.18,smoothstep(-.3,.45,h));
  float aa=n/uR.y;
  float dt=1.-smoothstep(r-aa,r+aa,length(vec2(c.x,c.y/(1.+min(abs(uV)*2.4,1.)))));
  float x=step(mod(id.x,6.),.5)*step(mod(id.y,6.),.5);
  float t=n*uS/uR.y*.6;
  float cr=x*max((1.-smoothstep(t,t+aa,ac.x))*step(ac.y,.42),(1.-smoothstep(t,t+aa,ac.y))*step(ac.x,.42));
  dt*=(1.-x)*.9;
  float wa=(.35+.65*smoothstep(-.4,.6,noise(uv*.7+vec2(2.3,-uT*.25))))*uA*.6;
  float la=(dt+cr)*uA;
  return over((mix(uInk,uAcc,.7)*dt+uAcc*cr)/max(dt+cr,1e-4),la,uAcc,wa);
}
vec4 still(vec2 uv){
  vec2 g=vec2(uv.x,uv.y-uT*.05)*(uR.y/uS/3.5);
  vec2 id=floor(g);
  float on=step(.92,hash(id+17.));
  float ga=on*(1.-smoothstep(.26,.46,length(fract(g)-.5)))*(.5+.5*hash(id*1.7+3.))*uA;
  float f=.5+.5*noise(uv*.6+vec2(5.2,-uT*.05));
  float wa=(.4+.6*smoothstep(.25,.85,f))*mix(1.,.45,clamp(uv.y,0.,1.))*uA*.8;
  vec3 dusk=mix(uWarm,uAcc,.55+.2*sin(uv.x*1.3+.5));
  return over(uInk,ga,dusk,wa);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uR.y;
  float i0=floor(uK),t=uK-i0;
  vec4 A=vec4(0.),B=vec4(0.);
  float v=0.,f=0.,h=0.,sw=0.,yw=0.;
  bool c0=uK<1.,c2=abs(uK-2.)<1.;
  if(c0){
    vec2 p=uv*1.5-vec2(0.,uT*.42);
    vec2 w=vec2(noise(p*.65+vec2(1.7,uT*.21)),noise(p*.65+vec2(8.3,2.8)-vec2(uT*.16,0.)));
    vec2 q=p+w*1.15;
    q.x+=uV*.2*sin(q.y*2.6+uT*.8);
    f=noise(q)+.45*noise(q*2.03+4.1);
    v=f*uD*(1.+.22*uP);
  }
  if(c2){
    yw=uv.y-uT*.32;
    sw=.55*sin(uv.x*1.1+uT*.7+1.4*noise(vec2(uv.x*.4,yw*.3)))+.22*sin(uv.x*2.6-uT*.5+yw*1.3)+.1*sin(uv.x*5.3+yw*2.-uT*.8);
    sw=sw*(1.+min(abs(uV),1.)*.9);
    h=(yw+sw*.14)*uD*2.3;
  }
  float fwv=max(FW(v,uD*2.4/uR.y),1e-4);
  float fwh=max(FW(h,uD*3.2/uR.y),1e-4);
  if(c0){
    float lvl=floor(v+.5);
    float acc=step(abs(lvl-2.),.5);
    float idx=max(step(mod(lvl,4.),.5),acc);
    float la=lineAt(v,fwv,.6+.45*idx)*uA*mix(.72,1.,idx);
    A=over(mix(uInk,uAcc,acc),la,uWarm,(.25+.75*smoothstep(.1,.75,f))*uA*.55);
  }
  if(abs(uK-1.)<1.){vec4 o=grid(uv);if(i0<.5)B=o;else A=o;}
  if(c2){
    float idx=step(mod(floor(h+.5),5.),.5);
    float env=smoothstep(-.2,.7,sin(yw*2.2+sw*1.5+.8));
    float la=lineAt(h,fwh,.95+.35*idx)*uA*mix(.6,1.,env);
    vec3 wc=mix(uWarm,uAcc,.15+.45*smoothstep(.3,.9,uP));
    vec4 o=over(mix(uWarm,uInk,idx*.55),la,wc,(.35+.65*env)*uA*.6*(.5+.5*smoothstep(-.3,.6,sw)));
    if(i0<1.5)B=o;else A=o;
  }
  if(uK>2.){vec4 o=still(uv);if(i0<2.5)B=o;else A=o;}
  if(t>.002){
    float n=.5+.6*noise(uv*1.6+vec2(7.1,-uT*.3));
    A=mix(A,B,smoothstep(n-.18,n+.18,t*1.5-.25));
  }
  gl_FragColor=A*min(1.,uA/max(A.a,1e-4));
}`;

const SCALES = [1, 0.75, 0.5];
const BUDGET_MS = 4;           // main-thread time per frame
const SLOW_FRAME_MS = 40;      // average frame interval that counts as GPU-bound (under 25 fps)
const MAX_PIXELS = 3.6e6;      // drawing-buffer pixel cap for big screens

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const ease = (dt, tau) => 1 - Math.exp(-dt / tau);

// "#17140F", "#abc", "rgb(23 20 15)" or "rgb(23, 20, 15)" → [r, g, b] in 0..1. Anything else → fallback.
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

export function init(canvasEl, { tokens, reducedMotion = false, intensity = 'full' } = {}) {
  const noop = { pause() {}, resume() {}, destroy() {}, update() {} };
  if (!canvasEl || reducedMotion || !canvasEl.getContext) return noop;

  const wrap = canvasEl.parentElement;
  const full = intensity === 'full';
  const win = window;
  const docEl = document.documentElement;

  const gl = canvasEl.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true
  });
  if (!gl) return noop;

  // ---- State -----------------------------------------------------------------------------------------------
  let prog = null, uni = {}, buf = null, ready = false, compiling = null;
  let raf = 0, lastTs = 0, live = false, paused = false, frozen = false, dead = false;
  let hidden = document.visibilityState === 'hidden';
  let vw = 0, vh = 0, unit = 0, maxScroll = 1, bufW = 0, bufH = 0, bufCssH = 0, dpr = 1, si = 0;
  let colours = null, alpha = 0.1;
  // Where the movements hand over: three reference positions in page px (the viewport's middle line) and the
  // half-width of each hand-over. Infinity means that movement is never reached on this page.
  let bounds = [Infinity, Infinity, Infinity], bw = 1;

  // Inputs (targets) and their eased values. Scroll is measured in "unit"s: the viewport height, fixed until the width
  // changes, so a phone's address bar sliding in and out does not make the field jump.
  let sT = 0, s = 0, pT = 0, p = 0, vT = 0, v = 0;
  let lastY = 0, lastScrollT = 0;

  // Governor accumulators.
  let gN = 0, gCpu = 0, gDt = 0;

  function setTokens(t) {
    const tk = t || {};
    colours = {
      ink: rgb(tk.ink, tk.dark ? [0.945, 0.925, 0.89] : [0.09, 0.078, 0.059]),
      accent: rgb(tk.accent, tk.dark ? [0.5, 0.643, 1] : [0.118, 0.31, 0.839]),
      warm: rgb(tk.warm, [0.788, 0.545, 0.306])
    };
    // tokens.alpha is the ceiling. On the light paper the lines also cross the static gradient's tinted corners, so
    // they stay at 70% of it there: measured over the densest corner, --accent, --ok, --warn and --ink-2 text keep
    // 4.5:1 (the dark scheme keeps it at the full value).
    const a = parseFloat(tk.alpha);
    alpha = clamp(Number.isFinite(a) ? a : 0.1, 0, 0.2) * (tk.dark ? 1 : 0.7) * (full ? 1 : 0.6);
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
    const deriv = gl.getExtension('OES_standard_derivatives');
    const src = deriv
      ? FRAG.replace('FWDEF', '#define FW(x,e) fwidth(x)')
      : FRAG.replace('#extension GL_OES_standard_derivatives : enable\n', '').replace('FWDEF', '#define FW(x,e) (e)');
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, src);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    // Let the driver compile off the main thread where it can (KHR_parallel_shader_compile); poll in rAF.
    compiling = gl.getExtension('KHR_parallel_shader_compile');
    ready = false;
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  }
  function finishLink() {
    if (compiling && !gl.getProgramParameter(prog, compiling.COMPLETION_STATUS_KHR)) return false;
    compiling = null;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { giveUp(); return false; }
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uni = {};
    ['uR', 'uS', 'uT', 'uP', 'uV', 'uInk', 'uAcc', 'uWarm', 'uA', 'uD', 'uK'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    ready = true;
    return true;
  }

  // ---- Sizes (cached; read on resize and when the page height changes, never in the loop) --------------------
  function measure() {
    const w = win.innerWidth || docEl.clientWidth || 1;
    vh = win.innerHeight || docEl.clientHeight || 1;
    if (!unit || w !== vw) unit = vh;
    vw = w;
    maxScroll = Math.max(1, docEl.scrollHeight - vh);
    sT = (win.scrollY || 0) / unit;
    pT = clamp((win.scrollY || 0) / maxScroll, 0, 1);
    measureBounds();
  }
  // Home: the dot grid takes over as the build reaches the middle of the screen, the waves at "What you get", and the
  // still field as the closing calls to action come up (kept reachable at the very bottom). Other pages spread up to
  // three hand-overs evenly over their own length: one per 1.2 screens of scrolling, so a short page stays calm.
  function measureBounds() {
    const y0 = win.scrollY || 0;
    const top = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + y0 : NaN; };
    const lo = vh * 0.5, hi = maxScroll + vh * 0.5;
    bw = vh * 0.4;
    let b = [top('[data-morph-root]') + vh * 0.1, top('#offer'), top('.closing') - vh * 0.2];
    if (b.every(Number.isFinite)) {
      b[2] = Math.min(b[2], hi - bw);
      b[1] = Math.min(b[1], b[2] - 2 * bw);
      b[0] = Math.max(lo + bw, Math.min(b[0], b[1] - 2 * bw));
    } else {
      const n = Math.min(3, Math.floor((hi - lo) / (1.2 * vh)));
      bw = Math.min(bw, (hi - lo) / (2 * (n + 1)));
      b = [0, 1, 2].map((i) => (i < n ? lo + ((hi - lo) * (i + 1)) / (n + 1) : Infinity));
    }
    bounds = b;
  }
  // Scroll position (px) → movement, 0..3, linear through each hand-over (the shader shapes the dissolve).
  function depthAt(y) {
    const r = y + vh * 0.5;
    let k = 0;
    for (let i = 0; i < 3; i++) k += clamp((r - bounds[i] + bw) / (2 * bw), 0, 1);
    return k;
  }
  function sizeBuffer(force) {
    let d = Math.min(win.devicePixelRatio || 1, vw < 700 ? 1.5 : 2);
    if (vw * vh * d * d > MAX_PIXELS) d = Math.sqrt(MAX_PIXELS / (vw * vh));
    dpr = d * SCALES[si];
    // Phones change innerHeight as the address bar slides; small height changes just stretch the last buffer.
    const sameW = Math.round(vw * dpr) === bufW;
    if (!force && sameW && Math.abs(vh - bufCssH) < 120) return false;
    bufW = Math.max(1, Math.round(vw * dpr));
    bufH = Math.max(1, Math.round(vh * dpr));
    bufCssH = vh;
    canvasEl.width = bufW;
    canvasEl.height = bufH;
    return true;
  }

  // ---- Drawing -------------------------------------------------------------------------------------------------
  function draw() {
    gl.viewport(0, 0, bufW, bufH);
    gl.uniform2f(uni.uR, bufW, bufH);
    gl.uniform1f(uni.uS, dpr);
    gl.uniform1f(uni.uT, s);
    gl.uniform1f(uni.uP, p);
    gl.uniform1f(uni.uV, v);
    gl.uniform3fv(uni.uInk, colours.ink);
    gl.uniform3fv(uni.uAcc, colours.accent);
    gl.uniform3fv(uni.uWarm, colours.warm);
    gl.uniform1f(uni.uA, alpha);
    gl.uniform1f(uni.uD, full ? 7 : 4.5);
    gl.uniform1f(uni.uK, depthAt(s * unit));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(ts) {
    raf = 0;
    if (dead || paused || hidden || frozen) { lastTs = 0; return; }
    if (!ready && !finishLink()) { if (!dead) raf = win.requestAnimationFrame(frame); return; }
    const dt = lastTs ? clamp(ts - lastTs, 1, 64) : 16.7;
    lastTs = ts;
    if (scrolled) readScroll(ts);
    const t0 = performance.now();   // the governor times only this module's own work, not a layout the page owed

    // Scroll speed fades out once scroll events stop; everything else eases toward its target.
    vT *= Math.exp(-dt / 110);
    s += (sT - s) * ease(dt, 170);
    p += (pT - p) * ease(dt, 170);
    v += (vT - v) * ease(dt, 140);

    draw();
    if (!live) { live = true; wrap && wrap.classList.add('is-live'); }

    const settled = Math.abs(sT - s) < 4e-4 && Math.abs(pT - p) < 1e-4 && Math.abs(v) < 2e-3 && Math.abs(vT) < 2e-3;
    govern(performance.now() - t0, dt);
    if (settled || frozen) {
      // Snap to the targets so the last frame is exact, then stop until the next input.
      if (settled && (s !== sT || v !== 0)) { s = sT; p = pT; v = vT = 0; draw(); }
      lastTs = 0;
      return;
    }
    raf = win.requestAnimationFrame(frame);
  }

  function govern(cpu, dt) {
    gN++; gCpu += cpu; gDt += dt;
    if (gN < 30) return;
    const avgCpu = gCpu / gN, avgDt = gDt / gN;
    gN = gCpu = gDt = 0;
    if (avgCpu <= BUDGET_MS && avgDt <= SLOW_FRAME_MS) return;
    if (si < SCALES.length - 1) { si++; sizeBuffer(true); }
    else if (avgCpu > BUDGET_MS) frozen = true;   // keep the last frame on screen, stop drawing
  }

  function kick() {
    if (!raf && !dead && !paused && !hidden && !frozen) raf = win.requestAnimationFrame(frame);
  }

  // ---- Input ---------------------------------------------------------------------------------------------------
  // The scroll handler only flags; the position is read once per frame, in the loop. Reading window.scrollY makes
  // Chrome finish any pending style and layout on the spot, so where scroll-driven animations exist the position
  // comes from a ScrollTimeline instead: its current time is the scroll position as of this frame, already measured.
  let scrolled = false;
  let timeline = null;
  try { if (typeof win.ScrollTimeline === 'function') timeline = new win.ScrollTimeline({ source: docEl, axis: 'block' }); } catch (e) { timeline = null; }
  function scrollTop() {
    const t = timeline && timeline.currentTime;
    if (t && typeof t.value === 'number' && Number.isFinite(t.value)) return (t.value / 100) * maxScroll;
    return win.scrollY || 0;
  }
  function onScroll() { scrolled = true; kick(); }
  function readScroll(ts) {
    scrolled = false;
    const y = scrollTop();
    const dt = Math.max(8, ts - lastScrollT);
    // A first scroll after a pause measures from the last known position, so it does not read as a huge flick.
    if (ts - lastScrollT < 200) vT = clamp(vT * 0.5 + ((y - lastY) / dt / 3) * 0.5 * (full ? 1 : 0.5), -1, 1);
    lastY = y;
    lastScrollT = ts;
    sT = y / unit;
    pT = clamp(y / maxScroll, 0, 1);
  }
  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      s = sT; p = pT;
      sizeBuffer(false);
      kick();
    }, 150);
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
    wrap && wrap.classList.remove('is-live');
  }
  function onRestored() { if (dead) return; setup(); sizeBuffer(true); kick(); }
  function giveUp() { destroy(); }

  // The page grows as images and fonts arrive; keep maxScroll and the section anchors true without reading layout
  // in the loop. A ResizeObserver callback runs right after layout, so reading positions there costs nothing extra.
  let ro = null;
  if ('ResizeObserver' in win) {
    ro = new ResizeObserver(() => {
      maxScroll = Math.max(1, docEl.scrollHeight - vh);
      measureBounds();
      scrolled = true;
      kick();
    });
    ro.observe(document.body || docEl);
  }

  const passive = { passive: true };
  win.addEventListener('scroll', onScroll, passive);
  win.addEventListener('resize', onResize, passive);
  document.addEventListener('visibilitychange', onVisibility);
  canvasEl.addEventListener('webglcontextlost', onLost);
  canvasEl.addEventListener('webglcontextrestored', onRestored);

  // ---- Start ---------------------------------------------------------------------------------------------------
  measure();
  s = sT; p = pT;
  lastY = win.scrollY || 0;
  setup();
  sizeBuffer(true);
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
    canvasEl.removeEventListener('webglcontextlost', onLost);
    canvasEl.removeEventListener('webglcontextrestored', onRestored);
    if (ro) ro.disconnect();
    try {
      if (!gl.isContextLost()) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (prog) gl.deleteProgram(prog);
        if (buf) gl.deleteBuffer(buf);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
    } catch (e) { /* nothing to free */ }
    live = false;
    wrap && wrap.classList.remove('is-live');
  }

  return {
    pause() { paused = true; if (raf) win.cancelAnimationFrame(raf); raf = 0; lastTs = 0; },
    resume() { if (!paused) return; paused = false; measure(); kick(); },
    destroy,
    update({ tokens: t } = {}) {
      if (dead) return;
      setTokens(t);
      if (frozen) { if (ready && !hidden) draw(); } else kick();
    }
  };
}

export default init;
