# Portfolio v3

Ethan Gaither's portfolio: seven pages, six sample sites for fictional businesses, and one serverless function that emails the request forms to Ethan. Plain HTML, CSS and JavaScript. No framework, no build step, no npm packages, no analytics. The browser never requests anything from another host: the fonts are self-hosted.

The site is the portfolio. Each effect is something a business owner can feel on a phone: a background that answers the scroll, type that changes as the build section plays, buttons that each move their own way, a 3D stack of screenshots, and complete sample sites. Under that it stays fast, reads fully without JavaScript, and goes still under reduced motion.

- Spec: `BRIEF-v3.md`. File ownership and the contracts between modules: `WORKER-BRIEFS.md`.
- Latest review: `audit/v3/integration-review-2026-10-15.md`. `audit/` is gitignored, so it lives on disk only.
- Branch `v3`. `main` is still v2, live at https://ethan-gaither.vercel.app, until v3 passes the audit in BRIEF-v3 §11.

## Run it locally

```
cd projects/portfolio
python3 -m http.server 8787
# open http://localhost:8787/
```

- Any static server works. Python's doesn't compress, so Lighthouse runs slow on it (home LCP 2.9 s, against 2.3 s on a gzip server). Vercel compresses.
- A static server has no `/api/contact`, so a form submit gets an error status and falls back to the visitor's mail app. That fallback is the path to test locally. The function has its own tests (see "Contact form and Resend").

## Pages

| URL | File | Page styles | Search |
|---|---|---|---|
| `/` | `index.html` | `styles/pages/home.css`, `styles/effects.css` | indexed, JSON-LD `ProfessionalService` |
| `/services/` | `services/index.html` | `styles/pages/services.css` | indexed, `Service` |
| `/samples/` | `samples/index.html` | `styles/pages/samples.css` | indexed, `CollectionPage` |
| `/about/` | `about/index.html` | `styles/pages/about.css` | indexed, `AboutPage` |
| `/start-a-project/` | `start-a-project/index.html` | `styles/pages/contact.css` | indexed, `ContactPage` |
| `/book-a-call/` | `book-a-call/index.html` | `styles/pages/contact.css` | indexed, `ContactPage` |
| any missing URL | `404.html` | `styles/pages/404.css` | `noindex` |
| `/samples/<slug>/` | `samples/<slug>/` | the sample's own CSS | `noindex` |

Every portfolio page bakes its own head (title, description, Open Graph, and on the indexable pages a canonical and JSON-LD) and the same header and footer markup, so it reads correctly with JavaScript off and for crawlers.

## Files

| Path | What it is |
|---|---|
| `styles/tokens.css` | Palette (light, dark, `[data-theme]` override), type scale, spacing, motion tokens, z-layers, glass and effect colours |
| `styles/base.css` | Self-hosted `@font-face` rules with size-adjusted fallbacks, reset, links, focus ring, skip link, type helpers |
| `styles/shell.css` | Background layer, header, footer, layout primitives, sections, inner-page hero, sample card, reveal states |
| `styles/buttons.css`, `js/buttons.js` | The button catalogue: `data-fx="glass"`, `press3d`, `magnetic`, `ink`, `draw` |
| `styles/motion.css` | Keyframes, one-shot entrances, cross-document view transitions, the global reduced-motion switch |
| `styles/effects.css` | The type morph in the build section and the 3D showcase |
| `styles/pages/*.css` | One file per page |
| `js/config.js` | Every brand value: name, email, site URL, service areas, booking link, certifications, samples, tools. Replaces v2's `site.config.js` |
| `js/shell.js` | Runs on every portfolio page: applies the config, nav state and sliding underline, reveals, copy-email, the config-driven blocks, the buttons, and lazy-loads the background and 3D modules |
| `js/type-morph.js` | The build section's stage driver and the type morph |
| `js/background.js` | The scroll- and pointer-driven background (loaded lazily) |
| `js/scene3d.js` | Scroll progress for the 3D stack (loaded lazily) |
| `js/form.js` | The two request forms |
| `api/contact.mjs` | `POST /api/contact`. The contract is `api/README.md` |
| `fonts/` | Six latin woff2 subsets and `LICENSES.md` (all OFL): Fraunces roman and italic, Inter Tight, Instrument Serif roman and italic, Space Grotesk |
| `assets/img/portrait-square-*` | The About portrait |
| `assets/img/samples/` | Hollow Oak screenshots for the build frame and the 3D stack |
| `assets/fx/glass-map.png` | The displacement map for the glass button's refraction |
| `favicon.svg`, `og.svg`, `og.png` | Monogram, and the social image (`og.png` is the 1200 by 630 export of `og.svg`) |
| `vercel.json` | `cleanUrls`, `trailingSlash`, the `/sample` redirects, the contact rewrite, security headers, long caching on `assets/` and `fonts/` |
| `sitemap.xml`, `robots.txt` | The six indexable pages. `robots.txt` disallows `/api/` |

