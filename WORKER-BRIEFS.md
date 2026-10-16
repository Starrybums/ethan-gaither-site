# Portfolio v3 — worker briefs

Written by the architect (Opus) on 2026-10-15, after the skeleton commit on branch `v3`. Read `BRIEF-v3.md` in full first (especially §2a, §3, §4, §5, §7 and §13), then the shared rules below, then your own section. Where this file and `BRIEF-v3.md` differ, this file wins for file ownership and contracts; `BRIEF-v3.md` wins for what the site must say and do.

Folder: `/Users/star/Desktop/Freelancing/projects/portfolio` (git repo, branch `v3`; `main` is the live v2 and nobody touches it).

---

## 0. Shared rules (every worker)

**Hard rules**
- Plain HTML, CSS, JavaScript. No build step, no npm packages in the site, no framework, no third-party scripts, no runtime requests to any other host (fonts included). Links to other sites are fine; requests are not.
- Every effect has a `prefers-reduced-motion` fallback, and the content reads fully without JavaScript.
- Never write "Logarithms" or "LLC". The public name is **Ethan Gaither**.
- No testimonials, reviews, star ratings, client logos, "trusted by", invented clients, invented metrics, ranking promises, reply-time promises, or "coming soon". No prices for Ethan's services: where payment comes up write "fixed price, agreed before I start, plus WA sales tax".
- Samples are fictional, labelled, `noindex`, with `555-01xx` phone numbers.
- Load the `human-voice` skill (Skill tool) before writing any visible text. Plain, short, specific. Contractions. No agency filler.
- Touch only the files your section lists. Need a change in a file you don't own? Put it in your report under `needs_from_others` (file, exact change, why). Do not edit it.
- Do not run git commands (the integrator commits). Do not sign up for anything or send anything.
- At most 2 attempts per blocker, then report it.

**Self-check before you report** (report only checks you actually ran)
1. Serve the folder on your port: `python3 -m http.server <port> --directory /Users/star/Desktop/Freelancing/projects/portfolio` (run it in the background).
2. Screenshot your pages with headless Chrome at 1440×900 and look at them with the Read tool:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --hide-scrollbars --virtual-time-budget=3000 --window-size=1440,900 --screenshot=<file>.png http://localhost:<port>/<path>`
   **Headless Chrome's window has a minimum width above 390, so a 390 screenshot from the command line is wrong** (it lays out wider and crops). For phone width use the chrome-devtools MCP tools (load them with ToolSearch: `new_page`, `emulate` with `viewport: "390x844x2,mobile,touch"`, `take_screenshot`, `evaluate_script`, `list_console_messages`). Also check light and dark (`emulate` → `colorScheme`).
3. Check: no console errors, no horizontal overflow at 390 (`document.documentElement.scrollWidth - innerWidth === 0`), every network request is same-origin (`performance.getEntriesByType('resource')`).
4. Put screenshots in `audit/v3/<your-key>/` (gitignored). Kill your server when done.
5. Grep your files for the forbidden words above.

**Report** (raw JSON, no prose): `{ "key": "...", "files_changed": [...], "checks_run": [...], "screenshots": [...], "needs_from_others": [...], "open_issues": [...], "decisions_for_ethan": [...] }`

---

## 1. What the skeleton gives you (read, don't edit)

| File | What |
|---|---|
| `styles/tokens.css` | Palette (light, dark, `data-theme` override), type scale, space, motion tokens (`--dur-1..5`, `--ease*`, `--stagger`, `--rise`, `--motion`), z-layers (`--z-*`), glass tokens, effect colours (`--fx-*`) |
| `styles/base.css` | Self-hosted `@font-face` (Fraunces roman+italic, Inter Tight, Instrument Serif roman+italic, Space Grotesk), size-adjusted fallbacks, reset, links, focus, `.skip`, `.sr-only`, headings, `.eyebrow`, `.lede`, `.measure`, `.muted`, `.small`, `.serif-line`, `.label`, `.ticks` |
| `styles/shell.css` | Background layer `.bg`, header, footer, `.wrap`, `.stack`, `.cluster`, `.actions`, `.grid--2/3`, `.section`, `.section--flush/--tight`, `.split` + `.section-head`/`.section-body`, `.page-hero`, `.sample-grid`/`.sample-card`, reveal states |
| `styles/buttons.css` + `js/buttons.js` | The button catalogue (§3 below) |
| `styles/motion.css` | Keyframes (`fx-fade-in`, `fx-rise-in`, `fx-blur-in`, `fx-wobble`, `fx-draw`, `fx-pop`), `.fx-in`, `.fx-in-blur`, `.u-delay-1..6`, cross-document view transitions, the global reduced-motion switch |
| `js/config.js` | `SITE` (ES module, also `window.SITE`): name, location, email, siteUrl, serviceAreas, links, `bookingUrl`, `certifications`, `samples`, `tools` |
| `js/shell.js` | Applies config, nav `aria-current` + sliding underline, reveals, copy-email, config-driven blocks, buttons, lazy effects loader |
| `fonts/` | Six latin woff2 files + `LICENSES.md` |
| `api/README.md` | The `/api/contact` JSON contract |

