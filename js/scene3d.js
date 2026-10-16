/* js/scene3d.js — the 3D showcase: a laptop, a phone and a browser card of the samples that turn and pull apart
   as the section crosses the screen. Owner: effects (WORKER-BRIEFS.md §2.3).

   Contract:  init(sectionEl, { tokens, reducedMotion }) → { pause(), resume(), destroy(), update({ tokens }) }
   - sectionEl is a [data-scene3d] element holding <div class="scene3d" data-scene3d-stage> with 2 to 4
     [data-layer="laptop|phone|card|card-2"] screenshots.
   - This file only writes --scene-p (0 as the section's top enters the viewport, 1 as its bottom leaves) on
     sectionEl, at most once per frame and only while the section is on screen, and adds .is-live
     (and .is-active while on screen, which turns on will-change). Every transform lives in styles/effects.css.
   - Without this file (no JavaScript, reduced motion, save-data) the CSS shows a still, angled composition.
   - No layout reads while scrolling: progress comes from a ViewTimeline where one exists, otherwise from scrollY and
     the section's position, cached on resize and when the page height changes. */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function init(sectionEl, { reducedMotion = false } = {}) {
  const noop = { pause() {}, resume() {}, destroy() {}, update() {} };
  if (!sectionEl || reducedMotion || !('IntersectionObserver' in window)) return noop;
  if (!sectionEl.querySelector('[data-layer]')) return noop;

  const win = window;
  let top = 0, height = 1, vh = win.innerHeight || 1;
  let raf = 0, active = false, paused = false, dead = false, last = -1;
  let settleTimer = 0;

  // Read layout only here (resize, page height change, entering the viewport).
  function measure() {
    const r = sectionEl.getBoundingClientRect();
    top = r.top + (win.scrollY || 0);
    height = Math.max(1, r.height);
    vh = win.innerHeight || 1;
  }
  // Where scroll-driven animations exist, a ViewTimeline on the section gives this exact progress (0 to 100% over
  // the section's cover range) as of this frame, without the forced style/layout pass that reading scrollY costs.
  let timeline = null;
  try { if (typeof win.ViewTimeline === 'function') timeline = new win.ViewTimeline({ subject: sectionEl, axis: 'block' }); } catch (e) { timeline = null; }
  function progress() {
    const t = timeline && timeline.currentTime;
    if (t && typeof t.value === 'number' && Number.isFinite(t.value)) return clamp01(t.value / 100);
    return clamp01(((win.scrollY || 0) + vh - top) / (vh + height));
  }
  function write() {
    raf = 0;
    if (!active || paused || dead) return;
    const p = progress();
    if (Math.abs(p - last) < 0.0005) return;
    last = p;
    sectionEl.style.setProperty('--scene-p', p.toFixed(4));
  }
  function tick() { if (!raf && active && !paused && !dead) raf = win.requestAnimationFrame(write); }

  const io = new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    active = e.isIntersecting;
    sectionEl.classList.toggle('is-active', active);
    if (active) { measure(); tick(); }
  });
  let ro = null, roPending = 0;
  if ('ResizeObserver' in win) {
    ro = new ResizeObserver(() => {
      if (roPending) return;
      roPending = win.requestAnimationFrame(() => { roPending = 0; measure(); tick(); });
    });
    ro.observe(document.body || document.documentElement);
  }
  const onResize = () => { measure(); tick(); };
  win.addEventListener('scroll', tick, { passive: true });
  win.addEventListener('resize', onResize, { passive: true });

  // First paint: set the real progress, then let the layers ease once from the still composition to it
  // (.is-settling carries a short transition in effects.css), so a section already on screen does not jump.
  measure();
  active = true;
  write();
  active = false;
  sectionEl.classList.add('is-live', 'is-settling');
  settleTimer = win.setTimeout(() => sectionEl.classList.remove('is-settling'), 700);
  io.observe(sectionEl);

  function destroy() {
    if (dead) return;
    dead = true;
    io.disconnect();
    if (ro) ro.disconnect();
    if (raf) win.cancelAnimationFrame(raf);
    if (roPending) win.cancelAnimationFrame(roPending);
    win.clearTimeout(settleTimer);
    win.removeEventListener('scroll', tick);
    win.removeEventListener('resize', onResize);
    sectionEl.classList.remove('is-live', 'is-active', 'is-settling');
    sectionEl.style.removeProperty('--scene-p');
  }

  return {
    pause() { paused = true; if (raf) win.cancelAnimationFrame(raf); raf = 0; },
    resume() { if (!paused || dead) return; paused = false; measure(); tick(); },
    destroy,
    update() { /* colours live in CSS tokens; nothing to redraw */ }
  };
}

export default init;