Kept on disk, not deployed: `engine/` and `demo/` (Ethan's animation engine and its demo), the v1 images in `assets/img/` that nothing uses (`blackline-home-*`, `engine-plate.svg`, `portrait-placeholder.svg`, `wafer-placeholder.svg`; deleting them needs Ethan's OK), and `audit/`. All of them are in `.gitignore`.

## The sample sites

| Slug | Business | Phone | What it shows |
|---|---|---|---|
| `hollow-oak` | Hollow Oak Coffee, coffee shop | (360) 555-0142 | Menu, hours, map link, tap-to-call, contact form |
| `casa-ortega` | Casa Ortega, Mexican restaurant | (360) 555-0117 | Menu in sections, hours, order by phone, catering form |
| `north-fork-apparel` | North Fork Apparel, clothing label | (360) 555-0163 | Lookbook, story, sizing table, stockists, demo email signup |
| `ridgeline-goods` | Ridgeline Goods, online store | (360) 555-0128 | Filters, product grid, 10 product pages, a demo cart in `localStorage` with no checkout |
| `summit-plumbing` | Switchback Plumbing, licensed plumber | (360) 555-0186 | Services, service area, "WA licence # on file", tap-to-call everywhere, quote form, no reviews |
| `tempo-fitness` | Tempo Fitness, group-training studio | (360) 555-0151 | Class schedule, memberships without prices, free-trial form |

Rules every sample follows:
- Fictional and labelled. A banner at the top and the same sentence in the footer: "Sample site for a fictional business, built as a demonstration by Ethan Gaither." with a link back to the gallery. Made-up addresses are marked as made up.
- `noindex` on every page, and none of them are in the sitemap. Don't add them to `robots.txt` either: a crawler that can't fetch a page can't see its `noindex`.
- Self-contained: its own HTML, CSS and a little JS. It may reuse the font files, nothing else from the portfolio.
- No photos, reviews, ratings, awards or customer counts. Forms are demo forms: with JavaScript the submit is prevented and a "this is a demo" note appears; without it the form GETs its own page and `#sent:target` shows the note. (Changed 2026-10-15 from `mailto:` actions, which Chrome flags as mixed content on HTTPS.)
- `summit-plumbing` keeps its original slug. The business was renamed to Switchback Plumbing.

The gallery and the home teaser cards come from `samples` in `js/config.js` (only entries with `ready: true`). `samples/index.html` also carries static cards for visitors without JavaScript, so keep them in step by hand.

To add a sample: build it in `samples/<slug>/` (WORKER-BRIEFS §3.5), add it to `samples` in `js/config.js` with `ready: true`, and add its static card to `samples/index.html`.

v2's sample address `/sample/` (and anything under it) redirects to `/samples/hollow-oak/`, so links in old drafts keep working.

## Change the brand

Edit `js/config.js`. The pages ship with the same values written into the HTML, and `shell.js` re-applies the text values at load. So after a change, find and replace the old string in the HTML too: `grep -rn "Ethan Gaither" --include=*.html .`

Values Ethan still has to confirm (`[ETHAN]` in `js/config.js` marks the first three):
- `email`: the address shown on the site and used by the "or email me" links and the JavaScript-side fallback.
- `bookingUrl`: empty, so `/book-a-call/` shows only the request form. Set it and a "Pick a time" button appears.
- Figma on the tools list: left off until he says yes.
- `certifications`: empty, so the About page has no certifications block at all. Add one and the block appears.
- `promiseReply` stays `false`. Turn it on only if he'll keep the promise.
- On Services, the 14-day fix window and "part to start, the rest before launch" are still proposals (vault note `06-Offer-and-Pricing.md`).

