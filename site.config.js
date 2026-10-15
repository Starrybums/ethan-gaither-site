/* ==========================================================================
   site.config.js
   Every brand-dependent string for the site lives in this one file.
   index.html and 404.html ship with the same values baked
   in (so the pages read correctly with JavaScript off and for crawlers that
   do not run it), and motion.js re-applies these values at load. To rebrand:
   edit this file, then follow "Change the brand" in README.md.

   Lines marked [ETHAN] are placeholders or guesses that Ethan must confirm
   before the site goes public.
   ========================================================================== */
window.SITE = {
  // Public name shown in the header, footer, title and structured data.
  name: "Ethan Gaither",

  // Location line. Used in the hero eyebrow, footer and JSON-LD.
  location: "Battle Ground, Washington",
  locality: "Battle Ground",
  region: "WA",
  country: "US",

  // Short phrase after the location in the hero eyebrow.
  tagline: "websites for small businesses",

  // <title> and social title.
  title: "Ethan Gaither — websites for small businesses",

  // Meta description, 160 characters or fewer.
  description:
    "Ethan Gaither builds fast, clear websites for small businesses from Battle Ground, Washington. You own the domain, the hosting account, and the code.",

  // [ETHAN] Contact address. This is the default from the build brief; confirm it.
  email: "gaitherethan@icloud.com",

  // [ETHAN] Final public address of the site, for example "https://example.com".
  // Empty on purpose: while it is empty no canonical link is written and
  // og:image stays relative. Set it when the domain is chosen.
  siteUrl: "https://ethan-gaither.vercel.app",

  // Social preview image, relative to the site root. Most social networks need a
  // PNG or JPG here; see README.md ("Social preview image").
  ogImage: "og.png",

  // Only show a reply promise if Ethan will keep it. Default is off.
  promiseReply: false,
  promiseReplyText: "I reply within one business day.",

  // Outbound links used by the work section.
  links: {
    blackline: "https://black-line-studios.com"
  }
};
