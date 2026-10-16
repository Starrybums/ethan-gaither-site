/* js/buttons.js — pointer behaviour for the button catalogue in styles/buttons.css.
   import { initButtons } from '/js/buttons.js';  initButtons(rootElement?)  (shell.js calls it once for document;
   call it again with a container if you add buttons later; already-wired buttons are skipped).
   Owned by the architect. No dependencies.

   What runs where:
   - Pointer-following parts (glass highlight, 3D tilt, magnetic drift, ink entry point) only on a fine pointer
     that can hover, and never under reduced motion.
   - Press state (.is-pressed) on every pointer type, so touch gets a visible push.
   - Draw: injects the SVG outline on every device (it also shows on keyboard focus).
   - Glass: sets data-refract on Chromium only (navigator.userAgentData exists only there; Chrome on iOS is WebKit and
     lacks it). Safari and Firefox parse backdrop-filter: url() but paint nothing, so @supports cannot gate it. */

const mq = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
const finePointer = mq('(hover: hover) and (pointer: fine)');
const reducedMotion = mq('(prefers-reduced-motion: reduce)');
const canMove = () => finePointer.matches && !reducedMotion.matches;
const SVGNS = 'http://www.w3.org/2000/svg';

function wrapLabel(btn) {
  if (btn.querySelector('.btn__label')) return;
  const nodes = Array.from(btn.childNodes).filter((n) => n.nodeType === 3 ? n.textContent.trim() : !(n.classList && n.classList.contains('fx-draw')));
  if (!nodes.length) return;
  const span = document.createElement('span');
  span.className = 'btn__label';
  btn.insertBefore(span, nodes[0]);
  nodes.forEach((n) => span.appendChild(n));
}

function pressState(btn) {
  const on = () => btn.classList.add('is-pressed');
  const off = () => btn.classList.remove('is-pressed');
  btn.addEventListener('pointerdown', on);
  ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((t) => btn.addEventListener(t, off));
  btn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') on(); });
  btn.addEventListener('keyup', off);
}

function local(btn, e) {
  const r = btn.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
}

/* 1. Liquid glass: the highlight follows the pointer. */
function glass(btn) {
  // The object itself is the signal (its brand list can be empty under device emulation).
  if (navigator.userAgentData) btn.setAttribute('data-refract', '');
  btn.addEventListener('pointermove', (e) => {
    if (!canMove()) return;
    const p = local(btn, e);
    btn.style.setProperty('--mx', ((p.x / p.w) * 100).toFixed(1) + '%');
    btn.style.setProperty('--my', ((p.y / p.h) * 100).toFixed(1) + '%');
  });
  btn.addEventListener('pointerleave', () => { btn.style.removeProperty('--mx'); btn.style.removeProperty('--my'); });
}

/* 2. 3D press: tilt toward the pointer, at most 10 degrees. */
function press3d(btn) {
  const MAX = 10;
  btn.addEventListener('pointermove', (e) => {
    if (!canMove()) return;
    const p = local(btn, e);
    const nx = p.x / p.w - 0.5, ny = p.y / p.h - 0.5;
    btn.style.setProperty('--ry', (nx * MAX * 2).toFixed(2) + 'deg');
    btn.style.setProperty('--rx', (-ny * MAX * 2).toFixed(2) + 'deg');
  });
  btn.addEventListener('pointerleave', () => { btn.style.removeProperty('--rx'); btn.style.removeProperty('--ry'); });
}

/* 3. Magnetic: one rAF-throttled pointer listener for all magnetic buttons that are on screen. */
const magnets = new Set();
let magnetIo = null, magnetQueued = false, lastPointer = null;
function magnetFrame() {
  magnetQueued = false;
  if (!lastPointer) return;
  magnets.forEach((btn) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = lastPointer.x - cx, dy = lastPointer.y - cy;
    const reach = Math.max(r.width, r.height) / 2 + 48;
    const dist = Math.hypot(dx, dy);
    if (canMove() && dist < reach) {
      const pull = 0.3 * (1 - dist / reach) + 0.12;
      btn.classList.add('is-near');
      btn.style.setProperty('--tx', (dx * pull).toFixed(1) + 'px');
      btn.style.setProperty('--ty', (dy * pull).toFixed(1) + 'px');
    } else if (btn.classList.contains('is-near')) {
      btn.classList.remove('is-near');
      btn.style.removeProperty('--tx');
      btn.style.removeProperty('--ty');
    }
  });
}
function onPointer(e) {
  if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  lastPointer = { x: e.clientX, y: e.clientY };
  if (!magnetQueued && magnets.size) { magnetQueued = true; requestAnimationFrame(magnetFrame); }
}
function magnetic(btn) {
  wrapLabel(btn);
  if (!('IntersectionObserver' in window)) return;
  if (!magnetIo) {
    magnetIo = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) magnets.add(en.target); else magnets.delete(en.target); });
    });
    window.addEventListener('pointermove', onPointer, { passive: true });
  }
  magnetIo.observe(btn);
}

/* 4. Ink fill: floods in from the edge the pointer entered, drains toward the edge it left. */
function ink(btn) {
  const edge = (e) => {
    const p = local(btn, e);
    // The nearest edge to the pointer, as a point on that edge.
    const d = { left: p.x, right: p.w - p.x, top: p.y, bottom: p.h - p.y };
    const side = Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
    const x = side === 'left' ? 0 : side === 'right' ? 100 : (p.x / p.w) * 100;
    const y = side === 'top' ? 0 : side === 'bottom' ? 100 : (p.y / p.h) * 100;
    btn.style.setProperty('--ix', x.toFixed(1) + '%');
    btn.style.setProperty('--iy', y.toFixed(1) + '%');
  };
  btn.addEventListener('pointerenter', (e) => { if (canMove()) edge(e); });
  btn.addEventListener('pointerleave', (e) => { if (canMove()) edge(e); });
}

/* 5. Border draw: an SVG rect with pathLength 1, drawn by CSS. */
function draw(btn) {
  if (btn.querySelector('.fx-draw')) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'fx-draw');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const rect = document.createElementNS(SVGNS, 'rect');
  rect.setAttribute('pathLength', '1');
  const radius = parseFloat(getComputedStyle(btn).borderTopLeftRadius) || 0;
  if (radius) { rect.setAttribute('rx', String(radius)); rect.setAttribute('ry', String(radius)); }
  svg.appendChild(rect);
  btn.appendChild(svg);
}

const TECHNIQUES = { glass, press3d, magnetic, ink, draw };

export function initButtons(root = document) {
  root.querySelectorAll('.btn').forEach((btn) => {
    if (btn.dataset.fxReady) return;
    btn.dataset.fxReady = '1';
    pressState(btn);
    const fx = TECHNIQUES[btn.dataset.fx];
    if (fx) fx(btn);
  });
}

export default initButtons;
