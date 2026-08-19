# The Dagean campaign page — authoring guide

`/misc/dnd/` is the player-facing half of the campaign I run. One page, six
sections, five widgets. This is how to change it.

## The contract

**The page states rules. It does not explain them.**

Everything that justifies a rule, works an example, or explains a decision lives
in `data/glossary/dnd.yaml` and is reached by clicking a `{{< term >}}`. On desktop
that opens a draggable window you can park next to the rule it belongs to; on a
phone it fills the top-nav panel. Both are the Basic Logic machinery, unchanged.

The reason is not tidiness. A player at the table is looking something up, and
reasoning in the body text is reasoning they have to read past to find what their
character can do. If you catch yourself writing "because" in a card's `text`, that
sentence belongs in the glossary.

**One page, not a section.** It used to be `content/misc/dnd/` with four child
pages, which meant knowing in advance which endpoint a rule lived on. It is one
page now, the same shape as `/misc/skyrim/`: `sections:` in front matter drives
both the desktop jump-to-section FAB and the mobile navbar list.

**Nothing long is expanded.** Expanded, this page was about 14,000px tall — 53
maneuver cards, 11 style cards and a feature grid, all open at once. That is a
document optimised for being read end to end by something that never gets tired,
and this is a tool for people at a table. Four shapes carry the load, and which
one a list gets is decided by how you arrive at it:

| Shape | For | Used by |
|:--|:--|:--|
| **Popover** | one item, read on demand | class features, feats, fighting styles |
| **Scroll area** | long, filterable, you know what you want | maneuvers, feats |
| **Rail** | short, browsable, you want to see them all | fighting styles |
| **Fold** | present for completeness, not for reading | discontinued maneuvers |

If a new list is longer than about six items, it needs one of these, not a grid.

## Where things live

```
content/misc/
  dnd.md                   ← the whole page
data/dnd/
  creation.yaml            ← arrays, human points, skills, background, saves
  fighter.yaml             ← level table, Superiority Die steps, class + Warlord features
  fighting-styles.yaml     ← the eleven Fighting Styles
  maneuvers.yaml           ← the whole maneuver pool
  taxonomy.yaml            ← the families, timings and tags maneuvers filter by
  feats.yaml               ← the feat allow-list
  rules.yaml               ← the edited rulings
data/glossary/
  dnd.yaml                 ← every "why" on the page
layouts/shortcodes/
  character-builder.html · maneuver-picker.html · class-features.html
  fighter-table.html · fighting-styles.html · feat-cards.html · house-rules.html
layouts/partials/
  dnd-assets.html          ← ships assets/css/dnd.css and the page bundle
  definitions-assets.html  ← ships definitions.css + the glossary set
  func/term-button.html    ← a glossary trigger, for use from a template
assets/scripts/pages/dnd/
  main.ts · picker.ts · builder.ts · store.ts
assets/css/dnd.css
```

Assets are emitted from `layouts/misc/single.html`, keyed off `.HasShortcode` and
the page's `glossary:` front matter. Nothing is emitted by a shortcode — see
"The things that will bite you".

## Adding a glossary entry

```yaml
gambit-attacks:
  term: Gambit attacks
  definition: One sentence. The rule, or the thing being named.
  notes:
    - The reason.
    - "**Worked example.** …"
```

`[[other-key|display text]]` cross-references another entry — always the explicit
two-part form. `**bold**` works. `notes` is a list of further paragraphs and is
the campaign set's own addition to the shape; a Basic Logic entry is one sentence
and stays that way.

Reach it from prose with `{{< term "gambit-attacks" >}}the words as they read{{< /term >}}`,
or from a template with
`{{ partial "func/term-button.html" (dict "key" "gambit-attacks" "set" "dnd") }}` —
which renders the icon-only form for a card whose heading already names the thing.

**There is no `set=` parameter.** Hugo refuses to mix named and positional
shortcode arguments, and the key has always been positional. The page declares
`glossary: "dnd"` in front matter and `term.html` reads it from there, which also
guarantees a page cannot use a set it did not load.

## Adding a maneuver

Append to `data/dnd/maneuvers.yaml`. The card, the filter chips and the search index
all come off that file.

```yaml
  - name: Something Strike
    family: strike          # must exist in taxonomy.yaml, or the BUILD FAILS
    tags: [damage, control]
    save: Strength          # omit when it forces no save
    text: >-
      When you hit a creature with a weapon attack…
```

**`family` is the only facet, and it says when.** Strikes and Attacks ride a hit,
Maneuvers spend an attack, Stances cost a bonus action, Reflexes cost a reaction,
Prowesses go on an ability check. There used to be a second `timing` field and a
second row of filter chips; both are gone, because one facet that is true beats two
that overlap.

**`other` is where the exceptions go.** Quick Strike is named like a Strike and costs
a bonus action; Precision applies to the roll rather than to a result. Filing either
under its suffix would make the suffix a lie — which is exactly the problem `timing`
existed to paper over. If a new maneuver's name does not predict how it works, it is
`other`.

