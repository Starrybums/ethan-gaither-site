/* Casa Ortega sample: two small helpers. Without JavaScript the menu stays in English and the form still works as a plain mailto: form. */
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

  /* Fill in the mailto: message so it reads well in the email app. */
  var f = document.getElementById('catering-form');
  if (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var body = 'Name: ' + d.get('name') +
        '\nPhone: ' + d.get('phone') +
        '\nEmail: ' + d.get('email') +
        '\nEvent date: ' + d.get('date') +
        '\nPeople: ' + d.get('headcount') +
        '\nThinking about: ' + d.get('what') +
        '\n\n' + (d.get('details') || '');
      window.location.href = 'mailto:hello@casa-ortega.example?subject=' + encodeURIComponent('Catering request from the sample site') + '&body=' + encodeURIComponent(body);
    });
  }
})();
