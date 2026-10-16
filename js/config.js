/* js/config.js — every brand-dependent value for the portfolio (replaces v2's site.config.js).
   An ES module. shell.js imports it; other modules can too:  import SITE from '/js/config.js';
   It also sets window.SITE for plain scripts.

   The pages ship with these values baked into their HTML (so they read correctly with JavaScript off and
   for crawlers). shell.js re-applies the text values at load: [data-site="key"] gets the text, [data-site-mailto]
   gets the mailto href, [data-site-link="key"] gets links[key]. Change a value here, then find and replace the
   old string in the HTML (README.md, "Change the brand").

   Owned by the architect. Workers ask for changes in their report (needs_from_others).
   Lines marked [ETHAN] are values Ethan must confirm. */

const SITE = {
  name: "Ethan Gaither",
  location: "Battle Ground, Washington",
  locality: "Battle Ground",
  region: "WA",
  country: "US",
  tagline: "websites for small businesses",

  // Home page <title> and description (each page bakes its own head; these are the home values).
  title: "Web designer in Battle Ground, WA | Ethan Gaither",
  description:
    "Ethan Gaither builds fast, clear websites for small businesses in Battle Ground, Vancouver and Clark County, WA. You own the domain, hosting and code.",

  // [ETHAN] Contact address shown on the site and used by the mailto fallback of the forms.
  email: "gaitherethan@icloud.com",

  // Public address of the site, no trailing slash. Also baked into every page's canonical and og:url.
  siteUrl: "https://ethan-gaither.vercel.app",
  ogImage: "og.png",

  // Only show a reply promise if Ethan will keep it. Off.
  promiseReply: false,
  promiseReplyText: "",

  // Towns named in copy and in the JSON-LD areaServed.
  serviceAreas: ["Battle Ground", "Vancouver", "Ridgefield", "Camas", "Washougal", "Woodland", "Clark County"],

  links: {
    blackline: "https://black-line-studios.com"
  },

  // [ETHAN] A booking page (for example a Google Calendar appointment schedule). Empty: /book-a-call/ shows only
  // the request form. Set: shell.js shows the "Pick a time" button ([data-booking]) and points it here.
  bookingUrl: "",

  // Certifications Ethan has earned. Empty: the About page's certifications block does not exist (no placeholder text).
  // Each item: { name: "…", issuer: "…", year: 2027, url: "https://…" (optional, the credential page) }
  certifications: [],

  // The sample sites, in gallery order. shell.js renders /samples/ and the home teaser from this list.
  // ready: false keeps a card out of the gallery until its sample is built and reviewed (the integrator flips it).
  // accent: the card colour, taken from the sample's own palette.
  samples: [
    { slug: "hollow-oak", name: "Hollow Oak Coffee", kind: "Coffee shop", blurb: "Menu, hours, a map and tap-to-call for a small corner shop.", accent: "#1D3A2C", ready: true },
    { slug: "casa-ortega", name: "Casa Ortega", kind: "Mexican restaurant", blurb: "A full menu, order by phone and a catering request form.", accent: "#B3261E", ready: true },
    { slug: "north-fork-apparel", name: "North Fork Apparel", kind: "Clothing brand", blurb: "Lookbook, story, sizing and stockists for a small label.", accent: "#9C3D1A", ready: true },
    { slug: "ridgeline-goods", name: "Ridgeline Goods", kind: "Online store", blurb: "Product grid, filters, product pages and a working demo cart.", accent: "#2F5D50", ready: true },
    { slug: "summit-plumbing", name: "Switchback Plumbing", kind: "Licensed plumber", blurb: "Services, service area, tap-to-call everywhere and a quote form.", accent: "#12305A", ready: true },
    { slug: "tempo-fitness", name: "Tempo Fitness", kind: "Fitness studio", blurb: "Class schedule, memberships and a free-trial form.", accent: "#FF3D7F", ready: true }
  ],

  // Tools Ethan uses, for the About page. True list only. [ETHAN] Figma is left off until he confirms it.
  tools: ["HTML", "CSS", "JavaScript", "Vercel", "GitHub", "Claude Code", "Codex", "Cursor", "Lighthouse"]
};

if (typeof window !== "undefined") window.SITE = SITE;
export default SITE;
