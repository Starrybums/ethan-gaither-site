# `POST /api/contact` — the request-form contract

Fixed by the architect on 2026-10-15 so the api worker (`api/contact.mjs`) and the pages worker (`js/form.js`, the two form pages) can build at the same time. Neither side changes this file alone: ask the architect (or Fable) and both sides update together.

The function is `api/contact.mjs` (ESM, no `package.json`, no dependencies; Node 24 `fetch`). With `cleanUrls: true` it is served at `/api/contact`. Whether `trailingSlash: true` 308-redirects that path is **unverified** (BRIEF-v3 §13.2): the front end posts to the exact path below and the integrator tests a real POST on the preview deployment before launch.

## Request

```
POST /api/contact
Content-Type: application/json
Accept: application/json
```

Body (UTF-8 JSON object, at most 16 KB):

| Field | Type | Required | Rule (after trimming whitespace) |
|---|---|---|---|
| `type` | `"project"` or `"call"` | yes | exactly one of the two |
| `name` | string | yes | 1-100 characters |
| `email` | string | yes | 3-254 characters, matches `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` |
| `business` | string | yes | 1-120 characters (the business or project name) |
| `website` | string | no | 0-200 characters (their current site, if any; not validated as a URL) |
| `phone` | string | no | 0-40 characters, only digits, spaces and `+ ( ) - . x` |
| `message` | string | yes | 1-4000 characters |
| `times` | string | when `type` is `"call"` | 1-300 characters for calls ("two times that work"); ignored for projects |
| `company` | string | yes, must be `""` | honeypot. Hidden field a person never fills. Non-empty: answer `200 {"ok":true}` and send nothing |

Unknown fields are ignored. Any field with control characters other than newline and tab is invalid. Newlines are allowed only in `message` and `times`.

## Checks, in this order

1. Method: anything but `POST` → `405`, header `Allow: POST`. (`OPTIONS` also gets 405: the form is same-origin, so no CORS preflight ever happens.)
2. Origin: `Origin` header, or failing that `Referer`, must match `SITE_ORIGIN` if set, else the request's own `Host` (`https://<host>`). Missing both headers or a mismatch → `403`.
3. Configuration: `RESEND_API_KEY` or `CONTACT_TO` missing → `503 {"error":"not configured"}`. (Checked before parsing, so a misconfigured deployment always says so.)
4. Body: not JSON, not an object, or over 16 KB → `400 {"error":"bad_request"}`.
5. Honeypot: `company` non-empty → `200 {"ok":true}`, nothing sent, nothing counted.
6. Rate limit: 5 accepted requests per IP per 10 minutes (IP from `x-forwarded-for`, first entry; in-memory `Map`, per instance, resets on cold start, a courtesy only). Over → `429 {"error":"rate_limited"}` with `Retry-After` in seconds. Fable/Ethan adds the durable limit as one Vercel WAF rule on `POST /api/contact`.
7. Validation: any rule above fails → `400 {"error":"invalid","fields":{"<field>":"<message>"}}` with one plain message per bad field (see below).
8. Send through Resend (below). Resend non-2xx, network error or timeout (8 s) → `502 {"error":"send_failed"}`. Never forward Resend's own message to the visitor.
9. Success → `200 {"ok":true}`.

