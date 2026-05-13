# Design philosophy

Why Neofolio looks and works the way it does. Less about what, more about
why. Read this before you decide to throw out a load-bearing piece.

## Two audiences, one site

Most portfolio templates optimize for the human who lands on the site.
Neofolio is built for two audiences at once: the human and the AI system
that will, increasingly, summarize that human to other humans before they
ever click through. If a page fails one audience, it usually fails the
other — bad HTML structure makes for bad screen-reader output AND bad
AI parsing.

Every architectural choice traces back to this: **what works for both?**

## Minimalist, opinionated, professional

Templates fail by trying to be everything. Neofolio is one shape: a
developer portfolio for someone in mid-to-senior career who wants to look
serious without looking corporate. That means:

- Neutral light palette by default (warm paper-white, zinc neutrals,
  one amber accent). Dark mode via `prefers-color-scheme`.
- Inter for sans-serif (clean, professional, screen-optimized).
- No background gradients, no glow effects, no over-animated UI.
- Top nav is functional, not branded.
- Sidebar on the homepage is the one piece of personality.

If you want something flashier, Neofolio is the wrong starting point.
Fork Brittany Chiang's instead.

## Static-first, JS as garnish

Astro emits HTML at build time. Vue islands hydrate ONLY on interaction
or visibility — and only on the two pages that need them
(`/projects` filter, `/network` panel). Every other page is zero JS.

This isn't just a performance choice. It's a readability choice:

- AI scrapers don't run JS reliably. Static HTML is what they index.
- Screen readers work better on static markup.
- Page loads instantly, even on slow connections.
- The site survives JS bugs. Network compose falls back to mailto:.

The cost: less interactive flourish. We accept that tradeoff.

## Content collections, not a CMS

MDX + YAML files in `src/content/`. No headless CMS, no database, no
build-time API calls. Git is the source of truth.

This is a deliberate choice against the modern "compose your stack"
trend. The benefits:

- Your portfolio still works in five years even if every SaaS in the
  current stack dies.
- Forking the template means cloning the repo. There's no service to
  sign up for.
- Content reviews happen as Pull Requests.
- AI scrapers can fetch the raw MDX from GitHub if they want the
  authoritative source.

The cost: no rich-text editor. You write Markdown. That's the price.

## Mobile drill-down for the Network page

The Network page is the most interactive part of the template. On
desktop, it's two panels side by side. On mobile, that becomes a
drill-down stack: list → profile → compose, with explicit back buttons.

This is the iOS Settings pattern. The alternative — collapsed accordions
or modals — felt clunky on mobile. The drill-down maps to user intent:
"I want to browse → I want to see this one → I want to write a message
about it." Each step is a distinct view.

## Light mode default

Most developer tools default to dark. Most reading materials default to
light. A portfolio is primarily for reading (résumé, articles, project
descriptions, network blurbs). Light wins for that use case.

Dark mode is supported via `prefers-color-scheme: dark`. We don't ship a
manual toggle — adding one means localStorage, theme-switching JS, and a
visible UI control. Visitors who want dark already have their OS set
that way.

## Underlines by default

Lighthouse 1.4.1 flags "links rely on color alone." We default to
underlined `<a>` tags and opt out via `class="no-underline"` for nav and
icon links. This catches the failure mode early: forget to underline an
inline link in MDX, and Lighthouse won't catch it (because the inline
link IS underlined by default).

The cost: visual density. Bare prose with many links looks slightly
busier. Acceptable.

## Brittany-inspired sidebar, our own structure

The split sidebar pattern is from brittanychiang.com (v4). What we kept:

- Sticky left, scrolling right
- Vertical line-indicator nav
- Identity-first hierarchy
- Generous whitespace

What we changed:

- Multi-page architecture (Brittany is single-page)
- Section navigation only on the homepage (other pages don't need it)
- Typewriter messages instead of a static bio (humans see playfulness,
  AI sees the formal bio in JSON-LD)
- Light mode default (Brittany is dark-by-default)
- Hover-expand icon labels in the top nav (no equivalent in her site)

The result is "Brittany-influenced" rather than "Brittany clone." If a
visitor recognizes the lineage, that's fine. If they don't, even better.

## The typewriter

The sidebar bio gets replaced by a typed-out section-specific message
when JS hydrates on desktop. This is pure flourish — recruiters don't
need it, AI scrapers don't index it.

Why ship it then?

- The real bio is in JSON-LD `Person.description` and in the static
  HTML before JS runs. Nothing important is lost.
- The flourish is a small signal: "this person sweats the details."
- It's gated to `lg+` — mobile shows the static bio.
- It respects `prefers-reduced-motion`.

It's the one place the template chooses delight over restraint.

## The Network page

Most portfolios are first-person: "here's my stuff." Neofolio adds a
page for "here's who I'd vouch for." This is for the recruiter audience.
A senior engineer's network is signal: who you choose to associate with
says as much as what you've shipped.

The compose form uses mailto: instead of an API endpoint because:

- It works on GitHub Pages (no server).
- The message lands in the visitor's actual sent folder (auditable for
  them, threaded for both parties).
- No SaaS dependency.

The trade-off: less control over the UX (their email client, not ours).
Acceptable.

## What we said no to

These got considered and rejected:

- **A blog with comments.** Comments are a sink for maintenance and
  spam. Backlinks via webmention work better and don't pollute your
  content.
- **A live "now playing" Spotify widget.** Fun but adds a third-party
  hop and dies when the API changes.
- **A search bar.** Cmd-F in the browser already works for static
  content. The benefit of a custom search doesn't justify the JS weight.
- **A floating contact button.** Visitors who want to contact you find
  the email link or the Network page. The floating button is mostly
  for sites that fear losing the user.
- **Analytics by default.** Add Plausible / Fathom in the wf-site fork
  if you want it, but the template doesn't impose tracking.
- **An auto-rotating hero carousel.** Single-pane is more honest.

## When to override the philosophy

This template is opinionated, not dogmatic. Override these defaults if:

- You're building for a specific audience that wants something
  different (designer portfolio: heavier visuals, less text)
- You have a specific aesthetic vision (anime / cyberpunk / brutalist)
- You actively need a feature the template explicitly skipped

Just override consciously. "I didn't think about it" is the worst
reason to change a default.
