/* js/type-morph.js — the build section's stage driver and type morph. Owner: effects (WORKER-BRIEFS.md §2.5).
   Loaded by the home page:  <script type="module" src="/js/type-morph.js"></script>  (auto-inits on [data-morph-root]).

   1. Stage driver (the contract the home page's frame choreography is keyed on)
   - Captions are [data-morph-step] elements inside [data-morph-root]. Each carries data-frame="<frame state>" and
     data-font="fraunces|instrument|grotesk|inter".
   - The active caption is the last one at least half inside the reading band (the viewport minus 15% top and
     bottom). On change the root gets
       data-stage="<1-based index>"  data-frame="<that caption's data-frame>"  data-font="<that caption's data-font>"
     the caption gets .is-active, and the root dispatches CustomEvent('morph:stage', { detail: { index, frame, font } }).
   - Before any caption is reached the root has data-stage="0" and data-frame="intro" (also after scrolling back up
     above the first caption). Past the last caption the last stage holds (also after a jump past the build).
   - Reduced motion or no IntersectionObserver: no attribute is ever set. "No data-stage" is the finished, static
     state (that is also what visitors without JavaScript get).

   2. The morph (styles/effects.css does the drawing)
   - Title: [data-morph-title]'s text is wrapped in a Fraunces face, with three aria-hidden faces beside it
     (Instrument Serif, Space Grotesk, Inter Tight) that draw the same words as CSS generated content, all stacked in
     one box. CSS crossfades to the root's data-font. The heading's text exists once in the DOM.
   - Captions: each caption's <h3> text is wrapped in .morph-cap (it morphs along its family's axes as the caption
     crosses the viewport) beside an aria-hidden copy at rest (generated content) that holds the heading's size, so nothing reflows
     outside the heading. Native CSS scroll-driven animation where supported. Elsewhere this file writes --morph-p
     (0..1, how far the caption has crossed the viewport) on each caption while it is on screen; the same CSS reads it.
   - If the visitor turns on reduced motion mid-visit, everything is put back to the static state. */

const FACES = ['fraunces', 'instrument', 'grotesk', 'inter'];
const reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/* ---- 1. Stage driver ------------------------------------------------------------------------------------------- */
function driver(root, steps) {
  let index = -1;
  let firstBelow = true;   // is the first caption below the reading band (we are above the whole build)?
  let lastAbove = false;   // is the last caption above the reading band (we are past the whole build)?
  const ratios = steps.map(() => 0);
  const set = (n) => {
    if (n === index) return;
    index = n;
    const step = steps[n - 1];
    root.dataset.stage = String(n);
    root.dataset.frame = step ? step.dataset.frame || '' : 'intro';
    root.dataset.font = step ? step.dataset.font || '' : '';
    steps.forEach((s, i) => s.classList.toggle('is-active', i === n - 1));
    root.dispatchEvent(new CustomEvent('morph:stage', { detail: { index: n, frame: root.dataset.frame, font: root.dataset.font } }));
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.target === root) {
        // The section itself: catches jumps (Home key, a "back to top" link) that skip every caption.
        const top = e.rootBounds ? e.rootBounds.top : window.innerHeight * 0.15;
        const bottom = e.rootBounds ? e.rootBounds.bottom : window.innerHeight * 0.85;
        if (e.boundingClientRect.top > top) { firstBelow = true; lastAbove = false; }
        else if (e.boundingClientRect.bottom < bottom) { lastAbove = true; firstBelow = false; }
        return;
      }
      const i = steps.indexOf(e.target);
      if (i > -1) ratios[i] = e.intersectionRatio;
      if (i === 0) {
        const bottom = e.rootBounds ? e.rootBounds.bottom : window.innerHeight * 0.85;
        firstBelow = e.boundingClientRect.top >= bottom - 1;
      }
      if (i === steps.length - 1) {
        const top = e.rootBounds ? e.rootBounds.top : window.innerHeight * 0.15;
        lastAbove = e.boundingClientRect.bottom <= top + 1;
      }
    });
    let n = 0;
    ratios.forEach((r, i) => { if (r >= 0.49) n = i + 1; });
    if (n || index === -1) set(n);
    else if (index > 0 && firstBelow) set(0);                     // back up above the first caption
    else if (lastAbove && index !== steps.length) set(steps.length); // past the last caption
  }, { rootMargin: '-15% 0px -15% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  steps.forEach((s) => io.observe(s));
  io.observe(root);
  set(0);
  return () => {
    io.disconnect();
    ['stage', 'frame', 'font'].forEach((k) => { delete root.dataset[k]; });
    steps.forEach((s) => s.classList.remove('is-active'));
  };
}

