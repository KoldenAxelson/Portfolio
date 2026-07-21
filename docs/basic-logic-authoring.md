# Basic Logic — authoring guide

The **Basic Logic** section revives an out-of-print logic workbook, chapter by
chapter. It's a nested section under **Misc**, so it inherits the site's banner,
card list, and typography for free — you mostly just type Markdown.

## Where things live

```
content/misc/basic-logic/
  _index.md          ← section landing (intro prose; chapters auto-list below)
  chapter-01.md      ← one file per chapter
  chapter-02.md
  …
layouts/shortcodes/
  logic-widget.html  ← the {{< logic-widget >}} mount point for interactive bits
docs/
  basic-logic-authoring.md   ← this file
```

Because `basic-logic` sits inside `content/misc/`, Hugo renders it with the
existing `layouts/misc/` templates:

- The landing (`_index.md`) uses `layouts/misc/list.html` — it prints your intro
  prose, then lists every chapter as a card (icon + title + one-line blurb).
- Each chapter uses `layouts/misc/single.html` — a page banner (title + lead), an
  optional "Last updated" line, then your content.

You don't need to touch any template to add chapters. The section also shows up
as its own card on the main **Misc** page automatically.

## Adding a chapter

Create a new file `chapter-NN.md` in `content/misc/basic-logic/` and paste this
template:

```markdown
---
title: "Chapter N — Title Here"
lead: "One-line summary shown under the banner and on the card."
description: "Slightly longer summary for SEO and card fallback."
weight: N            # controls order in the list; lower shows first
updated: 2026-07-20  # renders a "Last updated …" line
# hidden: true       # uncomment to keep a WIP chapter off the list
# draft: true        # uncomment to exclude from the built site entirely
---

## Overview

Frame the chapter in a few sentences.

## Key ideas

The main summary, in plain prose. **Bold** terms on first use.

## Try it

{{< logic-widget name="unique-id" title="Widget Title" icon="puzzle-piece" >}}
Fallback text or a static image — shown until the interactive version exists.
{{< /logic-widget >}}

## Takeaways

The one- or two-sentence version worth remembering.
```

### Front matter fields

| Field | Purpose |
|-------|---------|
| `title` | Page heading, banner, and card label |
| `lead` | One-liner under the banner (falls back to `description`) |
| `description` | SEO/meta and card blurb fallback |
| `weight` | Chapter order (1, 2, 3…). Lower sorts higher. **Always set this.** |
| `updated` | Shows a "Last updated …" line at the top of the chapter |
| `hidden` | `true` keeps the chapter out of the card list (still builds a page) |
| `draft` | `true` excludes it from the built site until you're ready |

Headings are up to you — `## Overview / ## Key ideas / ## Worked example /
## Try it / ## Takeaways` is just the rhythm the example uses. Prose reads best;
avoid long bullet lists. Raw HTML is allowed in Markdown here if you ever need it.

## Interactive widgets

Interactive exercises use the `logic-widget` shortcode. It renders a styled,
self-contained card now and is designed to be "hydrated" by a script later:

```markdown
{{< logic-widget name="truth-table" title="Truth Table Explorer" icon="squares-2x2" >}}
Optional Markdown fallback shown until the widget goes live.
{{< /logic-widget >}}
```

- `name` — a stable id (unique per page) a script will use to find and replace
  the card's inner slot with the live UI.
- `title` / `icon` — the header. `icon` is any key in `data/icons.yaml`
  (e.g. `puzzle-piece`, `squares-2x2`, `academic-cap`, `sparkles`).

**When you're ready to build a real widget:** add a small module under
`assets/ts/`, have it query `[data-logic-widget="<name>"]`, and replace the
contents of that card's `[data-logic-widget-slot]` with the interactive version.
Wire it into the TS bundle the same way the site's other behaviors are (see the
`data-*` hooks in `layouts/partials/` and the existing `assets/ts` entries).
That keeps the widgets consistent with the rest of the site and progressive —
the page stays useful with JavaScript off.

## Previewing

Run the site locally (see the project `Makefile` / `README`, typically a
`make serve` or `hugo server`) and visit `/misc/basic-logic/`. Chapters marked
`draft: true` need the drafts flag (`hugo server -D`) to show.
