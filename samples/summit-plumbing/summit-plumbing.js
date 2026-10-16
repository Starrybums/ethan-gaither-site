/* Switchback Plumbing sample: two small helpers.
   Without JavaScript the menu is a plain <details> and the demo form still shows its note (its GET lands on #sent). */
(function () {
  'use strict';

  /* Close the phone menu after a tap on one of its links, and on Escape. */
  var menu = document.querySelector('.nav-narrow');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) menu.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('open')) {
        menu.removeAttribute('open');
        var s = menu.querySelector('summary');
        if (s) s.focus();
      }
    });
  }

  /* Demo form: show the note instead of sending. */
  var f = document.getElementById('quote-form'), n = document.getElementById('sent');
  if (f && n) f.addEventListener('submit', function (e) { e.preventDefault(); n.hidden = false; n.focus(); });
})();