### Change the address

When a custom domain is attached, update these, then redeploy:
1. `js/config.js`: `siteUrl`
2. Each indexable page's baked head: `canonical`, `og:url`, `og:image` and the JSON-LD `url` (`index.html`, `services/`, `samples/`, `about/`, `start-a-project/`, `book-a-call/`)
3. `sitemap.xml`: every `<loc>`
4. `robots.txt`: the `Sitemap:` line
5. `SITE_ORIGIN` in Vercel (see "Contact form and Resend")

## Motion, accessibility, no JavaScript

- An inline script in each head adds `js` to `<html>`, and `motion-ok` unless the visitor asked for reduced motion. Every animation is gated on `motion-ok`. Reveals hide content only under `js` and `motion-ok`, and a CSS failsafe shows everything after 4 s if `shell.js` never starts.
- Reduced motion: the background stays a static gradient, the build section shows its finished state, the 3D stack is a still angled composition, the hero gets one 200 ms fade, buttons only change colour.
- JavaScript off: all content shows, the nav works, the request forms post form-encoded to `/api/contact/` and land on `start-a-project/sent/` or `book-a-call/sent/` (or come back with `?error=`), and the samples grid shows its static cards.
- The background and 3D modules load after `load`, on idle (a 1.2 s timer where `requestIdleCallback` is missing, as on iOS Safari) or on the first scroll or pointer move. They don't load under reduced motion or save-data. The background draws only in answer to scroll and pointer, stops when it settles, and pauses in a hidden tab.
- Keyboard: skip link first, a visible focus ring on every stop, reading order follows the page. The form honeypot has `tabindex="-1"`.
- Phones: below 560 px the header is two rows (brand and nav, then the two CTAs). It falls back to three rows under about 370 px.

## Budgets and the last checks

The hard gates are in BRIEF-v3 §7: on mobile, performance 90 or more, accessibility, best practices and SEO 100 (SEO is excluded for the `noindex` samples), LCP 2.5 s or less, CLS 0.05 or less, TBT 200 ms or less.

Local run on 2026-10-15, after the shared fix round: Lighthouse 12.8.2, simulated throttling, against a local HTTP/1.1 server with gzip (closer to Vercel than Python's server, which doesn't compress). JSON: `audit/v3/shared-fix/lh/`. SEO 63-66 on the 404 and the samples is the `noindex`, on purpose.

| Page | Mobile perf / a11y / BP / SEO | Mobile LCP / CLS / TBT | Desktop perf / a11y / BP / SEO | Desktop LCP |
|---|---|---|---|---|
| `/` | 98 / 100 / 100 / 100 | 2.3 s / 0 / 81 ms | 100 / 100 / 100 / 100 | 0.5 s |
| `/about/` | 99 / 100 / 100 / 100 | 2.1 s / 0 / 0 ms | 100 / 100 / 100 / 100 | 0.5 s |
| `/services/` | 82 / 100 / 100 / 100 | 2.0 s / 0 / 694 ms | 100 / 100 / 100 / 100 | 0.4 s |
| `/samples/` | 84 / 100 / 100 / 100 | 2.0 s / 0 / 609 ms | 100 / 100 / 100 / 100 | 0.4 s |
| `/start-a-project/` | 99 / 100 / 100 / 100 | 2.0 s / 0 / 0 ms | 100 / 100 / 100 / 100 | 0.4 s |
| `/book-a-call/` | 99 / 100 / 100 / 100 | 2.0 s / 0 / 0 ms | 100 / 100 / 100 / 100 | 0.4 s |
| `/404.html` | 98 / 100 / 100 / 63 | 2.3 s / 0.005 / 0 ms | 100 / 100 / 100 / 63 | 0.5 s |
| hollow-oak | 99 / 100 / 100 / 63 | 1.8 s / 0 / 0 ms | 100 / 100 / 100 / 63 | 0.4 s |
| casa-ortega | 100 / 100 / 100 / 63 | 1.4 s / 0 / 0 ms | 100 / 100 / 100 / 63 | 0.3 s |
| north-fork-apparel | 100 / 100 / 100 / 63 | 1.4 s / 0 / 0 ms | 100 / 100 / 100 / 63 | 0.3 s |
| ridgeline-goods | 100 / 100 / 100 / 66 | 1.4 s / 0 / 0 ms | 100 / 100 / 100 / 66 | 0.3 s |
| summit-plumbing | 100 / 100 / 100 / 63 | 0.9 s / 0 / 0 ms | 100 / 100 / 100 / 63 | 0.2 s |
| tempo-fitness | 100 / 100 / 100 / 63 | 1.1 s / 0 / 0 ms | 100 / 100 / 100 / 63 | 0.3 s |