Fonts: `--serif` (Fraunces), `--sans` (Inter Tight). `--serif-2` (Instrument Serif) and `--grotesk` (Space Grotesk) exist for the home type morph only. Only Fraunces roman and Inter Tight are preloaded. Fraunces italic (82 KB) loads the moment any italic Fraunces text renders, so use italic sparingly above the fold.

### 1.1 Shell markup (every portfolio page; already in each page file)
```
<body data-page="home|about|services|samples|start|call|404">
<a class="skip" href="#main">Skip to content</a>
<svg class="sprite">  #fx-glass filter, #i-arrow, #i-external, #i-check  </svg>
<div class="bg" aria-hidden="true"><canvas class="bg-canvas" id="bg-canvas" data-intensity="full|low"></canvas></div>
<header class="site-header"> brand · nav (Home, Services, Samples, About) · CTAs (Start a project = ink, Book a free call = draw) </header>
<main id="main" tabindex="-1">
<!-- WORKER: build from here ... -->   your content   <!-- WORKER: end -->
</main>
<footer class="site-footer"> name, location, all links, email + Copy email (magnetic), "Built by hand. No tracking." </footer>
```
Page owners may edit: everything between the two `WORKER` comments, and in `<head>` only the page-script slot comment (replace it with your `<script type="module">`/`<link>` lines) and preloads for their own assets. The `<title>`, description, canonical, Open Graph, robots and JSON-LD are the architect's: ask for changes in `needs_from_others`. Use root-absolute paths (`/styles/...`, `/js/...`, `/assets/...`).

The page backgrounds must stay transparent (no `background` on `main` or full-width sections), so the fixed `.bg` layer shows through. Cards and panels may have their own surface (`--paper`, `--paper-2`).

### 1.2 Reveals (shell.js + shell.css)
- `data-reveal` on an element: it fades and rises in once on entry. Variants `data-reveal="fade"` (no rise), `data-reveal="blur"`.
- `data-reveal-stagger` on a parent: its direct children reveal one after another (`--i` set by shell.js; you may set `style="--i:n"` yourself).
- Hidden only when `html.js.motion-ok`; a CSS failsafe shows everything after 4 s if shell.js never starts. Nothing is hidden without JS or under reduced motion.
- `.fx-in` / `.fx-in-blur` (+ `style="--i:n"` or `.u-delay-n`) for one-shot entrances on load, above the fold.
- **Glass buttons must not sit inside an element that fades** (`opacity < 1`, `filter` or `mask` on an ancestor makes it the backdrop root and the blur disappears). Put `data-reveal`/`.fx-in` on the glass button itself, not on its wrapper.

### 1.3 Buttons (styles/buttons.css + js/buttons.js)
Every button is a real `<a>` or `<button>` with class `btn`; add `btn--solid` for the ink fill, `btn--sm` for small, `btn--block` for full width. Add one technique with `data-fx`:

| `data-fx` | Behaviour | Used by the shell |
|---|---|---|
| `glass` | Frosted translucent pill, highlight follows the pointer, wobble on press; Chromium also refracts the backdrop through `#fx-glass` | home hero (placeholder) |
| `press3d` | Tilts toward the pointer over a layered depth edge, pushes down on press | home hero (placeholder) |
| `magnetic` | Drifts toward the pointer within about 48 px, springs back | footer "Copy email", "Pick a time" |
| `ink` | Fill floods in from the edge the pointer entered, drains toward the edge it left | header "Start a project", 404 |
| `draw` | An accent line draws itself around the button on hover and on keyboard focus | header "Book a free call", 404 |

Each CTA on a page should use a different technique where two sit side by side. Pointer parts run only on `(hover: hover) and (pointer: fine)` and never under reduced motion (colour change only). Touch gets `.is-pressed`. Buttons added after load: `import { initButtons } from '/js/buttons.js'; initButtons(container)`.

### 1.4 Config-driven blocks (shell.js)
| Markup | Behaviour |
|---|---|
| `[data-site="name|location|email|…"]` | text replaced from `SITE` |
| `a[data-site-mailto]` | `href="mailto:<SITE.email>"` |
| `a[data-site-link="blackline"]` | `href` from `SITE.links` |
| `<ul class="sample-grid" data-samples-grid [data-limit="3"]>` | children replaced by cards for `SITE.samples` with `ready: true`, same markup as the static fallback (see the comment in `styles/shell.css`). Keep a static `<li>` list inside for no-JS |
| `<section data-certs hidden> … <ul data-certs-list></ul> … </section>` | removed while `SITE.certifications` is empty; filled and shown otherwise |
| `[data-booking] hidden` (an `<a>` or a wrapper with one `<a>`) | shown with `href = SITE.bookingUrl` when set; stays hidden while empty |
| `[data-promise] hidden` | stays hidden (`promiseReply` is false) |
| `[data-copy-scope]` containing `a[data-site-mailto]`, `button[data-copy-email] hidden`, `[data-copy-note]` | copy-email button |

