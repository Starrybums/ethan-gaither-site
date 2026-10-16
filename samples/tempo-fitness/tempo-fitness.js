/* Tempo Fitness sample: three small helpers. The page reads fully without this file.
   1. Marks today's day in the class schedule.
   2. Closes the phone menu after you pick a link.
   3. Fills in a readable message when the mailto: trial form is sent. Without JavaScript the form still works as a plain mailto: form. */
(function () {
  'use strict';

  try {
    var body = document.querySelector('.sched tbody[data-dow="' + new Date().getDay() + '"]');
    var th = body && body.querySelector('.day th');
    if (th) {
      var tag = document.createElement('span');
      tag.className = 'today';
      tag.textContent = 'Today';
      th.appendChild(document.createTextNode(' '));
      th.appendChild(tag);
    }
  } catch (e) { /* the schedule is complete without this */ }

  var menu = document.querySelector('.nav-narrow');
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) menu.removeAttribute('open');
    });
  }

  var form = document.getElementById('trial-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var lines = [
      'Name: ' + d.get('name'),
      'Email: ' + d.get('email'),
      'Phone: ' + (d.get('phone') || 'not given'),
      'First class to try: ' + d.get('class'),
      '',
      String(d.get('note') || '')
    ];
    window.location.href = 'mailto:hello@tempo-fitness.example?subject=' +
      encodeURIComponent('Free trial request from the sample site') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  });
})();
