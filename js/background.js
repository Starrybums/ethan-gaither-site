/* js/background.js — STUB from the skeleton. The effects worker replaces this file (WORKER-BRIEFS.md, "effects").
   Contract: export function init(canvasEl, { tokens, reducedMotion, intensity }) → { pause, resume, destroy, update }
   This stub draws nothing and leaves the static CSS gradient in place, so pages work before the real module lands. */
export function init(canvasEl, opts = {}) {
  void canvasEl; void opts;
  const noop = () => {};
  return { pause: noop, resume: noop, destroy: noop, update: noop };
}
export default init;