---

## 2. Effects contract

### 2.1 Lazy loading (shell.js, already built)
After `load` and the first contentful paint (a `PerformanceObserver` on `paint`, with a 3 s fallback timer; added 2026-10-16 so the effects modules never sit on the critical path of FCP/LCP), on `requestIdleCallback` (timeout 2.5 s; a 1.2 s timer where it does not exist, i.e. iOS Safari), or at once on the first `scroll`/`pointermove`, whichever comes first, shell.js does:
```js
const m = await import('/js/background.js'); const bg = m.init(document.getElementById('bg-canvas'), opts);
const s = await import('/js/scene3d.js');   document.querySelectorAll('[data-scene3d]').forEach(el => s.init(el, opts));
// opts = { tokens: { ink, paper, accent, warm, alpha, dark }, reducedMotion: false, intensity: 'full' | 'low' }
```
It does not load either module under `prefers-reduced-motion: reduce` or `navigator.connection.saveData` (Chromium only). If the visitor switches reduced motion on mid-visit it calls `destroy()` on every controller; on a colour-scheme change it calls `update({ tokens })`. A module that throws leaves the static fallback in place.

### 2.2 `js/background.js`
```js
export function init(canvasEl, { tokens, reducedMotion, intensity }) → { pause(), resume(), destroy(), update({ tokens }) }
```
- `canvasEl` is `#bg-canvas`, fixed full-viewport behind everything (`z-index: var(--z-bg)`), inside `.bg`, which already paints a static layered gradient (the fallback).
- Add `.is-live` to `canvasEl.parentElement` after the first frame is drawn (the canvas fades in over the gradient); remove it in `destroy()`.
- Inputs it reads itself: `scroll` (passive; page progress 0..1 and velocity) and `resize` (debounced). **No pointer input** (removed 2026-10-16, BRIEF-v3 §15.3: Ethan found the field forming around the mouse distracting). Draw in response to scroll with easing and **stop the rAF loop when the eased values settle**: no ambient motion (WCAG 2.2.2: nothing auto-moves for more than 5 s).
- `intensity: 'full'` on the home page, `'low'` on inner pages (fewer marks, lower alpha, half the scroll-speed response).
- Four movements tied to scroll depth with a colour drift (BRIEF-v3 §14.1), unchanged.

### 2.2b (removed 2026-10-16 14:44) the hero object
Ethan removed it: "get rid of that bubble idea, it doesn't work on iPhone." `js/orb.js` and `styles/orb.css` are deleted, the hook and head link are out of `index.html`, and `shell.js` no longer loads it. Kept here as history only; nothing below is live.

#### Former contract: `js/orb.js` + `styles/orb.css`
```js
export function init(el, { tokens, reducedMotion }) → { pause(), resume(), destroy(), update({ tokens }) }
```
- `el` is each `[data-orb]` element. Hook in the home hero, first child of `.hero > .wrap`: `<div class="orb" data-orb aria-hidden="true"><span class="orb__still"></span></div>`, plus `<link rel="stylesheet" href="/styles/orb.css">` in the head after `effects.css`. shell.js lazy-loads `orb.js` with the other effects (same skips: reduced motion, save-data; the module itself returns quietly without WebGL).
- `.orb__still` is the static CSS sphere (layered gradients, inset rims, a contact shadow on `.orb::before`): the finished look without JavaScript, without WebGL and under reduced motion. The module appends `<canvas class="orb__canvas">` and adds `.is-live` after its first frame; the canvas fades in over the still sphere.
- Placement: 900 px and wider, absolute, right of the headline, vertically centred on the hero text (never over a letter); narrower, in the flow above the eyebrow, right-aligned, 132-220 px. The box size is fixed by CSS, so nothing shifts when the canvas arrives. Not an LCP candidate.
- Motion: scroll only. Rotation, flow and ripple amplitude follow scroll progress over the first two screens; scroll speed adds a small wobble. Every value eases and the loop stops when settled, never later than 1.5 s after the last scroll. No idle animation, no pointer input.
- WebGL 1, displaced UV sphere (88×60) in the vertex shader, one draw call. DPR cap 2. Paused off screen (IntersectionObserver) and on a hidden tab. Governor: average CPU over 4 ms → render scale 1 → 0.75 → 0.5 → freeze. Context loss → still sphere until restored. No layout reads in the loop. ≤ 20 KB unminified.
- Colours only from `tokens` (ink-and-paper palette, accent and warm as small highlights). No mark may cover the paper at more than `tokens.alpha` opacity, so text contrast never drops.
- DPR cap 2 (1.5 below 700 px wide). Pause on `visibilitychange` hidden; resume on visible. Drive time from the rAF timestamp.
- Frame-time governor: if the average CPU time of the last 30 frames goes over 4 ms, drop the render scale (1 → 0.75 → 0.5), then freeze on a static frame.
- WebGL: `{ alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false }`; on `webglcontextlost` or no context, fall back to 2D or give up quietly (gradient stays).
- No layout reads in the loop (cache sizes on resize). ≤ 25 KB unminified.
- `destroy()` removes every listener, cancels the loop, clears the canvas, removes `.is-live`.

