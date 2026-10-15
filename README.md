# Portfolio v2

A single-page portfolio for Ethan Gaither, plus a complete sample site. Plain HTML, CSS and JavaScript. No framework, no build step, no analytics. The only external request is the Google Fonts stylesheet (and the font files it points to). The sample's map link is a normal link, not a request.

Direction: quiet, warm, exact. Warm paper theme with a dark scheme, Fraunces for display type, Inter Tight for text, one cobalt accent used for links, one rule and the focus ring.

v2 replaced the hero drawing and the work gallery with one idea: the page shows a small website being built as you scroll, then lets the visitor open a finished sample site. The page itself is the second proof.

## Run it locally

```
cd projects/portfolio
python3 -m http.server 8787
# open http://localhost:8787/        the portfolio
# open http://localhost:8787/sample/ the sample site
```

Any static file server works. Opening `index.html` straight from disk also works, except that `404.html` uses root-relative paths and is meant to be served by a host.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: header, hero, the build, what you get, proof, about, contact, footer |
| `styles.css` | Tokens (light, dark, `[data-theme]` override), layout, type, the build frame, motion |
| `motion.js` | Applies `site.config.js`, scroll reveals, nav `aria-current`, copy-email button, the build stages |
| `site.config.js` | Every brand-dependent string: name, location, email, title, description, site URL |
| `sample/index.html`, `sample/sample.css` | The sample site: Hollow Oak Coffee, a fictional coffee shop |
| `404.html` | Not-found page (noindex) |
| `robots.txt` | Allow all |
| `favicon.svg`, `og.svg`, `og.png` | EG monogram; the social preview (drawn source and its 1200 by 630 export) |
| `assets/img/` | The About portrait: `portrait-square-480.{webp,jpg}` and `portrait-square-960.{webp,jpg}` (the only files the page uses). Left over from v1 and not used: `blackline-home-*` (8 files), `engine-plate.svg`, `portrait-placeholder.svg`, `wafer-placeholder.svg`. Leave them out of the deploy. Deleting them needs Ethan's OK, so they are still on disk |
| `engine/ink-engine.js`, `demo/engine.html` | Ethan's animation engine and its demo. Kept on disk, not linked from the page. The demo's back links now point at `../#proof` (they pointed at a removed section) |
| `audit/` | Lighthouse JSON for v2, screenshots of every stage, and the v1 and review files |

## The build (`#build`)

Two columns from 900 px: four captions on the left, and a sticky browser frame on the right (`position: sticky; top: 96px`). On phones the frame sits sticky at the top, about 46vh, and the captions scroll under it.

An `IntersectionObserver` on the four caption blocks sets `data-stage="1".."4"` on `#frame`. The stage is the last caption that is at least half inside the reading band. CSS transitions do the rest. There is no scroll scrubbing and no animation-frame loop. The only listener besides the observers is a debounced `resize` that rebuilds the observer.

| Stage | Caption | What the frame shows |
|---|---|---|
| 1 Scope | We agree the pages, the content and the price before I start. | Address bar `staging.yourbusiness.com`. Grey outline blocks fade in one by one: header, hero, three cards, a form. Labels read Home, Services, Contact. |
| 2 Build | I build it by hand, mobile-first, and put it on a staging link you can open on your phone. | Each block cross-fades from outline to filled, with a 6 px rise, staggered 80 ms. A "Staging" tag shows in the address bar, which still reads `staging.yourbusiness.com`. |
| 3 Review | You review it on a phone. Two rounds of changes are included. | The browser narrows to a phone over 600 ms. The page reflows (cards stack, the nav collapses to a menu icon). A four-item checklist ticks in under it: phone, keyboard, reduced motion, form. |
| 4 Launch and handover | It goes live on your own domain and hosting account. You get the logins and the code. | Back to desktop. The address bar cross-fades from `staging.yourbusiness.com` to `yourbusiness.com` and gains a padlock and a "Live" tag, so the launch visibly gains the domain. One line under it: You own the domain, the hosting account and the code. |

How the frame works:

- The content inside the frame is real HTML and CSS: a condensed copy of the sample site's home page (header, hero, three cards, contact form), drawn on a 1200-unit layout and scaled with `transform: scale()`. The scale is worked out in CSS from the frame's width: `scale(tan(atan2(100cqw, 1200px)))`, so it needs no JavaScript and is right on first paint. The frame is a container (`container-type: inline-size`), and the page inside is a second container, so the phone layout is an ordinary `@container` query on the page's own width.
- The frame content is `aria-hidden="true"` with a one-sentence description (`#frame-desc`) for screen readers. The checklist and the ownership line sit outside the hidden part, so they are always readable. Nothing inside the hidden part can take focus.
- The stage is a set of custom properties (`--wire`, `--real`, `--phone`, `--live`, `--check`, `--owns`, `--dom`) set per `data-stage` value. The default, with no attribute, is the finished state (stage 4).
- **Reduced motion:** the inline script in `<head>` adds `anim` to `<html>` only when the visitor has not asked for reduced motion. Without `anim` there is no sticky frame, no stage changes and no dimmed captions: the frame shows stage 4 immediately and the captions are plain.
- **JavaScript off:** the same finished state, because the default CSS is stage 4 and `anim` is never added.
- Active caption: `is-active` darkens the caption and adds an ink rule. It uses colour, not opacity, so every state keeps its contrast.

