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
    github: 'https://github.com/your-username',
    linkedin: 'https://linkedin.com/in/your-username',
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
 * Leave as `undefined` to skip emitting og:image / twitter:image meta tags
 * entirely — better than shipping broken-image links to social platforms.
 * Once you have a real 1200×630 PNG at `public/og-default.png`, set this
 * to `'/og-default.png'`. Pages can also override per-page by passing the
 * `image` prop to `BaseLayout`.
 */
export const DEFAULT_OG_IMAGE: string | undefined = undefined;