### 2.3 `js/scene3d.js`
```js
export function init(sectionEl, { tokens, reducedMotion }) → { pause(), resume(), destroy(), update({ tokens }) }
```
- `sectionEl` is each `[data-scene3d]` element. Recommended build: CSS 3D (cheaper than WebGL and looks real with screenshots). The module only sets a progress custom property `--scene-p` (0..1 as the section crosses the viewport) on `sectionEl`, rAF-throttled, only while the section intersects (IntersectionObserver), and adds `.is-live`. All transforms live in `styles/effects.css`, keyed on `--scene-p`.
- Static state (no JS, reduced motion, before load): a still, angled composition defined in `styles/effects.css` without `.is-live`.
- iOS rules (BRIEF-v3 §13.9): no `overflow` other than visible/clip, `opacity < 1`, `filter`, `clip-path`, `mask`, `mix-blend-mode`, `isolation` or `contain: paint` on any element that carries `preserve-3d`. Layers are built at final size and scaled up from below 1, never up from a small raster. 2 to 4 layers. `will-change: transform` only while `.is-live` and intersecting.
- ≤ 25 KB unminified; background + scene3d ≤ 60 KB together.

### 2.4 Hook elements the home page must provide
| Hook | Markup (home worker writes it in `index.html`) |
|---|---|
| Background | already in the shell: `#bg-canvas` with `data-intensity="full"` |
| Effects stylesheet | `<link rel="stylesheet" href="/styles/effects.css">` in the head slot, after `home.css` |
| Type morph script | `<script type="module" src="/js/type-morph.js"></script>` in the head slot (it auto-inits) |
| The build | `<section id="build" data-morph-root aria-labelledby="build-title">` containing: one `<h2 id="build-title" data-morph-title>` (plain text, no child elements; the effects module clones it into aria-hidden face layers); a list of captions, each `<li data-morph-step data-frame="…" data-font="…">` with an `<h3>` and a `<p>`; the frame `<figure id="frame">` |
| 3D showcase | `<section id="showcase-3d" data-scene3d aria-labelledby="…">` containing `<div class="scene3d" data-scene3d-stage>` with 2 to 4 `<img data-layer="laptop|phone|card|…" width height alt>` (sample screenshots in `assets/img/samples/`), plus a short text column outside the stage |

`data-frame` values, in the order of BRIEF-v3 §2a: `zoom` (stage 1), `aside` (stage 2: one caption each for pages, the contact form, tap-to-call, the map, speed), `phone` (stage 3), `phone-in` (stage 4), `review` (stage 5). `data-font` values: `fraunces`, `instrument`, `grotesk`, `inter`, in any order the home worker picks (suggested: zoom fraunces, the five aside captions instrument/grotesk/inter/fraunces/grotesk, phone instrument, phone-in grotesk, review inter).

### 2.5 Type-morph contract (`js/type-morph.js` + `styles/effects.css`, owned by effects)
**Stage driver (exists today as the skeleton stub; keep it exactly):** captions are `[data-morph-step]` inside `[data-morph-root]`. The active caption is the last one at least half inside the reading band (viewport minus 15% top and bottom). On change the root gets `data-stage="<1-based index>"`, `data-frame="<caption's data-frame>"`, `data-font="<caption's data-font>"`; the active caption gets `.is-active`; the root dispatches `CustomEvent('morph:stage', { detail: { index, frame, font } })`. Before the first caption: `data-stage="0"`, `data-frame="intro"`. Reduced motion or no IntersectionObserver: **no attribute is set**, and "no `data-stage`" means the finished, static state for both the frame and the type. Scrolling back up moves back through the stages. Scrolling back above the first caption returns the root to `data-stage="0"` / `data-frame="intro"`, and a jump past the build (for example a skip link or an anchor below it) sets the last stage (integration note, 2026-10-15).