To change the frame's content, edit the `.sp` block in `index.html` and its styles in `styles.css` (the `.sp-*` classes and the `--c-*` colours). Keep it in step with `sample/index.html`.

## The sample site (`sample/`)

A one-page site for **Hollow Oak Coffee**, a fictional coffee shop in Battle Ground, Washington. It is a self-initiated concept, built to show range and to show the build is real. Nothing on it is a claim about a real business.

- A banner at the top of every view says: "Sample site for a fictional business, built as a demonstration by Ethan Gaither. Back to portfolio". The same sentence is in the footer, with a second line saying the shop, menu, hours, prices and address are made up.
- Sections: header (Menu, Hours, Visit, Contact), hero, three short cards, menu (six items with prices, grouped Coffee and Food), hours and visit, about the shop, contact form, footer.
- No reviews, testimonials, awards, founding year or customer counts. The address is marked as made up next to the address and in the footer. "Get directions" is a link to a maps search for "Battle Ground, WA", with no coordinates.
- The contact form is a `mailto:` form addressed to `hello@hollowoak.example` (a reserved name that never resolves). A few lines of JavaScript fill the message in readably; without JavaScript it falls back to a plain mailto form. The page says that a real build would use a form service.
- Design: its own palette (cream, deep green, wood brown), Fraunces for headings and the system font for text, pill buttons, drawn SVG icons and a drawn hero illustration. No photos. It is light only, on purpose, so it matches the frame on the portfolio page. On phones the nav is a `<details>` menu, so it works without JavaScript.
- `<meta name="robots" content="noindex">` keeps it out of search. Do not also add it to `robots.txt`: a crawler that cannot fetch the page cannot see the noindex.

### Change the fictional shop's content

- Words, menu, hours, address: edit `sample/index.html`. Prices are plain text in the `.price` spans.
- Colours: the tokens at the top of `sample/sample.css` (`--bg`, `--panel`, `--accent` and so on).
- The hero illustration and the three icons are `<symbol>`s in the SVG sprite at the top of the page, coloured by `--il-*` variables.
- If you change the name, the hero lines or the three cards, make the same change in the frame on the portfolio page (see above).
- Keep the banner and the footer sentence. They are what keeps the page honest.

## Change the brand

Edit `site.config.js`. Then:

1. `index.html` and `404.html` ship with the same values written into the markup, so the page reads correctly with JavaScript off and for crawlers that do not run it. `motion.js` re-applies the config at load (visible text, links, `<title>`, description, Open Graph, JSON-LD, canonical). To make the static markup match as well, find and replace the old strings: `grep -rn "Ethan Gaither" --include=*.html --include=*.svg .`
2. `favicon.svg` and `og.svg` are drawn files. Edit them directly, then re-export `og.png` (below).

### Placeholders to confirm before the site goes public (marked [ETHAN])

- `email` in `site.config.js`: the default comes from the build brief. Confirm it.
- `siteUrl` in `site.config.js`: empty on purpose. While empty, no canonical link is written and `og:image` stays relative. Set it to the final address once the domain exists.
- Offer: the vault's pricing note had no approved price, so the page shows "Introductory pricing — ask me" with no number. Ethan should approve the five bullets.
- "Two rounds of changes are included" (Review caption) comes from the v2 brief. Confirm it matches what Ethan will actually offer.
- `promiseReply` is `false`. Turn it on only if Ethan will keep the promise.

## Deploy to any static host

Upload the contents of this folder (not the folder itself) so that `index.html` sits at the site root and `sample/` comes with it. Nothing needs building. Leave out `audit/`, `BRIEF.md`, `BRIEF-v2.md` and `README.md`: they are working files. `demo/` and `engine/` can stay out too, since nothing links to them. Also leave out the unused v1 images in `assets/img/`: `blackline-home-*` (8 files), `engine-plate.svg`, `portrait-placeholder.svg` and `wafer-placeholder.svg`. Only `portrait-square-480.*` and `portrait-square-960.*` are used.

- Netlify, Cloudflare Pages, GitHub Pages, Vercel (as a static project): no build command, output directory is the folder itself. Each serves a root `404.html` for missing pages; confirm once after the first deploy.
- Any web server or object storage with a website mode: upload the files, set the error document to `404.html`, and serve over HTTPS.
- Sub-folder hosting: `404.html` uses root-absolute paths on purpose (`/styles.css`, `/site.config.js`, `/favicon.svg` and `/`). On a sub-path host such as a GitHub Pages project site, prefix them with the sub-path. The sample uses relative paths and works anywhere.
- After the domain exists: set `siteUrl`, re-export the social image, and re-run the checks.

