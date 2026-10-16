/* North Fork Apparel (sample site). Small and optional: the page reads and works without it.
   1. Sizing chart: switch between inches and centimetres.
   2. Sign-up: shows "Demo only: nothing was sent." and sends nothing.
   3. Phone menu: closes after a link is tapped. */
(function () {
  'use strict';

  // 1. Units
  var units = document.querySelector('[data-units]');
  if (units) {
    var cells = document.querySelectorAll('[data-in]');
    var label = document.querySelector('[data-unit-label]');
    var buttons = units.querySelectorAll('[data-unit-btn]');
    var show = function (unit) {
      Array.prototype.forEach.call(cells, function (cell) {
        var parts = cell.getAttribute('data-in').split('-').map(Number);
        var out = parts.map(function (n) { return unit === 'cm' ? Math.round(n * 2.54) : n; });
        cell.textContent = out.join('–');
      });
      if (label) label.textContent = unit === 'cm' ? 'centimetres' : 'inches';
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-unit-btn') === unit));
      });
    };
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-unit-btn')); });
    });
    units.hidden = false;
  }

  // 2. Demo sign-up
  var form = document.getElementById('signup-form');
  var msg = document.getElementById('signup-msg');
  if (form && msg) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      msg.textContent = 'Demo only: nothing was sent. A real build would add you to the list.';
      form.reset();
    });
  }

  // 3. Phone menu
  var nav = document.querySelector('.nav-narrow');
  if (nav) {
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) nav.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.hasAttribute('open')) {
        nav.removeAttribute('open');
        var s = nav.querySelector('summary');
        if (s) s.focus();
      }
    });
  }
})();
