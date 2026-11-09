/* js/config.js - every brand-dependent value for the portfolio (replaces v2's site.config.js).
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

  // [ETHAN] The number for tap-to-call and tap-to-text, for example "(360) 555-0100". Empty: no phone link appears
  // anywhere (the [data-site-tel] and [data-site-sms] links stay hidden). Never a guessed number. When it is set, also
  // bake it into each page's JSON-LD "telephone" so crawlers see it with JavaScript off.
  phone: "",
  // false: the call link only, no "Text me".
  texts: true,

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
  // thumb: a screenshot of the sample (1200 by 750 or the same 16:10 shape). thumbAlt says what it shows. Empty thumb: the colour swatch.
  samples: [
    { slug: "hollow-oak", name: "Hollow Oak Coffee", kind: "Coffee shop", blurb: "Menu, hours, a map and tap-to-call for a small corner shop.", accent: "#1D3A2C", thumb: "/assets/img/samples/hollow-oak-desktop.webp", thumbAlt: "The Hollow Oak Coffee sample: a dark green banner that says Good coffee, no rush, with a coffee cup beside it.", ready: true },
    { slug: "casa-ortega", name: "Casa Ortega", kind: "Mexican restaurant", blurb: "A full menu, order by phone and a catering request form.", accent: "#B3261E", thumb: "/assets/img/samples/casa-ortega-card.webp", thumbAlt: "The Casa Ortega sample home page: a red banner with the name in large letters, a call to order button and a round patterned emblem.", ready: true },
    { slug: "north-fork-apparel", name: "North Fork Apparel", kind: "Clothing brand", blurb: "Lookbook, story, sizing and stockists for a small label.", accent: "#9C3D1A", thumb: "/assets/img/samples/north-fork-apparel-card.webp", thumbAlt: "The North Fork Apparel sample home page: the headline Clothes for the long way home beside a drawing of a road through hills.", ready: true },
    { slug: "ridgeline-goods", name: "Ridgeline Goods", kind: "Online store", blurb: "Product grid, filters, product pages and a working demo cart.", accent: "#2F5D50", thumb: "/assets/img/samples/ridgeline-goods-card.webp", thumbAlt: "The Ridgeline Goods sample store: the headline, category and price filters, and the first row of drawn products.", ready: true },
    { slug: "summit-plumbing", name: "Switchback Plumbing", kind: "Plumbing company", blurb: "Services, service area, tap-to-call everywhere and a quote form.", accent: "#12305A", thumb: "/assets/img/samples/summit-plumbing-card.webp", thumbAlt: "The Switchback Plumbing sample home page: a navy banner with the headline Plumbing help across Clark County and an orange call button.", ready: true },
    { slug: "tempo-fitness", name: "Tempo Fitness", kind: "Fitness studio", blurb: "Class schedule, memberships and a free-trial form.", accent: "#FF3D7F", thumb: "/assets/img/samples/tempo-fitness-card.webp", thumbAlt: "The Tempo Fitness sample home page: a black banner with the headline Train on the beat and a drawing of a metronome.", ready: true }
  ],

  // Tools Ethan uses, for the About page. True list only. [ETHAN] Figma is left off until he confirms it.
  tools: ["HTML", "CSS", "JavaScript", "Python", "Java", "Node.js", "Git", "GitHub", "Vercel", "Lighthouse", "Chrome DevTools"]
};

if (typeof window !== "undefined") window.SITE = SITE;
export default SITE;
