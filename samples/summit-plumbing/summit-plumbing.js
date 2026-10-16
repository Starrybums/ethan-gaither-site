/* Switchback Plumbing sample: two small helpers.
   Without JavaScript the menu is a plain <details> and the form still works as a plain mailto: form. */
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

  /* Fill in the mailto: message so it reads well in the email app. */
  var f = document.getElementById('quote-form');
  if (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var body = 'Name: ' + d.get('name') +
        '\nPhone: ' + d.get('phone') +
        '\nAddress: ' + d.get('address') +
        '\nWhen: ' + d.get('when') +
        '\n\nWhat\'s wrong:\n' + d.get('problem');
      window.location.href = 'mailto:hello@summit-plumbing.example?subject=' + encodeURIComponent('Quote request from the sample site') + '&body=' + encodeURIComponent(body);
    });
  }
})();
