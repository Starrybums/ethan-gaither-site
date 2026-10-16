# Portfolio v3 — build brief (capability showcase, multi-page)

Written by Fable 2026-10-15 from Ethan's 18:58 request. Supersedes BRIEF-v2 where they differ. The live v2 stays up at https://ethan-gaither.vercel.app until v3 passes the audit in §11.

## 0. What Ethan said (18:58, paraphrased, his words in quotes)
A portfolio "of what I can do". A background "that shows like a cool animation when I'm scrolling". In the build section the type "changes fonts throughout … back and forth". Custom scrolling animation; "everything fade in … nice and smooth". "Each button to have its own custom way of moving … liquid glass for one of them, maybe like a 3D effect with another". "Go more in depth about what I want to do … about everything." An About page, "nice and clear", with a place for certifications he plans to earn (coding, management). Links go to their own pages "like we did with Blackline": "book a free demo call" and "start a project" open their own page, not a scroll. The request form "sends it right to me" (set up Resend if needed). Show "3D designs". Instead of one coffee-shop sample, "three to six different sites … a coffee shop, a Mexican restaurant, a clothing brand, an e-commerce store, one's a different". Offer SEO (getting their name "at the top of the list") honestly. Make "they own it all" clear. "Audit it once it's done." Ladder: Fable leads, Opus manages (and may build), Sonnet builds.

