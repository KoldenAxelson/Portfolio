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
  description:
    'An AI-readable, opinionated portfolio template for developers in the AI age.',

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

  /** Outbound social / professional links. Remove any you don't want shown. */
  links: {
    github: 'https://github.com/your-username',
    linkedin: 'https://linkedin.com/in/your-username',
    twitter: '',
    mastodon: '',
    bluesky: '',
    rss: '/rss.xml',
  },

  /** Top-nav items. Order matters. */
  nav: [
    { label: 'Work', href: '/work' },
    { label: 'Writing', href: '/writing' },
    { label: 'Uses', href: '/uses' },
    { label: 'CV', href: '/cv' },
    { label: 'Archive', href: '/archive' },
  ],

  /**
   * Locale for <html lang> and date formatting. Use a BCP-47 tag.
   * en-US, en-GB, de-DE, ja-JP, etc.
   */
  locale: 'en-US',
} as const;

/** Default OpenGraph image, served from /public. */
export const DEFAULT_OG_IMAGE = '/og-default.png';
