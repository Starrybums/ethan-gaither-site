/* api/contact.mjs
   POST /api/contact: validates the request-form JSON and emails it to Ethan through Resend.
   Contract: api/README.md. Setup and tests: README.md, section "Contact form and Resend".
   ESM, no dependencies, no package.json. Web Request/Response handler (Vercel Functions, Node runtime).
   Never logs the request body or the visitor's email address. */

const RESEND_URL = 'https://api.resend.com/emails';
const USER_AGENT = 'ethan-gaither-site/1.0'; // Resend's edge answers 403 (code 1010) without a User-Agent
const DEFAULT_FROM = 'Website form <onboarding@resend.dev>';
const MAX_BODY_BYTES = 16 * 1024;
const SEND_TIMEOUT_MS = 8000;
const RATE_LIMIT = 5; // accepted requests per IP ...
const RATE_WINDOW_MS = 10 * 60 * 1000; // ... per 10 minutes
const MAX_TRACKED_IPS = 2000;

const MSG = {
  type: 'Pick a project or a call.',
  name: 'Add your name.',
  email: "That email address doesn't look right.",
  business: 'Add your business name.',
  website: 'Keep the website under 200 characters.',
  phone: 'Use digits and + ( ) - only.',
  messageEmpty: 'Add a few words about what you need.',
  messageLong: 'Keep it under 4,000 characters.',
  times: 'Give me two times that work for you.'
};

/* Control characters other than tab (09) and newline (0A), plus C1 controls, line/paragraph
   separators and bidi override characters (they can spoof how a name or subject reads). */
const CONTROL = new RegExp('[' + [[0x00, 0x08], [0x0B, 0x1F], [0x7F, 0x9F], [0x2028, 0x2029], [0x202A, 0x202E], [0x2066, 0x2069]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* The contract regex lets a comma through, and reply_to would read "a@b.co,c@d.co" as two
   addresses. Keep display-name and list syntax out of the one address we pass on. */
const EMAIL_BAD_CHARS = /[<>,;:"()[\]\\]/;
const PHONE = /^[0-9 +().xX-]*$/;

/* Per-IP timestamps of accepted requests. Lives in module memory: per instance, reset on a cold
   start or redeploy. A courtesy layer; the durable limit is a Vercel WAF rule (see README.md). */
const hits = new Map();

function json(status, body, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra
    }
  });
}

const len = (s) => Array.from(s).length;

function envValue(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

/* ---------- origin ---------- */

function originOf(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin.toLowerCase() : '';
  } catch {
    return '';
  }
}

function allowedOrigins(request) {
  const set = envValue('SITE_ORIGIN');
  if (set) {
    return set.split(',').map((s) => originOf(s.trim())).filter(Boolean);
  }
  const host = request.headers.get('host') || (() => { try { return new URL(request.url).host; } catch { return ''; } })();
  return host ? [`https://${host.toLowerCase()}`] : [];
}

/* Returns { ok, origin, path }. Origin header first, else Referer. "null" or both missing = no.
   path is the page the form was on, taken from the Referer when that Referer is on the same origin. */
function checkOrigin(request) {
  const allowed = allowedOrigins(request);
  const originHeader = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const seen = originOf(originHeader !== null ? originHeader : referer || '');
  if (!seen || !allowed.includes(seen)) return { ok: false, origin: '', path: '' };
  let path = '';
  if (referer && originOf(referer) === seen) {
    try {
      path = new URL(referer).pathname.slice(0, 200);
    } catch {
      path = '';
    }
  }
  return { ok: true, origin: seen, path };
}

/* ---------- body ---------- */

async function readBody(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      try { await reader.cancel(); } catch { /* already closed */ }
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

/* ---------- rate limit ---------- */

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return (request.headers.get('x-real-ip') || 'unknown').trim() || 'unknown';
}

function freshHits(ip, now) {
  const list = hits.get(ip);
  if (!list) return [];
  const fresh = list.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length) hits.set(ip, fresh);
  else hits.delete(ip);
  return fresh;
}

/* Seconds to wait, or 0 when the IP is under the limit. */
function retryAfter(ip, now) {
  const fresh = freshHits(ip, now);
  if (fresh.length < RATE_LIMIT) return 0;
  return Math.max(1, Math.ceil((fresh[0] + RATE_WINDOW_MS - now) / 1000));
}

function recordHit(ip, now) {
  const fresh = freshHits(ip, now);
  fresh.push(now);
  hits.set(ip, fresh);
  if (hits.size > MAX_TRACKED_IPS) {
    for (const key of hits.keys()) freshHits(key, now);
    for (const key of hits.keys()) {
      if (hits.size <= MAX_TRACKED_IPS) break;
      hits.delete(key); // oldest first: Map keeps insertion order
    }
  }
}

/* ---------- validation ---------- */

/* String field -> trimmed string, '' when absent, null when it is the wrong type or has bad characters. */
function field(value, multiline) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  let s = value;
  if (multiline) s = s.replace(/\r\n?/g, '\n');
  if (CONTROL.test(s)) return null;
  if (!multiline && s.includes('\n')) return null;
  return s.trim();
}

