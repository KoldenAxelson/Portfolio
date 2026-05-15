// ---------------------------------------------------------------------------
// Neofolio — Site config
//
// Forkers: edit THIS file first. Everything user-facing reads from here.
// Don't hard-code your name, links, or bio anywhere else.
// ---------------------------------------------------------------------------

export const SITE = {
  /** Canonical absolute URL. No trailing slash. */
  url: 'https://wrightfunctions.com',

  /** Site title — used in <title>, OpenGraph, and JSON-LD WebSite name. */
  title: 'Konrad Wright',

  /** Tagline / meta description. Keep under 160 chars. */
  description: "Konrad Wright's Portfolio",

  /** Owner identity. Used in <Person> JSON-LD and across the site. */
  author: {
    name: 'Konrad Wright',
    handle: '@KoldenAxelson',
    role: 'Principal Software Engineer',
    location: 'Paso Robles, CA',
    email: 'KonradWright@Protonmail.com',
    /**
     * Phone number for the CV contact line. Optional — set to '' to hide.
     * Some ATS parsers look for a phone match alongside email; including
     * one is recommended if you're comfortable with it being public.
     * Format conventionally for your region (e.g. '+1 555 123-4567').
     */
    phone: '+1 (805) 423-7338',
    /** Short bio for the hero section. One or two sentences. */
    bio: 'I make specialized tools for people with problems, then I scale that solution to a magnitude of users.',
    /** Longer bio for /cv and JSON-LD. */
    longBio: `I'm a highly skilled software engineer turned professional problem solver, with over fifteen years across various fields. The cross-domain pollination going on in my head has led me to solve some outlandish problems, all the way from concept to business. I'm working on things I know will help my friends — those problems aren't unique. I work best for the person in front of me. When I earn that appreciation, I replay that smile in my head whenever I get a Stripe notification of a new customer.

Currently I'm running VisorPlate, but it doesn't take my around-the-clock attention since I've automated most of it to run without my hand in the pot. That leaves me time for other projects. I took a side-tangent and built this AI-SEO portfolio — then turned the engine into a template — and I'm seeing where that goes. Right now I'm in submission with Google for Widda, which will take 4–6 weeks. Cost of doing business.

If you're interested in what I'm doing or using, check out the /now and /uses pages. That's either accurate, up-to-date info, or I'm addicted to Sudoku again.`,
    /**
     * Public links to downloadable résumé files. Renders as one or two
     * download buttons on /cv. PDF for human review, DOCX for ATS
     * pipelines (which sometimes prefer editable formats). Recruiters
     * almost always want a real file rather than a printed-from-browser
     * version, so even with the print-friendly /cv page it's worth
     * offering at least one.
     *
     * Drop the files in `/public/` (e.g. `/public/resume.pdf`) and
     * reference them here. Set either to '' (empty string) to hide that
     * button. If both are empty, no download row renders at all.
     */
    resume: {
      pdf: '/resume.pdf',
      docx: '/resume.docx',
    },
  },

  /**
   * Per-element typewriter thoughts live colocated with the data they're
   * about — so this config object doesn't carry them:
   *   • Roles    → `thoughts: string[]` in src/data/cv.ts
   *   • Projects → `thoughts: string[]` in each MDX frontmatter
   *   • Articles → `thoughts: string[]` in each MDX frontmatter
   *
   * The About section has no indicator — the sidebar shows the static
   * `author.bio` above when you're scrolled there.
   */

  /** Outbound social / professional links. Remove any you don't want shown. */
  links: {
    github: 'https://github.com/KoldenAxelson',
    linkedin: 'https://www.linkedin.com/in/konrad-wright-b53860330/',
    twitter: '',
    mastodon: '',
    bluesky: '',
    rss: '/rss.xml',
  },

  /**
   * Top-nav items. Order matters. Each has an icon key that the TopNav
   * component knows how to render.
   *
   * Available icon keys: 'folder' | 'newspaper' | 'desktop' | 'globe' |
   * 'user-group' | 'briefcase' | 'fire' | 'academic-cap' | 'trophy'.
   * Add more in TopNav.astro.
   */
  nav: [
    { label: 'Projects', href: '/projects', icon: 'folder' as const },
    { label: 'Articles', href: '/articles', icon: 'newspaper' as const },
    { label: 'Certs', href: '/certificates', icon: 'trophy' as const },
    { label: 'Network', href: '/network', icon: 'user-group' as const },
    { label: 'Uses', href: '/uses', icon: 'desktop' as const },
    { label: 'Now', href: '/now', icon: 'fire' as const },
    { label: 'CV', href: '/cv', icon: 'briefcase' as const },
  ],

  /**
   * Locale for <html lang> and date formatting. Use a BCP-47 tag.
   * en-US, en-GB, de-DE, ja-JP, etc.
   */
  locale: 'en-US',
} as const;

/**
 * Default OpenGraph image (served from /public, no domain prefix).
 *
 * Drop a 1200×630 PNG at `public/og-default.png`. Pages can override
 * per-page by passing the `image` prop to `BaseLayout` (articles already
 * do this via their `cover` frontmatter).
 *
 * Set to `undefined` to skip emitting og:image / twitter:image meta tags
 * entirely if you'd rather no preview card than a generic one.
 */
export const DEFAULT_OG_IMAGE: string | undefined = '/og-default.png';