Every response is JSON with `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store`. The function never logs the request body or the email address (log only the status and Resend's `id` or error `name`).

## Responses

| Status | Body | What the page does |
|---|---|---|
| 200 | `{"ok":true}` | Shows the success panel: "Sent. I read these myself and reply from my own email." Clears the form. |
| 400 | `{"error":"invalid","fields":{...}}` | Shows each message under its field, moves focus to the first bad field. |
| 400 | `{"error":"bad_request"}` | Shows a general error and the mailto link. |
| 403 | `{"error":"forbidden"}` | Same as 502. |
| 405 | `{"error":"method_not_allowed"}` | Never seen by the page. |
| 429 | `{"error":"rate_limited"}` + `Retry-After` | "That's a lot of messages in a short time. Try again in a few minutes, or email me." with the mailto link. |
| 502 | `{"error":"send_failed"}` | Falls back to mailto with the fields prefilled (same as 503). |
| 503 | `{"error":"not configured"}` | Falls back to mailto with the fields prefilled. |
| network error | none | Same as 503. |

Field messages for 400 `invalid` (the api worker uses these exact strings; the front end shows them as given):

| Field | Message |
|---|---|
| `type` | "Pick a project or a call." |
| `name` | "Add your name." |
| `email` | "That email address doesn't look right." |
| `business` | "Add your business name." |
| `website` | "Keep the website under 200 characters." |
| `phone` | "Use digits and + ( ) - only." |
| `message` | "Add a few words about what you need." (empty) or "Keep it under 4,000 characters." (too long) |
| `times` | "Give me two times that work for you." |

The front end runs the same checks before posting (same limits, same messages) so most errors never reach the server.

## The email it sends

`POST https://api.resend.com/emails` with headers `Authorization: Bearer <RESEND_API_KEY>`, `Content-Type: application/json`, `User-Agent: ethan-gaither-site/1.0` (required: without it Resend's edge answers 403, code 1010).

```json
{
  "from": "<RESEND_FROM or 'Website form <onboarding@resend.dev>'>",
  "to": ["<CONTACT_TO>"],
  "reply_to": "<visitor email>",
  "subject": "[Website] Project request from <name>",
  "text": "<plain-text body>"
}
```

Subject is `[Website] Project request from <name>` or `[Website] Call request from <name>`, with `<name>` cut to 60 characters and newlines removed. Plain text only, no HTML. Body:

```
Type: Project request          (or: Call request)
Name: <name>
Email: <email>
Business: <business>
Website: <website or "-">
Phone: <phone or "-">
Good times: <times>            (calls only)

<message>

--
Sent from the form on <origin><path> at <ISO time, UTC>.
Reply to this email to answer them directly.
```

Resend answers `200 {"id":"..."}` on success. The test sender `onboarding@resend.dev` delivers **only to the address the Resend account was created with**, so `CONTACT_TO` must be that address until Ethan verifies a domain he controls (the `.vercel.app` host cannot be verified). Free tier: 100 emails a day (UTC), 3,000 a month, 10 requests a second per team.

## Environment variables (set by Ethan in the Vercel project; never in the repo or in chat)

| Name | Required | Value |
|---|---|---|
| `RESEND_API_KEY` | yes | A Resend API key with **Sending access** only. Mark it as a Secret in Vercel. |
| `CONTACT_TO` | yes | The inbox that gets the requests. Until a domain is verified: the email the Resend account was made with. Comma-separated list allowed. |
| `RESEND_FROM` | no | Sender, for example `Ethan Gaither <hello@yourdomain.com>` once a domain is verified. Default `Website form <onboarding@resend.dev>`. |
| `SITE_ORIGIN` | no | `https://ethan-gaither.vercel.app` (no trailing slash). Unset: the request's own host is used, which also lets preview deployments work. |

Env var changes reach only new deployments: redeploy after setting them.

## How to test (api worker; integrator repeats on the preview)

```
# local, from the repo root: plain node, no Vercel CLI needed
node --input-type=module -e "import h from './api/contact.mjs'; const r = await h.fetch(new Request('http://localhost/api/contact', {method:'GET'})); console.log(r.status, await r.text())"
```
Cover: 405 on GET, 403 on a foreign Origin, 503 with no env, 400 on bad JSON, 400 `invalid` with field messages, 200 on a filled honeypot (and nothing sent), 429 on the sixth request inside 10 minutes. Mock `fetch` for the Resend call; never call the real API with a real key from a worker session.

On the preview deployment: `curl -i -X POST https://<preview>/api/contact -H 'Content-Type: application/json' -H 'Origin: https://<preview>' -d '{}'` must answer from the function (503 or 400), not 308 or 404. If it answers 308, the integrator adds an exception and updates the path here and in `js/form.js`.

## Front end (pages worker) in one paragraph

Both form pages use the same `<form>`: `method="post" action="mailto:<email>?subject=..." enctype="text/plain"` as the no-JavaScript fallback, a hidden `type` input (`project` or `call`), the honeypot `company` input inside a visually hidden, `aria-hidden` wrapper with `tabindex="-1"` and `autocomplete="off"`, and `novalidate` added by `js/form.js` once it takes over. `js/form.js` validates with the rules above, posts JSON to `/api/contact` with `fetch` (`credentials: "same-origin"`, 10 s timeout through `AbortController`), and handles each response as in the table. The mailto fallback builds `subject` and a body with the same lines as the email above, prefilled from the fields.