**The morph (effects builds):**
1. Title: the module clones `[data-morph-title]`'s text into four stacked spans, one per family (`--serif`, `--serif-2`, `--grotesk`, `--sans`), aria-hidden except the original, all in one fixed-height box. The visible face crossfades (opacity only, compositor) to the root's `data-font`. Families are never swapped on a line of running text.
2. Captions: each caption's `<h3>` morphs along variable axes as it crosses the reading band: Fraunces `opsz` and `wght`, Inter Tight and Space Grotesk `wght` (Instrument Serif has no axes: it only fades in). Use `font-weight` / `font-optical-sizing`/`font-variation-settings` with the same axis list in every keyframe. Fixed font-size and a fixed `min-height` box so reflow stays inside the caption.
3. Driven by CSS scroll-driven animations (`animation-timeline: view()` on each caption) inside `@supports (animation-timeline: view())` **and** `@media (prefers-reduced-motion: no-preference)`. Where unsupported (`!CSS.supports('animation-timeline: view()')`), an IntersectionObserver + rAF fallback writes `--morph-p` (0..1) on each caption while it intersects, and the same CSS reads it. No polyfill.
4. Final state (no JS, reduced motion, unsupported and fallback off): the title in Fraunces, each caption's `<h3>` in its own `data-font` family at rest axes. Readable, static.
5. Measure: no long tasks over 50 ms while scrubbing the build on 4× CPU throttle.

The home worker owns everything about the frame (`#frame`) and its choreography in `styles/pages/home.css`, keyed on `#build[data-frame="…"]` and `#build[data-stage]`. Effects owns everything about the type and the 3D.

---

## 3. Worker sections

Ports: effects 8801, home 8802, pages 8803, api 8804, sample-casa-ortega 8805, sample-north-fork-apparel 8806, sample-ridgeline-goods 8807, sample-summit-plumbing 8808, sample-tempo-fitness 8809.

