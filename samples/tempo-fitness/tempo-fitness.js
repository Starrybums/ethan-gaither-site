/* Tempo Fitness sample: three small helpers. The page reads fully without this file.
   1. Marks today's day in the class schedule.
   2. Closes the phone menu after you pick a link.
   3. Demo trial form: shows its note instead of sending. Without JavaScript the form's GET lands on #sent and the CSS shows the note. */
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

  var form = document.getElementById('trial-form'), note = document.getElementById('sent');
  if (form && note) form.addEventListener('submit', function (e) { e.preventDefault(); note.hidden = false; note.focus(); });
})();
