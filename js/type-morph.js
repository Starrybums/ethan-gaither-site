/* js/type-morph.js — STUB from the skeleton: the stage driver only, no type morph yet.
   The effects worker replaces this file and keeps this exact behaviour (WORKER-BRIEFS.md, "Type-morph contract"),
   so the home worker can build the frame choreography against it today.

   Loaded by the home page:  <script type="module" src="/js/type-morph.js"></script>  (auto-inits on #build).
   Driver behaviour:
   - Captions are [data-morph-step] elements inside [data-morph-root]. Each carries data-frame="<frame state>" and
     data-font="fraunces|instrument|grotesk|inter".
   - The active caption is the last one at least half inside the reading band. On change the root gets
       data-stage="<1-based index>"  data-frame="<that caption's data-frame>"  data-font="<that caption's data-font>"
     the caption gets .is-active, and the root dispatches CustomEvent('morph:stage', { detail: { index, frame, font } }).
   - Before any caption is reached the root has data-stage="0" and data-frame="intro".
   - Reduced motion or no IntersectionObserver: no attribute is ever set. The page's CSS must treat "no data-stage"
     as the finished, static state (that is also what visitors without JavaScript get). */

function init(root) {
  if (!root || root.dataset.morphReady) return null;
  root.dataset.morphReady = '1';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = Array.from(root.querySelectorAll('[data-morph-step]'));
  if (reduce || !steps.length || !('IntersectionObserver' in window)) return null;

  let index = -1;
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
    entries.forEach((e) => { const i = steps.indexOf(e.target); if (i > -1) ratios[i] = e.intersectionRatio; });
    let n = 0;
    ratios.forEach((r, i) => { if (r >= 0.49) n = i + 1; });
    if (n || index === -1) set(n);
  }, { rootMargin: '-15% 0px -15% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  steps.forEach((s) => io.observe(s));
  set(0);
  return { destroy() { io.disconnect(); } };
}

export { init };
export default init;

const auto = document.querySelector('[data-morph-root]');
if (auto) init(auto);
