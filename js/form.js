/* js/form.js — the two request forms: /start-a-project/ (type "project") and /book-a-call/ (type "call").
   The contract is api/README.md. Read it before changing anything here; both sides change together.
   Owner: pages worker. Plain module, no dependencies.

   Without JavaScript the form is a mailto form (action="mailto:…", enctype="text/plain") and the browser checks the
   `required` fields itself. With JavaScript this file takes over:
     - checks every field with the server's rules and messages, inline, with aria-describedby and aria-invalid;
     - posts JSON to /api/contact (10 s timeout) and handles each status in the contract's table;
     - 200 shows the success panel; 400 shows the server's field messages; 429 asks the visitor to wait;
       403, 502, 503, any other status and network errors open a prefilled mailto, so no message is lost. */

import SITE from './config.js';

const ENDPOINT = '/api/contact';   // the exact path: no trailing slash (see api/README.md)
const TIMEOUT_MS = 10000;
const SENT = 'Sent. I read these myself and reply from my own email.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 +().\-x]*$/;
const CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const MULTILINE = { message: true, times: true };

// Same limits and messages as the server (api/README.md, "Field messages"). `missing` is the client-only message for an
// empty required field when it differs from the bad-format message (the server never sees an empty email from this form).
const RULES = {
  name:     { max: 100, need: true, msg: 'Add your name.' },
  email:    { max: 254, need: true, missing: 'Add your email.', msg: "That email address doesn't look right.", test: (v) => v.length >= 3 && EMAIL_RE.test(v) },
  business: { max: 120, need: true, msg: 'Add your business name.' },
  website:  { max: 200, msg: 'Keep the website under 200 characters.' },
  phone:    { max: 40, msg: 'Use digits and + ( ) - only.', test: (v) => PHONE_RE.test(v) },
  message:  { max: 4000, need: true, msg: 'Add a few words about what you need.', longMsg: 'Keep it under 4,000 characters.' },
  times:    { max: 300, needCall: true, msg: 'Give me two times that work for you.' }
};

const clean = (s) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').trim();

/* Returns the message for a bad value, or '' when it is fine. */
function check(name, raw, type) {
  const r = RULES[name];
  if (!r || (name === 'times' && type !== 'call')) return '';
  const v = clean(raw);
  if (!v) return r.need || (r.needCall && type === 'call') ? (r.missing || r.msg) : '';
  if (CTRL_RE.test(v) || (!MULTILINE[name] && /[\n\t]/.test(v))) return r.msg;
  if (v.length > r.max) return r.longMsg || r.msg;
  if (r.test && !r.test(v)) return r.msg;
  return '';
}

/* The email the server would send, as a mailto: the same lines as api/README.md, "The email it sends". */
function mailtoHref(v, type) {
  const label = type === 'call' ? 'Call request' : 'Project request';
  const who = v.name.replace(/\s+/g, ' ').slice(0, 60);
  const lines = ['Type: ' + label, 'Name: ' + v.name, 'Email: ' + v.email, 'Business: ' + v.business,
    'Website: ' + (v.website || '-'), 'Phone: ' + (v.phone || '-')];
  if (type === 'call') lines.push('Good times: ' + (v.times || '-'));
  const body = lines.join('\n') + '\n\n' + v.message;
  return 'mailto:' + (SITE.email || '') +
    '?subject=' + encodeURIComponent('[Website] ' + label + ' from ' + who) +
    '&body=' + encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
}

/* POST the JSON. Resolves { status, data }; rejects on network error or timeout. */
async function send(payload) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON: the status decides */ }
    return { status: res.status, data };
  } finally { clearTimeout(timer); }
}

function link(href, text) {
  const a = document.createElement('a');
  a.href = href; a.textContent = text;
  return a;
}