- `/services/` and `/samples/` lost mobile points to one main-thread task of about 740 ms when `js/background.js` starts. It comes and goes between runs (a re-run gave `/services/` 99 with TBT 0, and `/samples/` 82 again), and `background.js` was being edited by the effects worker during this run. Measure again once that lands.
- Home's LCP element is the last word of the hero headline. Locally, about 0.2 s of it is the Instrument Serif and Space Grotesk files: the build section's captions request them at first layout, though they sit below the fold.

The deployed preview decides the gate, and it hasn't been measured yet (see "Deploy").

Sizes from the 2026-10-15 integration review: core JavaScript 14.3 KB gzipped (budget 120), background plus 3D 22.2 KB unminified (budget 60).

## Deploy

How it's set up (unchanged from v2): this folder is its own git repository, and its remote is the **public** GitHub repo `Starrybums/ethan-gaither-site`. The Vercel project `ethan-gaither` isn't git-linked, on purpose (the Vercel GitHub app is on a different account), so pushing doesn't deploy. A deployment is made through the Vercel connector, or with `vercel deploy` from a logged-in CLI (`--prod` for production). Nothing needs building.

### Launch order for v3

1. **Untrack the briefs before v3 is pushed.** `BRIEF-v3.md` and `WORKER-BRIEFS.md` are tracked on `v3`, and the GitHub repo is public. They're internal notes, not site files. Add both to `.gitignore` and `git rm --cached` them.
2. **Preview deployment of `v3`**, not production. To run the real email test there, add `RESEND_API_KEY` and `CONTACT_TO` to the Preview environment first.
3. **Contact route test.** `trailingSlash: true` 308-redirects `/api/contact` to `/api/contact/`. That's certain: it's the route Vercel generates from this `vercel.json`, checked with Vercel's own routing package. The browser's `fetch` follows a 308 with the same method and body, and `vercel.json` rewrites `/api/contact/` to the function, so the form should work with one extra hop. Confirm it:
   ```
   curl -i -X POST https://<preview>/api/contact/ -H 'Content-Type: application/json' -H 'Origin: https://<preview>' -d '{}'
   curl -i -L -X POST https://<preview>/api/contact -H 'Content-Type: application/json' -H 'Origin: https://<preview>' -d '{}'
   ```
   Both must end at the function: `503 {"error":"not configured"}` with the variables unset, `400 {"error":"invalid",...}` with them set. An empty body never sends an email. A `404` means the rewrite didn't take. Once it passes, `js/form.js` and `api/README.md` can switch to `/api/contact/` to skip the hop.
4. **Lighthouse on the preview**, mobile and desktop, every page in the table above. Save the JSON in `audit/v3/`. Home LCP must be 2.5 s or less on mobile. If the preview sits behind Vercel's deployment protection, curl and Lighthouse get a 401 until they use the protection bypass.
5. **Proof numbers.** Write the measured home numbers into the Proof card in `index.html` and delete the TODO comment there.
6. Fable's audit (BRIEF-v3 §11) and Ethan's real form test. Then merge `v3` into `main`, deploy to production, run Lighthouse on the production URL, and update the vault.

## Rules this site follows

Nothing on it is invented: no testimonials, reviews, client logos, made-up numbers or results, ranking promises or reply-time promises. No prices for Ethan's work: where payment comes up the copy says "fixed price, agreed before I start, plus WA sales tax". The public name is Ethan Gaither. Every sample is labelled as fictional on every page. Blackline work is labelled as Blackline work.