### 3.1 `effects` (Opus) — port 8801
**Goal.** The three motion modules a prospect will remember: the scroll-reactive background, the type morph in the build section, and the 3D showcase. Business purpose: these are the "this is what your site could do" moments; they must look expensive and cost almost nothing.
**Owns.** `js/background.js`, `js/scene3d.js`, `js/type-morph.js`, `styles/effects.css` (all four are skeleton stubs: replace them), and a test page `audit/v3/effects/harness.html` (gitignored) if you need one before the home page lands.
**Reads.** `BRIEF-v3.md` §2a, §3.1, §3.3, §3.5, §7, §13 (all of it); `audit/v3/RESEARCH-techniques-2026-10-15.md` §3, §5, §6, §7; §1 and §2 of this file; `styles/tokens.css`; `js/shell.js` (`lazyEffects`, `readTokens`).
**Provides.** The contract in §2. Do not change its shape; if it must change, report it and wait.
**Consumes.** The hook markup in §2.4 (from the home worker). Until it lands, build against your harness page with the same hooks.
**Acceptance.**
- Background: no frame over 4 ms CPU at 4× throttle in a DevTools trace of scroll on the home page; stops drawing when input stops; pauses on hidden tab; `.is-live` set; destroy works; light and dark both look like ink on paper; text contrast unchanged (measure a caption's background under the densest marks).
- Type morph: scrubs forward and back; stage attributes exactly as the stub sets them; the four families visible across the stages; reduced motion and no-JS show the final state; works with `animation-timeline` disabled (test by forcing the fallback).
- 3D: rotates and separates with scroll; static angled composition without JS and under reduced motion; no layout shift; no blurry upscaled text on a phone (390 at DPR 2).
- Sizes: background ≤ 25 KB, scene3d ≤ 25 KB, type-morph ≤ 12 KB, unminified.
- Console clean; no external requests.
**Stop.** Two failed attempts at one blocker: report. Do not edit `index.html` or `home.css`: list what you need from the home worker.

### 3.2 `home` (Sonnet) — port 8802
**Goal.** The home page in BRIEF-v3 §2 and the §2a choreography: hero load sequence, the build (zoom, slide aside and explain, pull back to a phone, into the phone, review), what you get, proof, samples teaser, 3D showcase section markup, about teaser, the two CTAs. Business purpose: a small-business owner on a phone understands in one scroll what Ethan builds and that he builds it well.
**Owns.** `index.html` (worker region and head slot only), `styles/pages/home.css`, optional `js/home.js` (hero sequence or frame helpers; no scroll-jacking), `assets/img/samples/` (screenshots of the samples as webp, desktop 1200 wide and phone 390 wide at DPR 2, for the frame and the 3D stage).
**Reads.** `BRIEF-v3.md` §1, §2, §2a, §3, §5, §7, §13.9; §0-§2 of this file; v2's build section, copied read-only to `audit/v3/v2-reference/` (`index.html`, `styles.css`, `motion.js`), for the frame markup and the stage-4 checks; `samples/hollow-oak/`.
**Contract.** Provide the hooks in §2.4 exactly. Key the frame's states on `#build[data-frame]` from the stage driver; "no `data-stage`" is the finished static state (reduced motion and no JS). The frame shows **screenshots, not an iframe**, inside the zoom and phone stages (BRIEF-v3 §13.9); the real sample is one tap away. Samples teaser: `<ul class="sample-grid" data-samples-grid data-limit="3">` with the Hollow Oak card as the static fallback. Hero: per-word blur-to-sharp sweep starting at "I" (`fx-blur-in`, about 0.9 s total), then the sub-line, then the two buttons; reduced motion: a plain 200 ms fade of the whole hero. Hero CTAs: glass and press3d (glass on the button itself, see §1.2).
**Content.** What you get: ownership (domain, hosting account, code and logins in their name), SEO and listings setup (titles, descriptions, schema, sitemap, Search Console, help setting up a Google Business Profile; no ranking promises), speed checks, handover; "fixed price, agreed before I start, plus WA sales tax". Proof: "Things you can check yourself": this site's own Lighthouse numbers only after Fable measures them (leave a clearly marked TODO for the integrator, not a number), the sample sites, Ethan's own agency site labelled "Blackline work". Short About teaser → `/about/`.
**Acceptance.** All §2a stages work forward and back at 1440, 768 and 390; static complete page under reduced motion and without JS; no horizontal overflow at 390; LCP element is the hero text, not an image; no CLS from the hero sweep (reserve space); keyboard order sensible; one `h1`; every image has width/height and alt; Lighthouse accessibility 100 on your local run if you can run it (chrome-devtools `lighthouse_audit`), otherwise say it was not run.
**Stop.** Do not build the type morph, background or 3D logic: that is `effects`. Do not edit shared files.

### 3.3 `pages` (Sonnet) — port 8803
**Goal.** About, Services, Samples index, Start a project, Book a call and the 404, plus the form script. Business purpose: answer every question a careful owner has before they write, and make writing easy.
**Owns.** `about/index.html`, `services/index.html`, `samples/index.html`, `start-a-project/index.html`, `book-a-call/index.html`, `404.html` (worker regions and head slots only), `styles/pages/about.css`, `styles/pages/services.css`, `styles/pages/samples.css`, `styles/pages/contact.css` (both forms), optional `styles/pages/404.css` (add its link in `404.html`), `js/form.js`.
**Reads.** `BRIEF-v3.md` §2, §5, §6, §7; §0-§1 of this file; `api/README.md` (the form contract, in full); `js/config.js`; the About section of v2's page (`audit/v3/v2-reference/index.html`) for the portrait markup (`assets/img/portrait-square-*`).
**Content.** About: portrait; who he is (Battle Ground; builds websites by hand with AI tooling; previously built his own agency site, a booking system and spec builds, one line labelled "Blackline work"); how he works in 4 steps; tools from `SITE.tools` (true list, Figma left off until Ethan confirms); values (ownership, plain language, speed); service area (`SITE.serviceAreas`); the certifications block exactly as in the shell. Do not mention the day job or college. Services: the long page per BRIEF-v3 §5 (what is built, process step by step, what the client supplies, timeline in plain words, included, not included, basic SEO and listings setup explained honestly, "You own everything" in practice, the fix window, the care plan without a price, an 8-10 question FAQ in plain HTML `<details>`). Samples index: keep the shell's grid; add the static `<li>` cards for every sample with `ready: true` in config at the time you finish (Hollow Oak today); a line that every sample is a fictional business. Forms: per `api/README.md`; `type=project` on Start a project, `type=call` on Book a call with the `times` field and the `[data-booking]` button kept as in the shell. Success panel text: "Sent. I read these myself and reply from my own email." 404: keep it short and useful.
**Contract.** `js/form.js` posts exactly the JSON in `api/README.md` to `/api/contact` and handles every status in its table; with the stub in place every submit gets 503, so the mailto fallback is what you test end to end. Form focus glow and the success state animation use tokens and `fx-pop`/`fx-draw`, and settle instantly under reduced motion.
**Acceptance.** Without JS: forms submit as mailto, all content visible, nav works. With JS: inline errors with `aria-describedby`, focus moves to the first bad field, live region announces success; 503 opens the prefilled mailto. Keyboard pass on both forms. 390, 768, 1440, light and dark, no overflow. JSON-LD and titles untouched.
**Stop.** Do not edit `api/`, shared CSS/JS or `js/config.js`.

### 3.4 `api` (Sonnet) — port 8804
**Goal.** `POST /api/contact` sends Ethan an email the moment someone submits, with a reply-to so one tap answers it. Business purpose: no lead is lost to a broken form, and spam can't burn the 100-a-day Resend allowance.
**Owns.** `api/contact.mjs` (replace the stub), the "Contact form and Resend" section of `README.md` (add it as a new section at the end; do not edit the rest of README).
**Reads.** `BRIEF-v3.md` §6, §13.1-§13.2; `api/README.md` (the contract: implement it exactly); `audit/v3/RESEARCH-techniques-2026-10-15.md` §1-§2.
**Contract.** Implement `api/README.md` to the letter: `export default { async fetch(request) { … } }` (Web Request/Response, ESM, no dependencies, no `package.json`). Order of checks, statuses, bodies, field messages, rate limit, honeypot, `User-Agent` header, 8 s timeout via `AbortController`, never log the body or the email address.
**Acceptance.** A Node test script in `audit/v3/api/test-contact.mjs` (gitignored) that imports the handler and mocks `globalThis.fetch`, covering every row of the responses table plus the honeypot and the sixth request in 10 minutes; all pass on `node` 22+. README section: the four env var names, the Resend test-sender rule, Secret vs Config in Vercel, the WAF rule suggestion, and the exact preview-deployment curl test from `api/README.md`, with the Resend docs URLs cited.
**Stop.** No real Resend calls, no account creation, no keys anywhere. Do not touch the front end.

### 3.5 Shared rules for every sample worker
- Own exactly `samples/<slug>/index.html`, `samples/<slug>/<slug>.css`, optional `samples/<slug>/<slug>.js`, optional more pages inside `samples/<slug>/` (for example `product/index.html`), and art files inside `samples/<slug>/`. Nothing else.
- Self-contained: do **not** load the portfolio's CSS or JS. You may use the portfolio's font files with your own `@font-face` (`src: url("../../fonts/<file>.woff2")`, add `unicode-range` and `font-display: swap`) or system font stacks. No other fonts, no runtime external requests.
- In `<head>`: `<meta name="robots" content="noindex">`, a title like "Casa Ortega — a sample site", a description that says it's a sample for a fictional business, `color-scheme` meta, your own favicon as an inline SVG data URI (not Ethan's monogram).
- A banner as the first thing in `<body>` after the skip link, and the same sentence in the footer: "Sample site for a fictional business, built as a demonstration by Ethan Gaither." with a link `<a href="../">Back to samples</a>` (`../../` from a deeper page). Copy the `.banner` pattern from `samples/hollow-oak/`.
- Fictional everything: name, address (an obviously made-up street, marked as made up on the page), phone `(360) 555-01xx` (your number is in your section), email `hello@<slug>.example`. Before you finish, do one web search for "<business name> Clark County WA"; if a real business with that name operates nearby, pick another name, keep the slug, and report the new name.
- No stock photos and no real photos. Illustrations, SVG, CSS art, patterns, or generated placeholders that read as illustrations.
- No reviews, testimonials, ratings, awards, founding years, customer counts. Made-up prices only where the business would show them, marked as made up on the page.
- Forms are `mailto:hello@<slug>.example` forms with the same small readable-body script as Hollow Oak, and a note that a real build sends through a form service.
- Mobile first. Tap-to-call where a business would want it. `<details>` nav on phones so it works without JS. Visible focus, skip link, one `h1`, landmarks, labels on every field.
- Gates: Lighthouse accessibility 100, best practices 100, performance ≥ 90 on mobile (run `lighthouse_audit` from chrome-devtools if available; otherwise say not run). No overflow at 390. Light-only is fine.
- Report your final display name, accent colour (for the gallery card) and a one-line blurb in `needs_from_others` for `js/config.js` (the integrator flips `ready: true`). Also report a 1200-wide desktop and a 390-wide phone screenshot path for the home page's frame and 3D stage.
- Design so the gallery shows range: your direction below is the brief; stay far from the portfolio's paper-and-ink look and from the other samples.

