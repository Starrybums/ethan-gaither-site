/* js/shell.js — runs on every portfolio page (not the samples). Loaded as <script type="module" src="/js/shell.js">.
   Owned by the architect. Page modules (home, form, type morph) load separately and never depend on this file's
   timing; they can import SITE from /js/config.js themselves.

   1. applies js/config.js to [data-site], [data-site-mailto], [data-site-link]
   2. aria-current on the nav (also baked into each page), and the sliding nav underline
   3. reveals: [data-reveal] and [data-reveal-stagger] children, IntersectionObserver, once
   4. copy-email buttons ([data-copy-email] + [data-copy-note])
   5. config-driven blocks: the sample cards ([data-samples-grid]), certifications ([data-certs]),
      the booking button ([data-booking]), the reply promise ([data-promise])
   6. the button catalogue (js/buttons.js)
   7. lazy effects: after load, on idle (or a 1.2 s timer where requestIdleCallback is missing) or the first scroll/pointer
      move, imports js/background.js for #bg-canvas and js/scene3d.js
      for each [data-scene3d], unless the visitor asks for reduced motion or save-data. See WORKER-BRIEFS.md, "Effects contract".
   Page transitions are CSS only (@view-transition in styles/motion.css); nothing to do here. */

import SITE from './config.js';
import { initButtons } from './buttons.js';

const root = document.documentElement;
root.classList.add('shell-ready');

const $ = (sel, el) => (el || document).querySelector(sel);
const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
const media = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
const reduceMq = media('(prefers-reduced-motion: reduce)');
const saveData = !!(navigator.connection && navigator.connection.saveData);

/* 1. Config ------------------------------------------------------------------------- */
function applyConfig() {
  $$('[data-site]').forEach((el) => {
    const v = SITE[el.getAttribute('data-site')];
    if (typeof v === 'string' && v) el.textContent = v;
  });
  $$('[data-site-mailto]').forEach((a) => { if (SITE.email) a.setAttribute('href', 'mailto:' + SITE.email); });
  $$('[data-site-link]').forEach((a) => {
    const u = SITE.links && SITE.links[a.getAttribute('data-site-link')];
    if (u) a.setAttribute('href', u);
  });
}

/* 2. Nav ------------------------------------------------------------------------------ */
const clean = (p) => (p.replace(/index\.html$/, '').replace(/\/?$/, '/'));
function navCurrent() {
  const here = clean(location.pathname);
  $$('.site-nav a').forEach((a) => {
    const target = clean(new URL(a.getAttribute('href'), location.href).pathname);
    const match = target === '/' ? here === '/' : here.startsWith(target);
    if (match) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function navInk() {
  const nav = $('.site-nav');
  const ink = nav && $('.site-nav__ink', nav);
  if (!nav || !ink) return;
  const links = $$('a', nav);
  const place = (a) => {
    if (!a) { nav.classList.remove('has-ink'); return; }
    const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    // The underline sits under the text, not the padding.
    const pad = parseFloat(getComputedStyle(a).paddingLeft) || 0;
    nav.style.setProperty('--ink-x', (r.left - n.left + pad).toFixed(1) + 'px');
    nav.style.setProperty('--ink-w', Math.max(0, r.width - pad * 2).toFixed(1) + 'px');
    ink.style.bottom = (n.bottom - r.bottom + 8) + 'px';
    nav.classList.add('has-ink');
  };
  const current = () => links.find((a) => a.getAttribute('aria-current') === 'page');
  const settle = () => place(current());
  links.forEach((a) => {
    a.addEventListener('pointerenter', () => place(a));
    a.addEventListener('focus', () => place(a));
  });
  nav.addEventListener('pointerleave', settle);
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) settle(); });
  window.addEventListener('resize', settle);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  settle();
}

/* 3. Reveals -------------------------------------------------------------------------- */
function reveals() {
  $$('[data-reveal-stagger]').forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => { if (!child.style.getPropertyValue('--i')) child.style.setProperty('--i', String(i)); });
  });
  const els = $$('[data-reveal], [data-reveal-stagger]');
  const show = (el) => el.classList.add('is-in');
  if (reduceMq.matches || !root.classList.contains('motion-ok') || !('IntersectionObserver' in window)) { els.forEach(show); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
  window.addEventListener('beforeprint', () => els.forEach(show));
}