function validate(data) {
  const errors = {};
  const out = {};

  out.type = data.type;
  if (out.type !== 'project' && out.type !== 'call') errors.type = MSG.type;

  const name = field(data.name, false);
  if (name === null || name === '' || len(name) > 100) errors.name = MSG.name;
  else out.name = name;

  const email = field(data.email, false);
  if (email === null || len(email) < 3 || len(email) > 254 || !EMAIL.test(email) || EMAIL_BAD_CHARS.test(email)) {
    errors.email = MSG.email;
  } else out.email = email;

  const business = field(data.business, false);
  if (business === null || business === '' || len(business) > 120) errors.business = MSG.business;
  else out.business = business;

  const website = field(data.website, false);
  if (website === null || len(website) > 200) errors.website = MSG.website;
  else out.website = website;

  const phone = field(data.phone, false);
  if (phone === null || len(phone) > 40 || !PHONE.test(phone)) errors.phone = MSG.phone;
  else out.phone = phone;

  const message = field(data.message, true);
  if (message === null || message === '') errors.message = MSG.messageEmpty;
  else if (len(message) > 4000) errors.message = MSG.messageLong;
  else out.message = message;

  if (out.type === 'call') {
    const times = field(data.times, true);
    if (times === null || times === '' || len(times) > 300) errors.times = MSG.times;
    else out.times = times;
  }

  return { errors, out };
}

/* ---------- email ---------- */

function buildEmail(v, origin, path) {
  const isCall = v.type === 'call';
  const label = isCall ? 'Call request' : 'Project request';
  const shortName = Array.from(v.name.replace(/\s+/g, ' ')).slice(0, 60).join('').trim();
  const lines = [
    `Type: ${label}`,
    `Name: ${v.name}`,
    `Email: ${v.email}`,
    `Business: ${v.business}`,
    `Website: ${v.website || '-'}`,
    `Phone: ${v.phone || '-'}`
  ];
  if (isCall) lines.push(`Good times: ${v.times}`);
  lines.push('', v.message, '', '--');
  lines.push(`Sent from the form on ${origin}${path} at ${new Date().toISOString()}.`);
  lines.push('Reply to this email to answer them directly.');
  return {
    subject: `[Website] ${label} from ${shortName}`,
    text: lines.join('\n')
  };
}

async function sendWithResend(payload) {
  const url = envValue('RESEND_API_URL') || RESEND_URL; // override exists for local tests only
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envValue('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    let reply = null;
    try { reply = await res.json(); } catch { /* not JSON */ }
    return { ok: res.ok, status: res.status, id: reply && reply.id, name: reply && reply.name };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- handler ---------- */

async function handle(request) {
  // 1. Method
  if (request.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, { Allow: 'POST' });
  }

  // 2. Origin
  const origin = checkOrigin(request);
  if (!origin.ok) return json(403, { error: 'forbidden' });

  // 3. Configuration
  const missing = ['RESEND_API_KEY', 'CONTACT_TO'].filter((n) => !envValue(n));
  if (missing.length) {
    console.error('contact: not configured, missing', missing.join(','));
    return json(503, { error: 'not configured' });
  }

  // 4. Body
  let data;
  try {
    const raw = await readBody(request);
    if (raw === null || raw === '') return json(400, { error: 'bad_request' });
    data = JSON.parse(raw);
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json(400, { error: 'bad_request' });
  }

  // 5. Honeypot: a person never fills it. Say OK, send nothing, count nothing.
  const trap = data.company;
  if (!(trap === undefined || trap === null || (typeof trap === 'string' && trap.trim() === ''))) {
    return json(200, { ok: true });
  }

  // 6. Rate limit. Checked here, counted once the request is valid and about to send,
  //    so a visitor fixing typos is not locked out.
  const ip = clientIp(request);
  const wait = retryAfter(ip, Date.now());
  if (wait) return json(429, { error: 'rate_limited' }, { 'Retry-After': String(wait) });

  // 7. Validation
  const { errors, out } = validate(data);
  if (Object.keys(errors).length) return json(400, { error: 'invalid', fields: errors });
  recordHit(ip, Date.now());

  // 8. Send
  const mail = buildEmail(out, origin.origin, origin.path);
  const from = envValue('RESEND_FROM') || DEFAULT_FROM;
  const to = envValue('CONTACT_TO').split(',').map((s) => s.trim()).filter(Boolean);
  let result;
  try {
    result = await sendWithResend({ from, to, reply_to: out.email, subject: mail.subject, text: mail.text });
  } catch (err) {
    console.error('contact: resend request failed', err && err.name ? err.name : 'error');
    return json(502, { error: 'send_failed' });
  }
  if (!result.ok) {
    console.error('contact: resend answered', result.status, result.name || '');
    return json(502, { error: 'send_failed' });
  }

  // 9. Done
  console.log('contact: sent', result.id || '');
  return json(200, { ok: true });
}

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (err) {
      console.error('contact: unexpected', err && err.name ? err.name : 'error');
      return json(502, { error: 'send_failed' });
    }
  }
};