### 3.6 `sample-casa-ortega` (Sonnet) — port 8805 — phone (360) 555-0117
**Business.** Casa Ortega, a family Mexican restaurant (name is a placeholder; keep it clearly fictional).
**Direction.** Bold colour, festive, no photos. Palette: chile red `#B3261E`, deep teal `#0F4C4C`, marigold `#F2A900`, masa cream `#FFF6E5`, ink `#2A1A12` (check AA on every pair you use). Type: Fraunces at heavy weight with high `SOFT` (`font-variation-settings: "SOFT" 100, "WONK" 1`, wght 800) for headings, so it reads round and warm, nothing like the portfolio's light Fraunces; system sans for body. Pattern: papel picado bands made in CSS/SVG along section edges, and a tile pattern (CSS gradients) behind the menu header. Layout: hero with a big two-line name and "Call to order" button; a sticky "Call to order" bar on phones; the menu in sections (tacos, platos, sides, drinks) with an in-page section nav; hours; a catering request form; map link. Optional: a Spanish/English toggle for the menu headings (JS, with English as the no-JS default).
**Must show.** Menu with sections, hours, order by phone, catering form, map link.

### 3.7 `sample-north-fork-apparel` (Sonnet) — port 8806 — phone (360) 555-0163
**Business.** North Fork Apparel, a small clothing label.
**Direction.** Editorial, large type, grid. Palette: bone `#F4F2EE`, charcoal `#1C1C1A`, rust `#9C3D1A`, moss `#5B6B4E`. Type: Instrument Serif at very large sizes (italic for the label name) with tight tracking, and Space Grotesk or system sans in small uppercase for labels and prices. Layout: an asymmetric 12-column grid with oversized headlines breaking the grid; lookbook as a mosaic of flat SVG garment illustrations (a jacket, a tee, a flannel, a cap) on colour blocks, each with a caption; story section set like a magazine column with a drop cap; sizing table (accessible `<table>`); stockists list (made-up shops, marked as made up); an email signup that only shows a "Demo only: nothing was sent" message.
**Must show.** Lookbook grid, story, sizing, stockists, email signup (demo only).