/* ---- 2a. Title faces -------------------------------------------------------------------------------------------- */
function faces(root) {
  const title = root.querySelector('[data-morph-title]');
  if (!title || title.querySelector('.morph-face')) return () => {};
  const text = title.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return () => {};
  const frag = document.createDocumentFragment();
  FACES.forEach((face, i) => {
    const span = document.createElement('span');
    span.className = 'morph-face';
    span.dataset.face = face;
    // The Fraunces face keeps the real text. The other three draw it as CSS generated content (::before), so the
    // heading's text, find-in-page and copy-paste still hold it once, and they are aria-hidden as well.
    if (i) { span.dataset.text = text; span.setAttribute('aria-hidden', 'true'); }
    else span.textContent = text;
    frag.appendChild(span);
  });
  title.textContent = '';
  title.appendChild(frag);
  title.classList.add('has-faces');
  return () => { title.classList.remove('has-faces'); title.textContent = text; };
}

/* ---- 2b. Caption headings: the morphing text plus an invisible copy at rest --------------------------------------
   <h3><span class="morph-cap">text</span><span class="morph-cap-sizer" aria-hidden="true" data-text="text"></span></h3>
   Both sit in one grid cell. The copy stays at the rest axes (the widest state), so the heading's box keeps its rest
   size while the visible text gets lighter and narrower: the caption card never resizes mid-scroll. */
function captionText(steps) {
  const undo = [];
  steps.forEach((step) => {
    const h = step.querySelector('h3');
    if (!h || h.querySelector('.morph-cap') || !h.textContent.trim()) return;
    const original = Array.from(h.childNodes);
    const cap = document.createElement('span');
    cap.className = 'morph-cap';
    original.forEach((n) => cap.appendChild(n));
    const sizer = document.createElement('span');   // text as generated content: not in textContent, not findable
    sizer.className = 'morph-cap-sizer';
    sizer.dataset.text = cap.textContent.replace(/\s+/g, ' ').trim();
    sizer.setAttribute('aria-hidden', 'true');
    h.append(cap, sizer);
    h.classList.add('has-cap');
    undo.push(() => { h.classList.remove('has-cap'); h.textContent = ''; original.forEach((n) => h.appendChild(n)); });
  });
  return () => undo.forEach((fn) => fn());
}

/* ---- 2c. Caption morph fallback (no animation-timeline: view()) -------------------------------------------------- */
function captionFallback(root, steps) {
  const native = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (native) return () => {};
  root.classList.add('morph-js');
  const onScreen = new Set();
  let raf = 0;
  let vh = window.innerHeight;
  const write = () => {
    raf = 0;
    // Read every box first, then write, so the browser lays out once.
    const boxes = [];
    onScreen.forEach((el) => boxes.push([el, el.getBoundingClientRect()]));
    boxes.forEach(([el, r]) => {
      // Rounded to 1/46: about 16 steps on each slope of the curve, like the stepped keyframes in effects.css,
      // so the heading is re-shaped only when a step changes.
      const p = (Math.round(Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))) * 46) / 46).toFixed(4);
      if (el.style.getPropertyValue('--morph-p') !== p) el.style.setProperty('--morph-p', p);
    });
  };
  const tick = () => { if (!raf && onScreen.size) raf = requestAnimationFrame(write); };
  const onResize = () => { vh = window.innerHeight; tick(); };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target); });
    tick();
  }, { rootMargin: '5% 0px 5% 0px' });
  steps.forEach((s) => io.observe(s));
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  return () => {
    io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('scroll', tick);
    window.removeEventListener('resize', onResize);
    root.classList.remove('morph-js');
    steps.forEach((s) => s.style.removeProperty('--morph-p'));
  };
}

/* ---- Init ------------------------------------------------------------------------------------------------------ */
function init(root) {
  if (!root || root.dataset.morphReady) return null;
  root.dataset.morphReady = '1';
  const reduce = reduceMq && reduceMq.matches;
  const steps = Array.from(root.querySelectorAll('[data-morph-step]'));
  if (reduce || !steps.length || !('IntersectionObserver' in window)) return null;

  const undo = [faces(root), captionText(steps), captionFallback(root, steps), driver(root, steps)];
  let done = false;
  const destroy = () => {
    if (done) return;
    done = true;
    undo.reverse().forEach((fn) => fn());
    if (reduceMq && reduceMq.removeEventListener) reduceMq.removeEventListener('change', onReduce);
  };
  const onReduce = (e) => { if (e.matches) destroy(); };
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener('change', onReduce);
  return { destroy };
}

export { init };
export default init;

const auto = document.querySelector('[data-morph-root]');
if (auto) init(auto);
