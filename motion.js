/* motion.js
   1. applies site.config.js to the page,
   2. scroll reveals (with a failsafe: content is never lost to an effect),
   3. aria-current on the nav,
   4. copy-email button,
   5. the build: an IntersectionObserver on the four caption blocks sets data-stage="1".."4" on the frame;
      CSS transitions do the rest. No scroll scrubbing, no animation-frame loops. Under reduced motion,
      or without IntersectionObserver, nothing here runs and the frame stays in its finished state.
   Plain JavaScript, no dependencies. */
(function () {
  'use strict';

  var S = window.SITE || {};
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* 1. Config ---------------------------------------------------------------- */
  function meta(attr, key, value) {
    if (!value) return;
    var el = $('meta[' + attr + '="' + key + '"]');
    if (el) el.setAttribute('content', value);
  }
  function applyConfig() {
    $$('[data-site]').forEach(function (el) {
      var v = S[el.getAttribute('data-site')];
      if (typeof v === 'string' && v) el.textContent = v;
    });
    $$('[data-site-mailto]').forEach(function (a) { if (S.email) a.setAttribute('href', 'mailto:' + S.email); });
    $$('[data-site-link]').forEach(function (a) {
      var u = S.links && S.links[a.getAttribute('data-site-link')];
      if (u) a.setAttribute('href', u);
    });
    if (S.title) document.title = S.title;
    meta('name', 'description', S.description);
    meta('property', 'og:title', S.title);
    meta('property', 'og:description', S.description);

    var base = S.siteUrl ? S.siteUrl.replace(/\/+$/, '') + '/' : '';
    if (base) {
      var link = $('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = base;
      var og = $('meta[property="og:url"]');
      if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:url'); document.head.appendChild(og); }
      og.setAttribute('content', base);
      if (S.ogImage) meta('property', 'og:image', base + S.ogImage.replace(/^\/+/, ''));
    } else if (S.ogImage) {
      meta('property', 'og:image', S.ogImage);
    }

    var ld = $('script[type="application/ld+json"]');
    if (ld) {
      try {
        var d = JSON.parse(ld.textContent);
        if (S.name) d.name = S.name;
        d.address = d.address || { '@type': 'PostalAddress' };
        if (S.locality) d.address.addressLocality = S.locality;
        if (S.region) d.address.addressRegion = S.region;
        if (S.country) d.address.addressCountry = S.country;
        ld.textContent = JSON.stringify(d);
      } catch (e) { /* keep the baked-in JSON-LD */ }
    }

    var promise = $('[data-promise]');
    if (promise && S.promiseReply && S.promiseReplyText) {
      promise.textContent = S.promiseReplyText;
      promise.hidden = false;
    }
  }

  /* 2. Reveals --------------------------------------------------------------- */
  function reveals() {
    var els = $$('[data-reveal]');
    function show(el) { el.classList.add('is-in'); }
    function showAll() { els.forEach(show); }
    if (reduce || !('IntersectionObserver' in window)) { showAll(); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });

    // Failsafe: anything still hidden after this window and already near the
    // viewport is shown unconditionally. Content must never be lost to an effect.
    setTimeout(function () {
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) * 1.4) show(el);
      });
    }, 2200);
    window.addEventListener('beforeprint', showAll);
  }

  /* 3. aria-current on the nav ---------------------------------------------- */
  // Computed from the scroll position on every frame that scrolls, so the answer never
  // depends on the order in which observers fire. At the very bottom of the page the last
  // link (Contact) wins, because a short last section can never reach the reading line.
  function navSpy() {
    var links = $$('.site-nav a[href^="#"]');
    var pairs = links.map(function (a) { return { a: a, sec: $(a.getAttribute('href')) }; })
      .filter(function (p) { return p.sec; });
    if (!pairs.length) return;

    var current = null, queued = false;
    function setCurrent(a) {
      if (a === current) return;
      current = a;
      links.forEach(function (l) {
        if (l === a) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current');
      });
    }
    function update() {
      queued = false;
      var doc = document.documentElement;
      var vh = window.innerHeight || doc.clientHeight;
      if (window.scrollY + vh >= doc.scrollHeight - 2) { setCurrent(pairs[pairs.length - 1].a); return; }
      var line = vh * 0.45, hit = null;
      pairs.forEach(function (p) { if (p.sec.getBoundingClientRect().top <= line) hit = p.a; });
      setCurrent(hit);
    }
    function queue() {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || window.setTimeout)(update);
    }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    update();
  }

  /* 4. Copy email ------------------------------------------------------------ */
  function copyEmail() {
    var btn = $('[data-copy]');
    if (!btn) return;
    var note = $('.copy-note');
    var addr = $('[data-site-mailto]');
    btn.hidden = false;
    function say(t) { if (note) note.textContent = t; }
    function selectAddress() {
      if (!addr || !window.getSelection) return;
      var r = document.createRange(); r.selectNodeContents(addr);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    btn.addEventListener('click', function () {
      var email = S.email || (addr && addr.textContent) || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(
          function () { say('Copied.'); },
          function () { selectAddress(); say('Could not copy. The address is selected, so copy it by hand.'); }
        );
      } else {
        selectAddress(); say('Could not copy. The address is selected, so copy it by hand.');
      }
    });
  }

  /* 5. The build ------------------------------------------------------------- */
  function build() {
    var frame = $('#frame');
    var steps = $$('.build-steps .step');
    var root = document.documentElement;
    if (!frame || !steps.length) return;
    if (reduce || !('IntersectionObserver' in window)) { root.classList.remove('anim'); return; }

    var stage = -1;
    var ratios = steps.map(function () { return 0; });
    var io = null, frameIo = null, resizeTimer = null;

    function setStage(n) {
      if (n === stage) return;
      stage = n;
      frame.setAttribute('data-stage', String(n));
      steps.forEach(function (s, i) { s.classList.toggle('is-active', n > 0 && i === n - 1); });
    }
    // The stage is the last caption block that is at least half inside the reading band.
    // Scrolling down, the next block wins as it crosses half; scrolling up, the earlier one wins back.
    function pick() {
      var n = 0;
      ratios.forEach(function (r, i) { if (r >= 0.49) n = i + 1; });
      if (n) setStage(n);
    }
    function observe() {
      if (io) io.disconnect();
      ratios = steps.map(function () { return 0; });
      var small = (window.innerWidth || 0) < 900;
      var topEdge = 96;
      if (small) {
        var top = parseFloat(window.getComputedStyle(frame).top) || 0;
        topEdge = Math.round(frame.getBoundingClientRect().height + top);
      }
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var i = steps.indexOf(e.target);
          if (i > -1) ratios[i] = e.intersectionRatio;
        });
        pick();
      }, { rootMargin: '-' + topEdge + 'px 0px -10% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
      steps.forEach(function (s) { io.observe(s); });
    }

    setStage(0);
    // First sight of the frame starts the sequence at stage 1, even before a caption is half in view.
    frameIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.3 && stage === 0) setStage(1);
      });
    }, { threshold: [0.3] });
    frameIo.observe(frame);

    observe();
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(observe, 150);
    });
  }

  applyConfig();
  reveals();
  navSpy();
  copyEmail();
  build();
})();
