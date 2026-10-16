/* Casa Ortega sample: two small helpers. Without JavaScript the menu stays in English and the demo form still shows its note (its GET lands on #sent). */
(function () {
  'use strict';

  /* English / Spanish for the menu headings. English is the default. */
  var group = document.querySelector('[data-lang-toggle]');
  if (group) {
    var items = [].slice.call(document.querySelectorAll('[data-es]'));
    var buttons = [].slice.call(group.querySelectorAll('button[data-lang]'));
    items.forEach(function (el) { el.setAttribute('data-en', el.textContent); });
    var setLang = function (lang) {
      items.forEach(function (el) {
        if (lang === 'es') {
          el.textContent = el.getAttribute('data-es');
          el.setAttribute('lang', 'es');
        } else {
          el.textContent = el.getAttribute('data-en');
          el.removeAttribute('lang');
        }
      });
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
    };
    group.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-lang]') : null;
      if (b) setLang(b.getAttribute('data-lang'));
    });
    group.hidden = false;
  }

  /* Demo form: show the note instead of sending. */
  var f = document.getElementById('catering-form'), n = document.getElementById('sent');
  if (f && n) f.addEventListener('submit', function (e) { e.preventDefault(); n.hidden = false; n.focus(); });
})();