### 3.8 `sample-ridgeline-goods` (Sonnet) — port 8807 — phone (360) 555-0128
**Business.** Ridgeline Goods, an online store for outdoor kitchen and camp goods.
**Direction.** Product-first, clean, quiet. Palette: white `#FFFFFF`, sand `#EFEBE3`, slate `#22303C`, pine `#2F5D50`, a single signal colour for the cart badge. Type: Space Grotesk for UI and prices, system sans for body. Product art: consistent SVG illustrations on sand tiles (an enamel mug, a bottle, a pack, a stove, a lantern, a blanket: 8 to 12 products). Layout: a header with a cart button and count; filters (category and price range as checkboxes; with no JS every product shows); a product grid; a product page (`samples/ridgeline-goods/product/index.html?id=…` rendered by JS with a no-JS list fallback, or one static page per product, your choice); a working demo cart in `localStorage` (add, change quantity, remove, subtotal) in a drawer or a cart page. A "Demo store: nothing is for sale and there is no checkout" notice next to the cart and on the cart itself; the checkout button explains that instead of charging.
**Must show.** Product grid, filters, product page, working demo cart, demo-store notice.

### 3.9 `sample-summit-plumbing` (Sonnet) — port 8808 — phone (360) 555-0186
**Business.** Summit Plumbing, a licensed plumber (Ethan's outreach target niche, so make it the one a tradesperson would want).
**Direction.** Trust, clarity, blue-collar. Palette: navy `#12305A`, safety orange `#E35205` used only as a fill with navy or white text that passes AA, concrete `#EEF1F4`, white, and a deep ink for text. Type: a heavy system sans stack for headings (`"Arial Black", "Helvetica Neue", system-ui, sans-serif` at 800-900) and system sans for body; big, plain, legible. Layout: tap-to-call everywhere (header, hero, after each service, a sticky bottom bar on phones); services as cards with simple SVG icons (drain, water heater, leak, repipe, fixtures); "Emergency? Call now" band; service area as a list of towns with a simple abstract SVG (not a real map); "WA licence # on file" placeholder and "Licensed, bonded and insured" only as clearly fictional sample text; a request-a-quote form (name, phone, address, what's wrong, when). Reviews are omitted entirely: no section, no stars.
**Must show.** Services, service area, licence placeholder "WA licence # on file", tap-to-call everywhere, request-a-quote form, no reviews.

### 3.10 `sample-tempo-fitness` (Sonnet, optional sixth) — port 8809 — phone (360) 555-0151
**Business.** Tempo Fitness, a small group-training studio.
**Direction.** Energetic. Palette: near-black `#0E0E10`, electric lime `#C6F432`, hot pink `#FF3D7F`, off-white `#F5F5F0` (lime and pink as fills behind dark text, or as text on black, checked for AA). Type: Space Grotesk at 700 with tight tracking and occasional italic skew (`transform: skewX(-8deg)` on display words only); system sans for body. Layout: diagonal section edges (`clip-path`), a big rhythmic hero ("Train on the beat" or your own line), a weekly class schedule as a real `<table>` that becomes stacked day cards on phones, class types, memberships without prices (or "from $—" placeholders marked as made up), coaches as illustrated avatars with made-up first names marked as fictional, a free-trial form. Motion: one CSS-only pulse on the hero accent that stops after 3 s, none under reduced motion.
**Must show.** Schedule table, memberships (no real prices), trial form.

---

## 4. Integration notes (architect / integrator)
- When a sample is accepted: set `ready: true` and its final name, accent and blurb in `js/config.js`, add its static `<li>` to `samples/index.html` (or ask the pages worker), and add its screenshots for the home frame and 3D stage.
- Before launch: test a real POST on the preview deployment (`api/README.md`); measure Lighthouse on the preview and put the numbers into the home Proof section; update `README.md` (v2 text is out of date) and the vault.