/* 4. Copy email ------------------------------------------------------------------------- */
function copyEmail() {
  $$('[data-copy-email]').forEach((btn) => {
    const scope = btn.closest('[data-copy-scope]') || btn.parentElement;
    const note = $('[data-copy-note]', scope);
    const addr = $('[data-site-mailto]', scope);
    btn.hidden = false;
    const say = (t) => { if (note) { note.textContent = ''; requestAnimationFrame(() => { note.textContent = t; }); } };
    const select = () => {
      if (!addr || !window.getSelection) return;
      const r = document.createRange(); r.selectNodeContents(addr);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    };
    btn.addEventListener('click', () => {
      const email = SITE.email || (addr && addr.textContent.trim()) || '';
      const fail = () => { select(); say('Could not copy. The address is selected, so copy it by hand.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(() => say('Copied.'), fail);
      else fail();
    });
  });
}

/* 5. Config-driven blocks ------------------------------------------------------------------ */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function sampleCard(s) {
  return '<li class="sample-card" style="--card-accent:' + esc(s.accent) + '">' +
    '<a class="sample-card__link" href="/samples/' + esc(s.slug) + '/">' +
    '<span class="sample-card__swatch" aria-hidden="true"></span>' +
    '<span class="label">Sample site · fictional business</span>' +
    '<span class="sample-card__name">' + esc(s.name) + '</span>' +
    '<span class="sample-card__kind">' + esc(s.kind) + '</span>' +
    '<span class="sample-card__blurb">' + esc(s.blurb) + '</span>' +
    '</a></li>';
}
function samples() {
  const list = (SITE.samples || []).filter((s) => s.ready);
  $$('[data-samples-grid]').forEach((grid) => {
    const limit = parseInt(grid.getAttribute('data-limit'), 10) || list.length;
    if (!list.length) return;
    grid.innerHTML = list.slice(0, limit).map(sampleCard).join('');
    grid.setAttribute('data-rendered', '');
  });
}
function certifications() {
  const certs = SITE.certifications || [];
  $$('[data-certs]').forEach((block) => {
    if (!certs.length) { block.remove(); return; }
    const ul = $('[data-certs-list]', block);
    if (ul) ul.innerHTML = certs.map((c) => {
      const name = c.url ? '<a href="' + esc(c.url) + '">' + esc(c.name) + '</a>' : esc(c.name);
      return '<li><span class="cert-name">' + name + '</span>' +
        (c.issuer || c.year ? ' <span class="cert-meta">' + esc([c.issuer, c.year].filter(Boolean).join(', ')) + '</span>' : '') + '</li>';
    }).join('');
    block.hidden = false;
  });
}
function booking() {
  $$('[data-booking]').forEach((el) => {
    if (!SITE.bookingUrl) { el.hidden = true; return; }
    const a = el.matches('a') ? el : $('a', el);
    if (a) a.setAttribute('href', SITE.bookingUrl);
    el.hidden = false;
  });
}
function promise() {
  $$('[data-promise]').forEach((el) => {
    if (SITE.promiseReply && SITE.promiseReplyText) { el.textContent = SITE.promiseReplyText; el.hidden = false; }
    else el.hidden = true;
  });
}

/* 7. Lazy effects ------------------------------------------------------------------------- */
function readTokens() {
  const cs = getComputedStyle(root);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    ink: v('--fx-ink'), paper: v('--fx-paper'), accent: v('--fx-accent'), warm: v('--fx-warm'),
    alpha: parseFloat(v('--fx-alpha')) || 0.1,
    dark: media('(prefers-color-scheme: dark)').matches ? root.getAttribute('data-theme') !== 'light' : root.getAttribute('data-theme') === 'dark'
  };
}
const effects = [];
function lazyEffects() {
  if (reduceMq.matches || saveData) return;
  const canvas = document.getElementById('bg-canvas');
  const scenes = $$('[data-scene3d]');
  if (!canvas && !scenes.length) return;
  // requestIdleCallback does not exist on iOS Safari: fall back to a timer, and start early on the first scroll or
  // pointer move (whichever comes first). saveData is Chromium-only, so it is a bonus guard, not the main one.
  const idle = window.requestIdleCallback ? (cb) => window.requestIdleCallback(cb, { timeout: 2500 }) : (cb) => setTimeout(cb, 1200);
  let started = false;
  const run = async () => {
    if (started) return;
    started = true;
    ['scroll', 'pointermove'].forEach((t) => window.removeEventListener(t, early));
    const opts = () => ({ tokens: readTokens(), reducedMotion: false, intensity: (canvas && canvas.dataset.intensity) || 'low' });
    if (canvas) {
      try {
        const m = await import('./background.js');
        const ctl = m.init(canvas, opts());
        if (ctl) effects.push(ctl);
      } catch (e) { /* the static gradient stays */ }
    }
    if (scenes.length) {
      try {
        const m = await import('./scene3d.js');
        scenes.forEach((el) => { const ctl = m.init(el, opts()); if (ctl) effects.push(ctl); });
      } catch (e) { /* the static composition stays */ }
    }
  };
  const early = () => run();
  // The idle wait starts only once the first contentful paint is in: on a fast load, "load" can fire before the first
  // paint, and modules fetched then sit on the critical path of the first paint and of LCP. A 3 s timer covers
  // browsers without paint timing.
  const afterPaint = (cb) => {
    let done = false;
    const go = () => { if (!done) { done = true; cb(); } };
    try {
      if (performance.getEntriesByName('first-contentful-paint').length) return go();
      const po = new PerformanceObserver((list) => { if (list.getEntriesByName('first-contentful-paint').length) { po.disconnect(); go(); } });
      po.observe({ type: 'paint', buffered: true });
      setTimeout(() => { po.disconnect(); go(); }, 3000);
    } catch (e) { go(); }
  };
  const start = () => {
    afterPaint(() => idle(run));
    window.addEventListener('scroll', early, { passive: true, once: true });
    window.addEventListener('pointermove', early, { passive: true, once: true });
  };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });

  // If the visitor turns on reduced motion mid-visit, stop everything; colour-scheme changes re-read the tokens.
  reduceMq.addEventListener && reduceMq.addEventListener('change', (e) => { if (e.matches) effects.splice(0).forEach((c) => c.destroy && c.destroy()); });
  const scheme = media('(prefers-color-scheme: dark)');
  scheme.addEventListener && scheme.addEventListener('change', () => { const t = readTokens(); effects.forEach((c) => c.update && c.update({ tokens: t })); });
}

applyConfig();
navCurrent();
navInk();
samples();
certifications();
booking();
promise();
reveals();
copyEmail();
initButtons(document);
lazyEffects();