function init(form) {
  const type = form.elements.type && form.elements.type.value === 'call' ? 'call' : 'project';
  const col = form.closest('[data-form-col]') || document;
  const card = form.closest('[data-form-card]');
  const success = col.querySelector('[data-form-success]');
  const live = col.querySelector('[data-form-live]');
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('[type="submit"]');
  const idleLabel = button ? button.textContent : '';
  const fields = Array.from(form.querySelectorAll('[data-field]')).map((wrap) => ({
    name: wrap.getAttribute('data-field'),
    wrap,
    input: wrap.querySelector('input, textarea'),
    err: wrap.querySelector('.field__error'),
    text: wrap.querySelector('[data-error-text]')
  })).filter((f) => f.input && f.err && f.text);
  const byName = {};
  fields.forEach((f) => { byName[f.name] = f; });
  let busy = false;

  form.setAttribute('novalidate', '');   // JavaScript is running: the inline checks replace the browser's bubbles

  const say = (el, text) => { if (!el) return; el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); };
  const notice = (kind, parts) => {
    if (!status) return;
    status.className = 'notice' + (kind ? ' notice--' + kind : '');
    status.replaceChildren(...parts);
  };
  const setError = (f, msg) => {
    if (!msg) {
      f.wrap.classList.remove('is-invalid'); f.input.removeAttribute('aria-invalid');
      f.err.hidden = true; f.text.textContent = '';
      return;
    }
    f.wrap.classList.add('is-invalid'); f.input.setAttribute('aria-invalid', 'true');
    f.text.textContent = msg; f.err.hidden = false;
  };
  const read = () => {
    const v = {};
    fields.forEach((f) => { v[f.name] = clean(f.input.value); });
    v.company = form.elements.company ? form.elements.company.value : '';
    return v;
  };
  const setBusy = (on) => {
    busy = on;
    if (!button) return;
    if (on) { button.setAttribute('aria-disabled', 'true'); button.textContent = 'Sending…'; form.setAttribute('aria-busy', 'true'); }
    else { button.removeAttribute('aria-disabled'); button.textContent = idleLabel; form.removeAttribute('aria-busy'); }
  };
  const focusFirst = (names) => {
    const first = fields.find((f) => names.indexOf(f.name) !== -1);
    if (first) first.input.focus();
  };

  // Inline checks. An empty required field waits for submit, so tabbing through does not flash errors.
  fields.forEach((f) => {
    f.input.addEventListener('blur', () => {
      if (clean(f.input.value) || f.wrap.classList.contains('is-invalid')) setError(f, check(f.name, f.input.value, type));
    });
    f.input.addEventListener('input', () => {
      if (f.wrap.classList.contains('is-invalid')) setError(f, check(f.name, f.input.value, type));
    });
  });

  const showSuccess = () => {
    form.reset();
    fields.forEach((f) => setError(f, ''));
    notice('', []);
    if (card) card.hidden = true;
    if (success) {
      success.hidden = false;
      success.classList.add('is-shown');
      success.focus();
    }
    say(live, SENT);
  };

  // open: true  -> 502, 503, 403, network errors: open the prefilled mailto as well as showing the link.
  // open: false -> 400 bad_request: show the general error and the link, but do not open anything.
  const fallback = (v, open) => {
    const href = mailtoHref(v, type);
    const lead = open ? "I couldn't send that from here. Your email app should open with everything filled in. If it doesn't, "
      : 'Something was wrong with that message. To send it anyway, ';
    notice('warn', [lead, link(href, open ? 'use this link' : 'open your email app'), ' or write to ',
      link('mailto:' + SITE.email, SITE.email || 'my email'), '.']);
    if (open) { try { window.location.href = href; } catch (e) { /* the link above still works */ } }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const v = read();
    const bad = {};
    fields.forEach((f) => { const m = check(f.name, v[f.name], type); if (m) bad[f.name] = m; });
    fields.forEach((f) => setError(f, bad[f.name] || ''));
    const names = Object.keys(bad);
    if (names.length) {
      notice('error', [names.length === 1 ? "One field needs fixing. It's marked below." : names.length + " fields need fixing. They're marked below."]);
      focusFirst(names);
      return;
    }
    notice('', []);
    setBusy(true);
    say(live, 'Sending.');
    const payload = { type, name: v.name, email: v.email, business: v.business, message: v.message, company: v.company };
    if (v.website) payload.website = v.website;
    if (v.phone) payload.phone = v.phone;
    if (type === 'call') payload.times = v.times;
    try {
      const { status: code, data } = await send(payload);
      if (code === 200 && data && data.ok) { showSuccess(); return; }
      if (code === 400 && data && data.error === 'invalid' && data.fields && typeof data.fields === 'object') {
        const shown = [];
        fields.forEach((f) => { const m = data.fields[f.name]; setError(f, typeof m === 'string' ? m : ''); if (typeof m === 'string' && m) shown.push(f.name); });
        if (shown.length) { notice('error', ["Some fields need fixing. They're marked below."]); focusFirst(shown); }
        else fallback(v, false);
        return;
      }
      if (code === 400) { fallback(v, false); return; }
      if (code === 429) {
        notice('warn', ["That's a lot of messages in a short time. Try again in a few minutes, or ", link(mailtoHref(v, type), 'email me'), '.']);
        return;
      }
      fallback(v, true);   // 403, 405, 502, 503 and anything unexpected
    } catch (err) {
      fallback(v, true);   // network error or timeout
    } finally {
      setBusy(false);
    }
  });
}

document.querySelectorAll('form[data-contact-form]').forEach(init);
