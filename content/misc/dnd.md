---
# ── Page front matter ────────────────────────────────────────────────────────
# ONE PAGE, NOT A SECTION. This used to be content/misc/dnd/ with four child
# pages. It is one page now for the same reason /misc/skyrim/ is: at the table you
# are not reading a chapter, you are looking something up, and four endpoints
# meant knowing in advance which one a rule lived on.
#
# container wide : full-width column, so the maneuver grid gets three across and
#                  the builder's ability strip gets seven.
# prose true     : Tailwind Typography for the running text. Every widget root
#                  carries `not-prose` so it keeps its hands off them.
# glossary dnd   : ships data/glossary/dnd.yaml + definitions.css, from the
#                  LAYOUT rather than from shortcodes/term.html — see
#                  partials/definitions-assets.html for why that matters.
# sections       : drives BOTH the desktop jump-to-section FAB
#                  (partials/section-nav.html) and the mobile navbar list
#                  (partials/topnav.html). Each id must match a heading id
#                  below — the `{#create}` suffixes pin them.
# desktopFab     : suppress the centered navbar toolbar; the FAB covers desktop.
#
# THE PAGE STATES RULES. It does not explain them. Every "why" — the worked
# min-max, why the Warlord is the only archetype, why hit points are flat — is a
# {{< term >}} click-through into data/glossary/dnd.yaml, which on desktop opens a
# draggable window you can park beside the rule it belongs to. That split is the
# point: reasoning in the body text is reasoning a player has to read past to find
# what their character can do.
#
# NOTHING LONG IS EXPANDED. Class features open from the level table, feats open
# from a searchable list, the maneuver grid lives in a scroll area and the styles
# in a sideways rail. Expanded, this page was about 14,000px tall — a document
# optimised for being read end to end by something that never gets tired. It is
# a tool for people at a table.
# ─────────────────────────────────────────────────────────────────────────────
title: "D&D"
description: "House rules for my Dagean campaign: a character builder, the Revised Fighter, the Warlord's 53 maneuvers, and the feats that made the cut."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "The rules I run"
blurb: "House rules for the campaign I run in Dagea — a character builder, a maneuver picker, and a short feat list."
icon: "shield-check"
container: "wide"
prose: true
desktopFab: true
toolsIcon: "shield-check"
glossary: "dnd"
sections:
  - { id: "create",    label: "Create",    icon: "user" }
  - { id: "fighter",   label: "Fighter",   icon: "shield-check" }
  - { id: "maneuvers", label: "Maneuvers", icon: "squares-2x2" }
  - { id: "feats",     label: "Feats",     icon: "trophy" }
  - { id: "rules",     label: "Rules",     icon: "book-open" }
---

5th Edition, cannibalised. One class, one subclass, and the world is
[Dagea](/dagea/). Anything in the accent colour opens — a window you can drag and
park on desktop, a panel on a phone.

## Create {#create}

Human, and {{< term "subraces" >}}subraces are pending{{< /term >}}.
Fighter, {{< term "warlord" >}}Warlord{{< /term >}}. Magic belongs to
monsters; every other kind of person is a story told to children.

{{< character-builder >}}

## Fighter {#fighter}

Warlord is the only archetype, so the table names its features where the book would
have said "Martial Archetype".

{{< fighter-table >}}

### Fighting Style {#fighting-style}

{{< fighting-styles >}}

## Maneuvers {#maneuvers}

One per attack, and the {{< term "family" >}}family{{< /term >}} tells you when it
happens. Tap to build a list; it keeps itself and counts nothing against you.

{{< maneuver-picker >}}

## Feats {#feats}

Three at 1st level, from an {{< term "allow-list" >}}allow-list{{< /term >}}.
{{< term "mental-doubling" >}}Mental abilities count double{{< /term >}}.

{{< feat-cards >}}

## Rules {#rules}

Everything not on this list is 5e until it gets in the way.

{{< house-rules >}}