**There is no `free_use` flag.** Extra Attack's free-maneuver rule is stated once, in
that feature's own entry. Labelling twenty-six cards with a permission nobody needs to
be granted was noise.

**Retiring one:** add `status: discontinued` rather than deleting it. It moves into the
fold at the bottom and stops being selectable.

An unknown family is a build error on purpose: a typo'd facet is a filter chip nobody
can ever click, and a card that silently drops out of every filter is worse than a red
build.

## Adding a class feature

One `features:` list holds the Fighter's and the Warlord's, because from a player's
seat they are the same thing: something you get at a level. Warlord is the only
archetype, so the level table names its features rather than saying "Martial
Archetype Feature".

```yaml
  - name: Indomitable
    level: 9
    term: superiority-die    # optional — a key in data/glossary/dnd.yaml, for the WHY
    text: The rule, and only the rule.
    bullets: [ … ]           # a pick-one list
    options:                 # Superiority Dice options this feature grants
      - { name: Overcome, text: … }
```

Then add the name to the right row of `table:`. Features do **not** render as cards —
each name in the table is a click-through, and the window is built out of this entry
by `partials/dnd-popovers.html`. `options` become further paragraphs in that window,
because Overcome is not a feature you get at 9th level, it is a thing Indomitable
hands you.

**No row emphasis in the table.** An earlier version put an accent rule on every row
granting something other than an Ability Score Improvement, which made the ASI rows
the *unmarked* ones — seven gaps down twenty rows, reading as damage rather than as
emphasis.

## Adding a feat

Append to `data/dnd/feats.yaml`. `origin: homebrew` swaps the PHB chip. Put any
campaign edit in `house:` and never in `benefits:`.

**`summary` does real work.** It is the only thing visible in the list before a feat
is opened, and the list is built for the fifty it will hold rather than the four it
holds today. Say what the feat *does*.

If the feat changes an ability score, give it a `boost` as well as the
human-readable `asi` line, so the creation module can apply it:

```yaml
    boost: { ability: str, amount: 1 }                       # fixed
    boost: { choose: any, amount: 1, doubles_for_mental: true, grants_save: true }
```

## Changing character creation

`data/dnd/creation.yaml` is the whole of it. Both halves of the builder read it —
the static rules a no-script reader sees and the eight-step module — so they cannot
drift apart.

**The arrays are majors and minors**, not "physical" and "mental". That is what the
table calls them.

**Both human points may land on the same ability.** `max_per_ability: 2` with
`points: 2` is deliberate: 17 from a major array, +2 here, +1 from Resilient is a 20
at 1st level, and that route is allowed on purpose. Do not "fix" it.

**The 20 cap is on the total**, applied once in `scoreOf()`, not per source.

## The things that will bite you

- **Widget assets ship from the layout, never from a shortcode.** See the long
  note in `partials/skyrim-assets.html`: a `.Scratch`-guarded emit survives a
  dev-server rebuild while Hugo's shortcode cache means only the shortcode you
  touched re-renders, so the one that would have emitted the stylesheet serves
  cached markup that never contained it. The page comes back unstyled and inert
  with no error. `partials/definitions-assets.html` exists to take that job away
  from `shortcodes/term.html`, and it sets the same Scratch keys so the shortcode
  skips its own emission.
- **A new interactive shortcode must be added to the second list in
  `layouts/misc/single.html`**, or it ships with its stylesheet and no script and
  looks fine while doing nothing.
- **Do not put `.term` on a card or a row.** Both listeners bind on `[data-term]`, so
  the class is purely the look of a linked word in prose: accent colour, no padding,
  no border, underlined on hover. `definitions.css` ships *after* `dnd.css`, so on a
  card the class wins and strips the border, background and padding right off — and
  the hover underline runs across both lines of a two-line row. The data attribute is
  the behaviour; the class is only ever the typography.
- **A spanning grid item inflates the tracks it spans.** The feat row was
  `grid-template-columns: auto max-content` with the summary spanning both, and a
  spanning item's max-content contribution is distributed across its tracks — so a
  long summary silently stretched the chip's column across half the row. It is a flex
  column now.
- **A new front-matter key must be registered in
  `partials/func/front-matter.html`**, beside the template that reads it. The
  build fails otherwise, which is the point.
- **Widget roots carry `not-prose`.** The page is `prose: true`, so anything inside
  a widget that Typography would restyle — tables, lists, headings — needs its own
  class. That is what `.dnd-subhead` and the `.dnd-def ul` rule are for. It is also
  why `.prose-measure` in `base.css` excludes `.not-prose`: a widget whose root is
  a bare `<ul>` is a direct child there and would otherwise be capped at 68ch.
- **The picker's cards are `<button>`s.** Only phrasing content may go inside one.
  A `<p>` closes the button early and the bottom half of the card stops being
  clickable — which is why the card text is a `<span>` and why anything passed
  through `markdownify` goes in a `<div>`.
- **The builder re-renders its whole stage on every click.** The two experience
  text fields are the exception: they write to state on `input` and deliberately do
  not re-render, because rebuilding the stage would take the caret with it.