## Contact form and Resend

`POST /api/contact` takes the JSON from the two request forms and emails it to Ethan through Resend. The visitor's email is the `reply_to`, so one tap on Reply answers them. The full contract (fields, statuses, messages, email body) is in `api/README.md`. This section is the setup and the tests.

Files: `api/contact.mjs` (the function, plain ESM, no dependencies, no `package.json`). The test script is `audit/v3/api/test-contact.mjs` (gitignored with the rest of `audit/`). It is not in `api/` on purpose: Vercel deploys every file in `api/` as a function.

### Environment variables

Set these in the Vercel project. Never in the repo, in chat or in a note.

| Name | Required | Type in Vercel | Value |
|---|---|---|---|
| `RESEND_API_KEY` | yes | **Secret** | The `re_...` key from step 2 below |
| `CONTACT_TO` | yes | Config | The inbox that gets the requests. Until a domain is verified it must be the email you signed up to Resend with. Comma-separated list allowed. |
| `RESEND_FROM` | no | Config | Leave unset for now. The default sender is `Website form <onboarding@resend.dev>`. After a domain is verified: `Ethan Gaither <hello@yourdomain.com>`. |
| `SITE_ORIGIN` | no | Config | `https://ethan-gaither.vercel.app` (no trailing slash). More than one allowed, comma-separated, for example after a custom domain is added. Set it for **Production only**. Unset, the function accepts requests from its own host, so preview deployments work. |

`RESEND_API_URL` also exists. It points the function at a local mock in tests. Do not set it in Vercel.

Missing `RESEND_API_KEY` or `CONTACT_TO` makes the function answer `503 {"error":"not configured"}` and the pages fall back to the visitor's mail app. Vercel applies env var changes to new deployments only, so redeploy after changing any of them.

### The test-sender rule (read this before the first test)

Production and preview currently set `RESEND_FROM` to a verified domain on the connected Resend account (set 2026-10-15), so delivery is not limited to the account's own address. Without a verified domain, the sender is `onboarding@resend.dev`. Resend says that address "can only send emails to the email address associated with your Resend account". So `CONTACT_TO` has to be the email you sign up to Resend with. Any other address gets a 403 from Resend, which the function turns into a 502 `send_failed`, and the visitor sees the mailto fallback.

One oddity in Resend's docs: step 3 of the troubleshooting list on that page says "not trying to send to your own email address", which contradicts the page's own rule and the API's error text. Read it as a typo. The first real test will settle it.

`ethan-gaither.vercel.app` can't be verified in Resend (verifying needs DNS access). A domain Ethan owns can.

### Set it up (Ethan, about 15 minutes, once)

1. **Resend account.** Sign up at resend.com with the inbox you want the requests in. Use the same address for `CONTACT_TO`.
2. **API key.** Dashboard, **API keys**, **Create API Key**. Name it `ethan-gaither-site`. Permission: **Sending access**. Leave the domain empty (no domain yet). Copy the key when it shows. Resend shows it once. Paste it straight into Vercel, nowhere else.
3. **Vercel variables.** Dashboard, the project, **Settings**, **Environment Variables**. Add `RESEND_API_KEY` (Secret), `CONTACT_TO`, and `SITE_ORIGIN`. Pick the environments: Production for all three, plus Preview for the first two if you want to test a preview. **Save** each one.
4. **Redeploy.** Changes reach new deployments only. Ask Fable to deploy again, or redeploy the latest deployment in the Vercel dashboard.
5. **Test.** Open the live site on your phone, send a test through Start a project, and watch the inbox. Check spam too. Mail from `onboarding@resend.dev` can land there the first few times.
6. **Spam limit that survives restarts.** The function counts requests in memory (5 per IP per 10 minutes). That resets on a cold start and isn't shared between instances. Resend's free plan allows 100 emails a day, and a spam burst could use all of them. Add one Vercel firewall rule: project, **Firewall**, **Configure**, **Add New...**, **Rule**. In the text box at the top, type `Rate limit POST /api/contact to 5 requests per 10 minutes per IP` and choose **Generate Rule**. Check the result: path `/api/contact`, method POST, fixed window, 10 minutes, limit 5, key IP, action Deny or the default 429. Then **Save Rule**, **Review Changes**, **Publish**. On the Hobby plan that is the one rate-limit rule you get, and 10 minutes is the longest window. Vercel counts per region. I haven't clicked through this in a dashboard, so match the labels to what you see.

