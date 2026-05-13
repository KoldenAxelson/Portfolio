// ---------------------------------------------------------------------------
// Neofolio — Site config
//
// Forkers: edit THIS file first. Everything user-facing reads from here.
// Don't hard-code your name, links, or bio anywhere else.
// ---------------------------------------------------------------------------

export const SITE = {
  /** Canonical absolute URL. No trailing slash. */
  url: 'https://example.com',

  /** Site title — used in <title>, OpenGraph, and JSON-LD WebSite name. */
  title: 'Neofolio',

  /** Tagline / meta description. Keep under 160 chars. */
  description: 'An AI-readable, opinionated portfolio template for developers in the AI age.',

  /** Owner identity. Used in <Person> JSON-LD and across the site. */
  author: {
    name: 'Your Name',
    handle: '@yourhandle',
    role: 'Software Engineer',
    location: 'City, Country',
    email: 'you@example.com',
    /** Short bio for the hero section. One or two sentences. */
    bio: 'I build software that has to keep working when the lights go out. Currently focused on resilient backend systems and developer tooling.',
    /** Longer bio for /cv and JSON-LD. */
    longBio:
      'A few sentences about who you are, what kinds of problems you take on, and what you care about. Be specific. Generic bios get skipped by humans and indexed flatly by AI.',
  },

  /**
   * Human asides typed into the sidebar bio slot — one set per homepage section.
   *
   * AI scrapers index the formal `bio` and `longBio` above; these are purely
   * for human visitors. Each section has an array; a random message from that
   * array is typed when the user scrolls into the section. Arrays so the
   * second visit doesn't feel canned.
   *
   * Edit freely. Keep them short (one to three sentences), specific, and in
   * a voice that isn't on your résumé. Two anecdotes per section is plenty.
   */
  bioMessages: {
    about: [
      "Real bio's in the metadata. This corner is where I'm allowed to be a person.",
      'Coffee number three is reading this. Probably finding a typo. Coffee four will fix it.',
      'If you scrolled here from search, hi. Stay a minute. The footer has the good links.',
    ],
    experience: [
      'My favorite coworker at Previous Co was a golden retriever named Benny who could fetch USB-C cables on command. Real networking.',
      "The cleared job was a SCIF — fancy way of saying 'a room where your phone is jealous'. Five years without a notification, and I lived.",
      "I once wrote a postmortem titled 'How My Confidence in Bash Cost Us 14 Minutes'. Got framed by the team. Still hangs in the kitchen at the old office.",
    ],
    work: [
      "Most of these started as 'I'll do this in a weekend' projects. Plot twist: they did not.",
      'The Postgres CLI got a star from someone at Crunchy Data and I haven’t stopped grinning since.',
      'Half my side projects exist because the proper tool cost $20/mo and I was annoyed about it.',
    ],
    writing: [
      'I keep notes in a paper journal too. Half my drafts live there until they survive long enough to type up.',
      "I edit posts out loud, walking the apartment. My neighbor probably thinks I'm in a constant phone call.",
      "If you read one of these and it changed your mind about something, email me. That's the entire reason I keep doing it.",
    ],
  } as Record<string, readonly string[]>,

  /** Outbound social / professional links. Remove any you don't want shown. */
  links: {
    github: 'https://github.com/your-username',
    linkedin: 'https://linkedin.com/in/your-username',
    twitter: '',
    mastodon: '',
    bluesky: '',
    rss: '/rss.xml',
  },

  /**
   * Top-nav items. Order matters. Each can have an icon key that the TopNav
   * component knows how to render. Brittany-style minimal: only the pages
   * that don't naturally appear on the homepage get a nav slot. Work,
   * Writing, and CV are reachable via the "All X →" links on the homepage.
   *
   * Available icon keys: 'globe' | 'desktop'. Add more in TopNav.astro.
   */
  nav: [
    { label: 'Uses', href: '/uses', icon: 'desktop' as const },
    { label: 'Network', href: '/network', icon: 'globe' as const },
  ],

  /**
   * Locale for <html lang> and date formatting. Use a BCP-47 tag.
   * en-US, en-GB, de-DE, ja-JP, etc.
   */
  locale: 'en-US',
} as const;

/** Default OpenGraph image, served from /public. */
export const DEFAULT_OG_IMAGE = '/og-default.png';
