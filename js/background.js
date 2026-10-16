/* js/background.js — the scroll-reactive ink-and-paper background. Owner: effects (WORKER-BRIEFS.md §2.2).

   What it draws: faint ink contour lines over the paper, like an engraved map or a marbled endpaper. Every fourth
   line is a little heavier, one level is cobalt, and a warm wash pools on the high ground. Scrolling drags the field
   up (slower than the text) and re-forms it, scroll speed combs the lines sideways, and a mouse bends them around the
   pointer. Nothing moves on its own: the
   loop runs only while an eased value is catching up with input, then stops (WCAG 2.2.2: no automatic motion).

   Contract:  init(canvasEl, { tokens, reducedMotion, intensity }) → { pause(), resume(), destroy(), update({ tokens }) }
   - canvasEl is #bg-canvas inside .bg (which paints the static gradient fallback). .is-live goes on .bg after the
     first frame; the canvas then fades in over the gradient (styles/shell.css).
   - tokens: { ink, paper, accent, warm, alpha, dark } from shell.js readTokens(). No mark covers the paper at more
     than tokens.alpha (70% of it on light paper, see setTokens), so every text colour keeps AA over the densest mark.
   - intensity 'full' (home) or 'low' (inner pages: fewer lines, lower alpha, no pointer response).
   - DPR capped at 2 (1.5 below 700 px wide, and a pixel budget on big screens). Paused while the tab is hidden.
   - Frame-time governor: if the last 30 drawn frames average over 4 ms of main-thread time, the render scale steps
     1 → 0.75 → 0.5, then the picture freezes on its last frame. Slow frame intervals (GPU-bound) step the scale too.
   - WebGL 1, one full-screen triangle, one draw call per frame. No WebGL (or a software-only GPU): returns quietly
     and the gradient stays. Context loss: back to the gradient until the context is restored.
   - No layout reads in the loop: sizes are cached on resize and when the page height changes. */

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

// Field units: 1 = one viewport height. Gradient noise, domain-warped, contoured with screen-space derivatives.
const FRAG = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR;
uniform float uS;
uniform float uT;
uniform float uP;
uniform float uV;
uniform vec3 uM;
uniform vec3 uInk;
uniform vec3 uAcc;
uniform vec3 uWarm;
uniform float uA;
uniform float uD;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 grad(vec2 i){float a=hash(i)*6.2831853;return vec2(cos(a),sin(a));}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(dot(grad(i),f),dot(grad(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),
             mix(dot(grad(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(grad(i+1.),f-1.),u.x),u.y);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uR.y;
  vec2 p=uv*1.5+vec2(0.,uT*.42);
  vec2 w=vec2(noise(p*.65+vec2(1.7,uT*.21)),noise(p*.65+vec2(8.3,2.8)-vec2(uT*.16,0.)));
  vec2 q=p+w*1.15;
  q.x+=uV*.2*sin(q.y*2.6+uT*.8);
  vec2 d=uv-uM.xy;
  q+=d*(uM.z*1.6*exp(-dot(d,d)*16.));
  float f=noise(q)+.45*noise(q*2.03+4.1);
  float v=f*uD*(1.+.22*uP);
  float fw=max(FW,1e-4);
  float px=abs(fract(v+.5)-.5)/fw;
  float lvl=floor(v+.5);
  float acc=step(abs(lvl-2.),.5);
  float idx=max(step(mod(lvl,4.),.5),acc);
  float line=clamp((.6+.45*idx)*uS+.5-px,0.,1.)*smoothstep(.42,.1,fw);
  float la=line*uA*mix(.72,1.,idx);
  float wa=smoothstep(.22,.75,f)*uA*.5;
  float a=la+wa*(1.-la);
  vec3 c=mix(uInk,uAcc,acc)*la+uWarm*wa*(1.-la);
  float k=min(1.,uA/max(a,1e-4));
  gl_FragColor=vec4(c*k,a*k);
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

  // Inputs (targets) and their eased values. Scroll is measured in "unit"s: the viewport height, fixed until the width
  // changes, so a phone's address bar sliding in and out does not make the field jump.
  let sT = 0, s = 0, pT = 0, p = 0, vT = 0, v = 0;
  let lastY = 0, lastScrollT = 0;
  let mxT = 0.5, myT = 0.5, mx = 0.5, my = 0.5, mT = 0, m = 0;

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
      ? FRAG.replace('FW', 'fwidth(v)')
      : FRAG.replace('#extension GL_OES_standard_derivatives : enable\n', '').replace('FW', '(uD*2.4/uR.y)');
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
    ['uR', 'uS', 'uT', 'uP', 'uV', 'uM', 'uInk', 'uAcc', 'uWarm', 'uA', 'uD'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
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
    gl.uniform3f(uni.uM, mx * vw / vh, my, full ? m : 0);
    gl.uniform3fv(uni.uInk, colours.ink);
    gl.uniform3fv(uni.uAcc, colours.accent);
    gl.uniform3fv(uni.uWarm, colours.warm);
    gl.uniform1f(uni.uA, alpha);
    gl.uniform1f(uni.uD, full ? 7 : 4.5);
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
    mx += (mxT - mx) * ease(dt, 110);
    my += (myT - my) * ease(dt, 110);
    m += (mT - m) * ease(dt, 260);

    draw();
    if (!live) { live = true; wrap && wrap.classList.add('is-live'); }

    const settled = Math.abs(sT - s) < 4e-4 && Math.abs(pT - p) < 1e-4 && Math.abs(v) < 2e-3 && Math.abs(vT) < 2e-3 &&
      Math.abs(mxT - mx) < 1e-3 && Math.abs(myT - my) < 1e-3 && Math.abs(mT - m) < 2e-3;
    govern(performance.now() - t0, dt);
    if (settled || frozen) {
      // Snap to the targets so the last frame is exact, then stop until the next input.
      if (settled && (s !== sT || v !== 0)) { s = sT; p = pT; v = vT = 0; mx = mxT; my = myT; m = mT; draw(); }
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
  function onPointer(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    mxT = e.clientX / vw;
    myT = 1 - e.clientY / vh;
    if (!mT) { mx = mxT; my = myT; }   // appear where the pointer is, don't fly in from the last spot
    mT = 1;
    kick();
  }
  function onLeave() { mT = 0; kick(); }
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

  // The page grows as images and fonts arrive; keep maxScroll true without reading layout in the loop. A
  // ResizeObserver callback runs right after layout, so reading scrollHeight there costs nothing extra.
  let ro = null;
  if ('ResizeObserver' in win) {
    ro = new ResizeObserver(() => {
      maxScroll = Math.max(1, docEl.scrollHeight - vh);
      scrolled = true;
      kick();
    });
    ro.observe(document.body || docEl);
  }

  const finePointer = full && win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const passive = { passive: true };
  win.addEventListener('scroll', onScroll, passive);
  win.addEventListener('resize', onResize, passive);
  document.addEventListener('visibilitychange', onVisibility);
  canvasEl.addEventListener('webglcontextlost', onLost);
  canvasEl.addEventListener('webglcontextrestored', onRestored);
  if (finePointer) {
    win.addEventListener('pointermove', onPointer, passive);
    docEl.addEventListener('pointerleave', onLeave, passive);
  }

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
    win.removeEventListener('pointermove', onPointer, passive);
    docEl.removeEventListener('pointerleave', onLeave, passive);
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