### Test it

Local, no Vercel CLI, no network, no real key:

```
node --test audit/v3/api/test-contact.mjs
```

37 tests. They mock `fetch` for the Resend call, and three of them send a real HTTP request to a local mock server through `RESEND_API_URL`. They cover 405, 403, 503, 400 (bad JSON and per-field messages), the honeypot, a valid project and call, Resend failures and the 8 second timeout, the sixth request in 10 minutes (429 and `Retry-After`), and that nothing the visitor typed is logged.

One-line smoke test from `api/README.md`:

```
node --input-type=module -e "import h from './api/contact.mjs'; const r = await h.fetch(new Request('http://localhost/api/contact', {method:'GET'})); console.log(r.status, await r.text())"
```

On a preview deployment (the integrator runs this before launch):

```
curl -i -X POST https://<preview>/api/contact -H 'Content-Type: application/json' -H 'Origin: https://<preview>' -d '{}'
```

It has to come from the function: `503` with the variables unset, `400 {"error":"invalid",...}` with them set. A `308` or `404` means the route is wrong. `vercel.json` has `trailingSlash: true`, and whether that redirects `/api/contact` is unverified (BRIEF-v3 §13.2). If it redirects, add an exception or a rewrite in `vercel.json` and update the path in `api/README.md` and `js/form.js` together.

When something fails on the live site, open the function's logs in Vercel. The function logs one short line per outcome and never the visitor's data:

| Log line | Meaning |
|---|---|
| `contact: not configured, missing RESEND_API_KEY,CONTACT_TO` | A variable is missing, or the deployment predates it. Redeploy. |
| `contact: resend answered 403 validation_error` | `CONTACT_TO` isn't the Resend account's email (test sender), or `RESEND_FROM` isn't on a verified domain. |
| `contact: resend answered 401 ...` | The key is wrong or deleted. Make a new one and update `RESEND_API_KEY`. |
| `contact: resend answered 429 daily_quota_exceeded` | The 100 a day on the free plan is used up. It resets at 00:00 UTC. |
| `contact: sent <id>` | Resend accepted it. If it didn't arrive, look in spam, then in Resend's dashboard under the id. |

### Limits to know

Free plan: 3,000 emails a month, 100 a day (UTC day), 10 API requests a second per team. Each recipient counts as one email, so a `CONTACT_TO` list of two uses two.

### Later: a domain Ethan owns

Add and verify the domain in Resend, set `RESEND_FROM` to an address on it, and `CONTACT_TO` can then be any inbox. The key can also be pinned to that domain when you edit it in the Resend dashboard.

### Sources (read 2026-10-15)

- Request fields, success body, `reply_to`, `from` format: https://resend.com/docs/api-reference/emails/send-email
- `User-Agent` required, 403 code 1010 without it: https://resend.com/docs/knowledge-base/403-error-1010
- Test sender only delivers to the account's own email: https://resend.com/docs/knowledge-base/403-error-resend-dev-domain, and the 403 `validation_error` text on https://resend.com/docs/api-reference/errors
- Create a key, **Sending access**: https://resend.com/docs/create-an-api-key and https://resend.com/docs/api-reference/api-keys/create-api-key
- Free plan 3,000 a month, 100 a day: https://resend.com/pricing. Rate limit 10 requests a second per team: https://resend.com/docs/api-reference/rate-limit
- Function shape (`export default { fetch(request) }`, `.mjs` without a `package.json`): https://vercel.com/docs/functions/functions-api-reference
- Env vars and redeploying: https://vercel.com/docs/environment-variables/managing-environment-variables
- Firewall rate limit steps and Hobby limits: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting and https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules

Not confirmed from the docs: the Resend test-sender step-3 wording above, the exact Vercel dashboard labels beyond what those pages print, and whether `/api/contact` survives `trailingSlash: true` (needs the preview test).