What stays from v2 (Ethan's 2026-10-09 feedback): the page must show *what he does*. Motion is there to prove skill, never to decorate for its own sake; every effect has a reason a prospect can feel ("this is what your buttons could do"). The samples are fictional and labelled. Nothing invented.

## 1. The idea
The site is the portfolio. Every interaction is a demonstration a small-business owner can feel on their phone: a background that answers the scroll, type that changes as you read, buttons that each behave differently, a 3D scene, and a set of complete sample sites for businesses like theirs. Under the show it stays fast, readable without JavaScript, accessible, and honest.

## 2. Site map (every page is its own file, baked head, shared shell)
| URL | Page | Purpose |
|---|---|---|
| `/` | Home | Hero on the scroll-reactive background. Short "what I do". **The build** (type-morph section). **Samples** teaser (cards → `/samples/`). **What you get** (ownership, SEO and listings setup, speed, handover). **3D** showcase. Proof (own Lighthouse numbers, process). Two CTAs on every screen: *Start a project* → `/start-a-project/`, *Book a free call* → `/book-a-call/`. |
| `/about/` | About Ethan | Portrait, who he is (Battle Ground, builds by hand with AI tooling, day-to-day), how he works (4 steps), tools he uses (true list), values (ownership, plain language, speed), service area, a **Certifications** block that renders only when `site.config.js` lists one (empty list → block absent; never "coming soon"). |
| `/services/` | What I do, in depth | The starter website (pages, design, form, tap-to-call, map, basic SEO, speed checks, handover), the process, **SEO and listings** (what it really is: titles, descriptions, schema, sitemap, Search Console, help setting up a Google Business Profile; no ranking promises), **You own everything** (domain, hosting account, code, logins), what is not included, a plain-HTML FAQ (8-10 real questions). No prices until Ethan approves them; copy says "fixed price, agreed before I start" and "plus WA sales tax" wherever payment is mentioned. |
| `/samples/` | Sample sites | Grid of 5-6 cards, each labelled "Sample site for a fictional business (self-initiated concept)". Each card opens the sample. |
| `/samples/<slug>/` | One sample each | Self-contained: own `index.html`, own CSS, minimal JS, `noindex`, fictional banner top and bottom, "Back to samples" link, fictional 555-01xx phone, made-up address. Roster in §4. |
| `/start-a-project/` | Request form | The form in §6 with `type=project`. Works without JS (falls back to mailto). |
| `/book-a-call/` | Request a call | Same form, `type=call`, asks for two good times; a `bookingUrl` slot in `site.config.js` renders a "Pick a time" button when set. |
| `/404.html` | Not found | Styled, noindex, links home. |

Nav (all pages): Home, Services, Samples, About, and the two CTAs. Footer: name, Battle Ground WA, links, "Built by hand. No tracking."

## 2a. Home page choreography (Ethan, 19:08, in his order)
This is the spine of the home page. Build it as discrete scroll stages (scrubbable forward and back), not a video.
0. **Load.** Nothing "bangs" onto the screen. The background fades up first. The headline *I build websites for small businesses.* appears starting with the "I" and sweeps across the line (per-word or per-letter reveal with a soft blur-to-sharp, about 0.9 s total, the architect tunes the pace), then the sub-line, then the two buttons, staggered. Reduced motion: a plain 200 ms opacity fade of the whole hero.
1. **Zoom in.** As the visitor scrolls into "The build", the desktop browser frame (showing the coffee sample) scales up from the page toward the viewer until it fills most of the width.
2. **Slide aside and explain.** The frame slides to one side (right on desktop; it docks to the top on phones) and a text column walks through the site: pages, the contact form, tap-to-call, the map, speed. The **type morph** (§3.3) runs across these captions as they change.
3. **Pull back to a phone.** The frame zooms out and becomes a bare phone: only the device outline, centred, no hand, no desk, nothing else.
4. **Into the phone.** The view zooms into the phone screen showing the sample's mobile layout. Caption: built for the phone first.
5. **Review it.** Scrolling on, the checks tick in one by one (contrast, tap targets, speed, alt text, the 404). This is the existing end of v2's build section; keep its substance.
6. **Then the rest of the page:** What you get (deeper, see §5; no prices yet, "fixed price, agreed before I start, plus WA sales tax"), Proof ("things you can check yourself" stays), Samples teaser ("Open sample sites" → the gallery), the 3D showcase, a short About teaser → `/about/`, and the two CTAs.
Every stage: a reduced-motion static state, no scroll-jacking, a real DOM (the captions are text, not canvas), and the frame content is the real sample page rendered in an `<iframe>` only if it stays under the performance budget; otherwise a static screenshot set (desktop and phone) with the real sample one tap away.

**Contact ("ding me").** The request forms (§6) email Ethan the moment someone submits, like the Blackline booking form did; the email arrives with the visitor's details and a reply-to so one tap answers it. No auto-replies to the visitor beyond the on-page confirmation.

## 3. Interaction inventory (each one is a demonstration; each has a reduced-motion fallback)
1. **Scroll-reactive background** (home, and lightly on inner pages): dependency-free canvas or WebGL (written in-house, ≤ 25 KB), ink-and-paper palette from the tokens, driven by scroll position and pointer, paused when off-screen or the tab is hidden, capped to the device pixel ratio of 2. Reduced motion or no WebGL: a static layered gradient. Must never cost more than ~4 ms per frame on a mid phone (measure with the trace in §11).
2. **Reveals**: everything fades and rises in on entry (IntersectionObserver, staggered children, once). Content is never hidden without JavaScript. Smooth scrolling via CSS `scroll-behavior`; no scroll-jacking, no hijacked wheel.
3. **Type morph** (the build section): as the visitor scrolls, the headline and the sample frame move through 4-5 stages, and the type changes with them: variable-font axes (Fraunces opsz/wght, Inter Tight wght) plus a crossfade between three self-hosted families (for example Fraunces → Instrument Serif → Space Grotesk → Inter Tight; the architect picks, all OFL, files in `fonts/`). Scrubs forward **and back** with scroll. Prefer CSS scroll-driven animations (`animation-timeline: scroll()` / `view()`) with an IntersectionObserver + rAF fallback where unsupported. Reduced motion: the final state, static.
4. **Buttons, each its own interaction** (a catalogue in `styles/buttons.css` + `js/buttons.js`, used across the site so each CTA shows a different technique):
   - *Liquid glass*: translucent surface with `backdrop-filter`, an SVG displacement/refraction filter, a specular highlight that follows the pointer, and a subtle wobble on press.
   - *3D press*: perspective tilt toward the pointer with a layered depth shadow and a real "push" on active.
   - *Magnetic*: pulls toward the pointer inside a radius and snaps back.
   - *Ink fill*: a liquid wipe from the pointer's entry edge.
   - *Border draw*: an SVG stroke draws around the button on hover.
   Rules: hover effects gated on `@media (hover: hover)`; every button is a real `<a>` or `<button>`, keyboard-operable, with a visible focus ring; touch gets a press state; reduced motion gets colour change only.
5. **3D showcase** (home): a section where a phone-and-laptop stack (CSS 3D, layered screenshots of the samples) rotates and separates with scroll, or an in-house WebGL scene; the architect picks the cheaper one that still looks real. Reduced motion: a static angled composition.
6. **Page transitions**: cross-fade via the View Transitions API where supported; no fallback needed.
7. **Micro-interactions**: nav underline that follows the active link, a copy-email button, form field focus glow, success state animation on the form.

## 4. Sample roster (fictional, labelled; each a distinct design system, not the portfolio's)
| Slug | Business | Distinct look | Must show |
|---|---|---|---|
| `hollow-oak` | Hollow Oak Coffee (move the existing v2 sample here) | warm, serif | menu, hours, map, tap-to-call, form |
| `casa-ortega` (name is a placeholder the worker may change; keep it clearly fictional) | Mexican restaurant | bold colour, photo-free illustration or pattern | menu with sections, hours, order-by-phone, catering form, Spanish/English toggle optional |
| `north-fork-apparel` | Clothing brand | editorial, large type, grid | lookbook grid, story, sizing, stockists, email signup (demo only) |
| `ridgeline-goods` | E-commerce store | product-first, clean | product grid, product page, a working demo cart in `localStorage` (no checkout: a "demo store" notice), filters |
| `summit-plumbing` | Licensed trade (plumber or electrician, the outreach target niche) | trust, clarity, blue-collar | services, service area, licence number placeholder "WA licence # on file", tap-to-call everywhere, request-a-quote form, reviews **omitted** (none exist) |
| `tempo-fitness` (optional sixth if time allows) | Fitness studio or salon | energetic | schedule table, memberships without prices or with "from" placeholders marked fictional, trial form |
Rules: no real business names or addresses, no stock photos (illustrations, patterns, CSS art, or generated placeholders that look like illustrations), fictional 555-01xx numbers, every page `noindex`, a banner "Sample site for a fictional business, built as a demonstration by Ethan Gaither", a back link. Each sample must itself pass accessibility 100 and best practices 100, and perform ≥ 90 on mobile.

## 5. Content (go deeper, stay true)
- Voice: plain, confident, specific (load the `human-voice` skill). Short sentences. No agency filler.
- Services page is the long one: what is built, how, what happens at each step, what the client supplies, how long it takes, what is included, what is not, what "basic SEO" and "listings setup" mean, what "you own everything" means in practice (domain registrar in their name, hosting account in their name, code handed over, logins changed to theirs), the fix window, the care plan (exists; price not shown until approved), an FAQ.
- About page: real facts only (Battle Ground; builds websites by hand with AI tooling; previously built his own agency site, a booking system and spec builds; day job and college are **not** mentioned). Tools list must be true: HTML, CSS, JavaScript, Vercel, GitHub, Claude Code, Codex, Cursor, Figma (confirm Figma; drop if unsure), Lighthouse. Certifications: rendered from `site.config.js` `certifications: []`; empty means the section does not exist.
- Never: testimonials, client logos, "trusted by", star ratings, invented metrics, "Logarithms", "LLC", tattoo-studio targeting, ranking guarantees, reply-time promises (`promiseReply` stays off).
- Keep "Blackline work" labelled as such where it appears (one line on About).

## 6. The request form and Resend
- `api/contact.js`: Vercel Node serverless function (plain JS, no dependencies; `fetch` is built in). `POST` JSON `{type: "project"|"call", name, email, business, website?, phone?, message, times?, company: ""}` (the `company` field is a honeypot: non-empty → silently return 200). Validate lengths and email shape; reject other methods with 405; same-origin only (check `Origin`/`Referer` against `SITE_ORIGIN` env or the request host); crude rate limit (in-memory map, 5 per IP per 10 minutes; fine for a single-region function). Send with the Resend REST API (`POST https://api.resend.com/emails`, bearer `RESEND_API_KEY`) from `RESEND_FROM` (default `onboarding@resend.dev`, which Resend only delivers to the account owner's own address until a domain is verified) to `CONTACT_TO`, with `reply_to` set to the visitor's email, subject `[Website] Project request from <name>` or `[Website] Call request from <name>`, a plain-text body. On missing env: respond `503 {error: "not configured"}`. Never log the body.
- Verify the exact Resend request shape, limits and the test-sender rule against Resend's current docs during research; cite the page in `README.md`.
- Front end: `<form method="post" action="/api/contact/">`; without JavaScript the browser posts form-encoded and the function answers 303 to a `sent/` page (or back with `?error=`); with JavaScript, `js/form.js` posts JSON to `/api/contact/`, shows inline errors and a success panel ("Sent. I read these myself and reply from my own email."), and on 502/503 falls back to a prefilled mailto. (Changed 2026-10-15: a `mailto:` form action is flagged by Chrome as mixed content on HTTPS and cost 21 best-practices points.)
- Env vars (Ethan sets them in the Vercel project; never in the repo or chat): `RESEND_API_KEY`, `CONTACT_TO`, optional `RESEND_FROM`, `SITE_ORIGIN`. README documents the exact names and the test.
- `vercel.json` keeps the headers and adds `"functions"` only if needed; the static site and the function deploy together through the existing path (push, then `create_deployment` from `main`).

## 7. Performance, accessibility, SEO budgets (hard gates)
| Gate | Target |
|---|---|
| Lighthouse mobile (simulated), `/` and every indexable page | performance ≥ 90, accessibility 100, best practices 100, SEO 100 |
| Samples | accessibility 100, best practices 100, performance ≥ 90 (SEO excluded: noindex) |
| LCP / CLS / TBT, mobile simulated | ≤ 2.5 s / ≤ 0.05 / ≤ 200 ms |
| JavaScript | core ≤ 120 KB gzipped across the shell; the background/3D module lazy-loaded after `requestIdleCallback`, ≤ 60 KB, skipped under reduced motion or `navigator.connection.saveData` |
| Fonts | self-hosted woff2 subsets (latin), `font-display: swap`, size-adjusted fallbacks (keep v2's measured values where the family is unchanged), preload the two above-the-fold faces |
| Without JavaScript | all content visible and readable, nav works, forms post to `/api/contact/` and land on a `sent/` page |
| Motion | every effect checks `prefers-reduced-motion`; no autoplaying motion longer than 5 s without a pause; no parallax on body text |
| Keyboard | every control reachable, visible focus, logical order, skip link |
| Contrast | AA on every text/background pair in both colour schemes |
| Third parties | none at runtime (no CDN scripts, no fonts from Google at runtime, no analytics) |
| Head | per-page title (≤ 60 chars), description (≤ 160), canonical, OG tags, JSON-LD (`ProfessionalService` on `/`, `AboutPage`/`Person` on `/about/`, `Service` on `/services/`), sitemap of indexable pages, samples and 404 `noindex` |

## 8. Tech constraints and file layout
Plain HTML, CSS, JavaScript. No build step, no npm packages in the site, no framework. One in-house WebGL/canvas module at most. Branch `v3` in `projects/portfolio` (git); `main` stays the live v2 until the audit passes.
```
projects/portfolio/
  index.html  about/index.html  services/index.html  samples/index.html
  start-a-project/index.html  book-a-call/index.html  404.html
  samples/<slug>/index.html + <slug>.css (+ optional <slug>.js)
  styles/tokens.css  styles/base.css  styles/shell.css  styles/buttons.css  styles/motion.css  styles/pages/<page>.css
  js/config.js (site.config.js moves here)  js/shell.js (nav, reveals, transitions)  js/buttons.js  js/type-morph.js  js/background.js (lazy)  js/scene3d.js (lazy)  js/form.js
  fonts/*.woff2   assets/img/...   api/contact.js   vercel.json  sitemap.xml  robots.txt  README.md
```
`/sample/` redirects (308) to `/samples/hollow-oak/` in `vercel.json` so the links already in the outreach drafts keep working. `vercel.json` keeps `cleanUrls` and `trailingSlash: true`.

## 9. Ownership rules for parallel workers (no two workers touch one file)
- **Architect (Opus)** creates the skeleton first: tokens, base, shell CSS/JS, the button catalogue API, the page shells with baked heads, the worker briefs. Workers build inside their own files only.
- **Home worker** owns `index.html`, `styles/pages/home.css`, `js/type-morph.js`, `js/background.js`, `js/scene3d.js`.
- **Pages worker** owns `about/`, `services/`, `start-a-project/`, `book-a-call/`, `404.html`, `styles/pages/{about,services,contact}.css`, `js/form.js`.
- **API worker** owns `api/contact.js`, the Resend section of `README.md`, and the form's contract (documented in `api/README.md` before the pages worker wires it; the architect fixes the JSON contract in advance so both can work at once).
- **One worker per sample** owns `samples/<slug>/*`. The **samples index** is owned by the pages worker (cards read from `js/config.js` → `samples: []`, so the index needs no edits when a sample lands).
- Shared files (`styles/*`, `js/shell.js`, `js/buttons.js`, `js/config.js`) change only through the architect or the integration pass.

## 10. Hierarchy and effort
Fable leads and audits. Opus manages: architecture, worker briefs, integration, review, and may build the hardest module (background or 3D) itself. Sonnet builds everything else. Run up to four Sonnet workers at once in this build (Ethan asked for scale; the usage note tracks cost). Each worker: ≤ 2 attempts per blocker, then report. Nobody claims a check ran unless it ran.

## 11. Acceptance and audit (Fable, on the deployed preview)
1. Every page in §2 exists, is linked from the nav, and passes §7 on the deployed URL (Lighthouse on the live preview, mobile and desktop; JSON kept in `audit/v3/`).
2. Phone (390×844) and desktop (1440) screenshots of every page, light and dark, plus one of each sample, in `audit/v3/`. No horizontal overflow at 390.
3. Reduced-motion pass: with `prefers-reduced-motion: reduce` every page is static and complete.
4. No-JS pass: content visible, nav works, forms fall back to mailto.
5. Keyboard pass on the home page and the two forms.
6. Form test: with env unset the function returns 503 and the page falls back; with Ethan's key set, one real submission reaches his inbox (Ethan sends it).
7. Grep gates: no "Logarithms", "LLC", "testimonial", "trusted by", "guarantee", "rank #1", "coming soon"; every sample page has the fictional banner and `noindex`.
8. `/sample/` redirects to the coffee sample; the sitemap lists only indexable pages.
9. Opus review record and fix round completed before Fable's audit, including the §14 items (background movements and colour drift; the bigger zoom); Fable's audit written to `audit/v3/audit.md`.
10. Only then: merge `v3` to `main`, deploy to production, re-run Lighthouse on the production URL, update the vault.

## 12. Open questions for Ethan (defaults run if unanswered)
1. Sample roster and names in §4 (default: the six above, names fictional).
2. Resend: create the account at resend.com with the email the form should reach, add `RESEND_API_KEY` and `CONTACT_TO` in the Vercel project settings (Fable gives the exact steps). Until then the form falls back to email.
3. Certifications: none listed until he has one (Fable researches which are worth his time; see the vault note).
4. Booking link for `/book-a-call/` (Google Calendar appointment schedule) when it exists.
5. Figma on the tools list: yes or no.

## 13. Research facts the build must respect (Sonnet research 2026-10-15, `audit/v3/RESEARCH-techniques-2026-10-15.md`; read that note for sources)
1. **Resend:** `POST https://api.resend.com/emails` with `Authorization: Bearer`, `Content-Type: application/json` **and a `User-Agent` header** (without it the edge answers 403, code 1010). Fields: `from`, `to`, `subject`, `reply_to`, `text`. Success `{ "id": "..." }`. The test sender `onboarding@resend.dev` delivers **only to the email address on the Resend account**, so `CONTACT_TO` must equal Ethan's Resend signup address until he verifies a domain he controls (the `.vercel.app` host cannot be verified). Free tier: 3,000 emails a month, 100 a day. Create a `sending_access` key.
2. **Vercel function:** name it `api/contact.mjs` (ESM without a package.json needs `.mjs`); with `cleanUrls` it serves at `/api/contact`. Env var changes reach only new deployments. In-memory rate limiting is per instance and resets on cold starts: keep it, but it is a courtesy. `trailingSlash: true` **may** 308-redirect `/api/contact`; the front end must POST to the exact path and the integrator tests a POST on the preview deployment, adding a `rewrites` entry or an exception if the redirect bites.
3. **Lazy loading:** `requestIdleCallback` does not exist on iOS Safari and `navigator.connection.saveData` is Chrome-only. Gate the effects modules with: reduced motion off, then `requestIdleCallback` if present else `setTimeout(…, 1200)`, plus a first-scroll or first-pointer trigger; treat `saveData` as optional.
4. **Scroll-driven animations:** Chrome 115+, Safari 26, Firefox 159 (Firefox stable is 158 until about 2026-10-23). Base CSS must be the final readable state; the in-house rAF + CSS-variable fallback drives the stages where `animation-timeline` is unsupported (`CSS.supports("animation-timeline: scroll()")`). No polyfill.
5. **View transitions:** same-document is fine (Chrome 111, Safari 18, Firefox 144); cross-document `@view-transition` has no Firefox support and is optional.
6. **Liquid glass:** `backdrop-filter: url(#svg)` refraction renders only in Chromium; Safari and Firefox paint nothing. Baseline is CSS frosted glass (`backdrop-filter: blur() saturate()`, a gradient highlight that follows the pointer); add the SVG refraction only under `@supports` plus a Chromium check, with a static pre-generated displacement map and only `scale` animated. **An ancestor with `opacity < 1`, `filter`, or `mask` becomes the backdrop root**, so a glass button must fade itself in, never sit inside a fading wrapper.
7. **Fonts:** Fraunces (opsz 9-144, wght 100-900, SOFT, WONK; roman 67 KB latin woff2, italic 82 KB), Inter Tight (wght 100-900, 45 KB), Space Grotesk (wght 300-700, 22 KB), Instrument Serif (no axes, 15 KB; crossfade only). Animating `wght`/`opsz` reflows text every frame: morph only short captions in fixed-height boxes and crossfade families for the big headline. OFL allows self-hosting; keep the licence files.
8. **Background/3D on phones:** cap DPR at 2, pause with IntersectionObserver and `visibilitychange`; the background stays scroll- and pointer-driven (WCAG 2.2.2: no autoplaying motion over 5 s without a pause control).
9. **iOS 3D:** `preserve-3d` is flattened by `overflow` (other than visible/clip), `opacity < 1`, `filter`, `clip-path`, `mask`, `mix-blend-mode`, `isolation`, `contain: paint` on the same element. Build layers at final size and scale up from below 1 (scaling up a small raster blurs text). **Use screenshots, not iframes, inside the transformed zoom and phone stages**; the real sample stays one tap away.
10. **Hosting:** Vercel's Hobby plan forbids advertising a service; the BlacklineStudios team's plan is unverified. Unchanged for this build; it is Ethan's open question 2 in the growth plan.

## 14. Ethan's feedback on the work in progress (20:07, watching the local preview). Owners: effects, home. The integrator opens findings for these; the fix pass closes them.
1. **The background must change over the page, not stay one effect.** Ethan: "instead of it being that same kind of slime effect the entire time, change that up." Design it as 3-4 distinct movements tied to scroll depth that blend into each other (for example: contour lines at the top → a sparser grain or dotted grid through the build section → long slow waves or a woven texture through What you get and the samples → a quiet, nearly still field near the contact CTAs). Let the colour wash drift with depth as well (Ethan: "if you want to change the colour the more you scroll down, you can do that"): keep every text/background pair at AA contrast and keep the whole thing scroll- and pointer-driven (no autoplaying motion). Effects owner decides the exact movements; the acceptance check is that a visitor who scrolls the whole page sees at least three visibly different background characters and a colour shift, in both colour schemes, with the reduced-motion fallback unchanged.
2. **Zoom in a touch more.** Ethan likes the zoom into the website. Make the zoomed frame a little bigger and the zoom go a tiny bit further ("just a tiny bit, not a lot"): on desktop the frame at full zoom should reach about 92-94% of the viewport width (it is narrower now), and the scale travel from the resting size to full zoom should increase by roughly 8-10%. Keep the frame inside the safe area on phones and keep the captions readable at every stage.
3. Everything else he saw at this point is fine. "Do whatever you think is necessary and unique."