### Social preview image

`og.svg` is the drawn source (name, "websites for small businesses" and a small browser-frame glyph). `og.png` (1200 by 630) is the export the pages use, because Facebook, LinkedIn and X do not render SVG previews. After editing `og.svg`, open it in a browser at a 1200 by 630 viewport and screenshot it over `og.png`.

## Motion and accessibility

- The build: described above. Reduced motion and JavaScript off both show the finished state.
- Reveals: opacity and an 8 px rise, 500 ms, IntersectionObserver, with a failsafe so content is never lost to an effect. The About section does not use a reveal, so the portrait never depends on one. Without JavaScript, everything is visible.
- Links: underline grows from 1 px to 2 px on hover. Nothing loops or bounces.
- Skip link first in the DOM, one `h1`, landmarks, visible focus ring, `aria-current="location"` on the nav while scrolling, alt text on the portrait. The portrait is `loading="eager"`.
- Both colour schemes are tokens on `:root`. The OS setting is followed; set `data-theme="light"` or `data-theme="dark"` on `<html>` to force one. The frame's page is always light, because it is the sample site.
- Under `prefers-reduced-motion: reduce`, every animation and transition is switched off.

## Checks run on this build (2026-10-09)

Lighthouse 13.4.1, mobile, navigation mode, local server, via the chrome-devtools `lighthouse_audit` tool. Re-run after the fix pass; these rows supersede the first v2 run (`lighthouse-v2-index.json`, `lighthouse-v2-sample.json`, kept). That tool leaves the performance category out.

| Page | Accessibility | Best practices | SEO | JSON |
|---|---|---|---|---|
| `/` | 100 | 100 | 100 | `audit/lighthouse-v2-index-2.json` |
| `/sample/` | 100 | 100 | 63 (the only failed audit is `is-crawlable`) | `audit/lighthouse-v2-sample-2.json` |
| `/sample/` with the robots meta removed (temporary copy, since deleted) | 100 | 100 | 100 | `audit/lighthouse-v2-sample-indexable-check.json` |

- **Decision (Fable/Ethan, review 3): keep `noindex` on the sample.** A fictional shop with a placeholder address should stay out of search. The sample's SEO threshold is read as "90 or more, excluding `is-crawlable`", and the evidence is the row above: without the tag it scores 100. BRIEF-v2 §3 still says "SEO 90 or more" and has not been edited by this pass, so its owner needs to amend it.
- Cumulative layout shift on `/` measured 0.054 (the "good" line is 0.1); it is the only audit below 1 outside the SEO row. It comes from a late web-font swap and varies from run to run. The hero fallback fonts were re-measured for the new headline, with a separate face for its italic words.
- **No Lighthouse performance score exists for either page.** The tool has no performance category, `lighthouse` is not installed here, and running it through `npx` or on a deployed preview was not allowed in this pass. Run Lighthouse performance once on a deployed preview, or with an approved local run, and save the JSON to `audit/`. As a smoke test only, a trace of `/` (390 wide, 4x CPU slowdown, Slow 4G, local server, reload of a page already loaded once, so caches were warm) reported LCP 133 ms and CLS 0.00 (`audit/trace-v2-fixed-index-mobile-slow4g-cpu4x.json.gz`). That is not a Lighthouse score and the page does not quote it.
- The About portrait is 136 px on phones, 240 px from 640 px and 280 px from 900 px. `sizes` matches, so a phone loads `portrait-square-480.webp` (20.5 KB) instead of the 960w file (78.5 KB).
- Screenshots in `audit/`: `v2-1440-stage1..4.png`, `v2-390-stage2.png`, `v2-390-stage3.png`, `v2-sample-1440.png`, `v2-sample-390.png`, plus `v2-1440-hero.png`, `v2-1440-full.png`, `v2-1440-dark-stage2.png` and `v2-1440-nojs.png`.
- Fix-pass screenshots in `audit/`: `v2-fixed-1440.png` and `v2-fixed-390.png` (full page), `v2-fixed-1440-stage3.png`, `v2-fixed-1440-about.png`, `v2-fixed-1440-reduced-motion.png`, `v2-fixed-390-stage3.png` and `v2-fixed-sample-390.png`.
- The build advances through stages 1 to 4 at 1440, 768 and 390 (checked by scrolling and reading `data-stage`). With reduced motion (checked by overriding `matchMedia` before the page's scripts run) and with JavaScript off (checked on a script-free copy of the page, since deleted) the frame shows stage 4 and the captions are plain.
- No horizontal scroll: the portfolio at 390 and 768, the sample at 390. 16 px gutters at 390.
- The reduced-motion check does not exercise the CSS media query itself. It checks that the script and the CSS leave the page in its finished state.
- Not checked: Safari, Firefox, a real touch device, a screen reader, widths between 900 and 1100 px.

## Rules this site follows

Nothing on it is invented: no quotes, logos, numbers, years or results. The sample site is labelled as fictional on every view. The proof shown is this page, the sample site, and Ethan's own agency site.
