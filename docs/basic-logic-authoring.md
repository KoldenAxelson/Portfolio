# Basic Logic — authoring guide

The **Basic Logic** section revives an out-of-print logic workbook, chapter by
chapter. This guide is how to write one.

## The shape of a chapter

Chapter 1 is the reference implementation, and it follows five rules. They exist
because a workbook read on a screen is not a workbook read on paper — the reader
can ask the page a question, and the page can answer without losing their place.

**1. Prose is plain, and it carries no definitions.** Short sentences, everyday
words. A definition never sits in the body text. Vocabulary appears as a
`{{< term >}}` link and the definition is one click away, so a reader who already
knows the word is never made to read past it.

**2. Headings are the exception, not the skeleton.** Chapter 1 has exactly one
(`## Homework`), separating the lesson from the exercises. Numbered sections make
a chapter feel like a queue to be worked through; the aim is a page you can enter
anywhere.

**3. A term's wording in the prose is the vocabulary.** Change the sentence
around it, never the word itself. When editing prose, diff the `{{< term >}}`
blocks before and after — see "Guarding the vocabulary" below.

**4. Show it if it can be shown.** Most definitions carry a `figure`: a small
diagram built in `assets/scripts/site/def-figures.ts`. Prefer ONE drawing reused
with different parts highlighted over a new drawing per term — five terms sharing
the argument map is what teaches that they are parts of one structure.

**5. Examples move.** A static example is read once. The `{{< arg-showcase >}}`
box walks one argument through the terms, captioned "Argument Example — <term>",
highlighting the part each term names.

## Where things live

```
content/misc/basic-logic/
  _index.md              ← section landing (chapters auto-list below the intro)
  chapter-01.md          ← one file per chapter
data/glossary/
  basic-logic.yaml       ← every definition, and its figure
data/argsets/
  showcase-ch01.yaml     ← the cycling Argument Example boxes
  evaluate-ch01.yaml
  standard-form-ch01.yaml, indicators-ch01.yaml,
  recognize-ch01.yaml, validity-ch01.yaml   ← the four exercises
layouts/shortcodes/
  term.html, arg.html, arg-showcase.html, and the four exercise mounts
assets/scripts/site/
  glossary.ts            ← definition data + rendering (shared desktop/mobile)
  definitions.ts         ← the desktop definition windows
  def-figures.ts         ← the micro-diagrams
assets/scripts/pages/
  arg-showcase.js        ← the cycling example box
```

`_index.md` cascades `type: "basic-logic"`, so chapters render through
`layouts/basic-logic/*` and their styling is isolated from the rest of the site.

## Adding a chapter

```markdown
---
title: "Chapter N: Title Here"
lead: "One line under the banner."
description: "Slightly longer, for SEO and the card blurb."
weight: N            # chapter order; lower sorts first. Always set this.
# hidden: true       # keep a WIP chapter off the list (still builds a page)
# draft: true        # exclude from the built site entirely
---

Plain prose, with {{</* term "key" */>}}vocabulary{{</* /term */>}} linked as it appears.

{{</* arg-showcase set="showcase-chNN" */>}}

## Homework

A sentence framing each exercise, then its widget.

{{</* arg-builder set="standard-form-chNN" */>}}
```

## Writing a definition

Definitions live in `data/glossary/basic-logic.yaml`, never in the chapter:

```yaml
premise:
  term: Premise                       # heading shown in the window
  definition: A [[statement|statement]] that supports the [[conclusion|conclusion]].
  figure:
    kind: argument-map
    highlight: premises
```

- `[[key|display text]]` marks a cross-reference. **Always** use the two-part
  form, so hyphenated keys read correctly. On desktop a reference opens another
  window; on mobile it replaces the panel.
- `**bold**` works in a definition.
- `wordgroups` adds word lists. The shape follows the data: one unlabelled group
  renders as chips, two or more labelled groups render as a comparison table.

### Figure kinds

| `kind` | What it shows | Used by |
|---|---|---|
| `argument-map` | Two premises flowing into a conclusion. `highlight` lights one part (`p1`, `p2`, `c`, `premises`, `conclusion`, `links`, `all`); `cycle: [p1, p2, c]` walks the highlight around instead of holding one | argument, premise, conclusion, support, statement |
| `madlib` | One sentence cycling a word, with the live word lit in the entry's chips | the three indicator terms |
| `standard-form` | The premises, a rule, then the conclusion | standard-form |
| `truth-values` | Two rows of statement → line → value, landing on a blue T and a red F | truth-value |
| `reasoning` | The argument map with the premises carrying true/false — one false premise loses the conclusion | reasoning |
| `infer` | One statement and the value read off it | infer |
| `pipeline` | Stages checking off in order. `mode: ring` swaps the conclusion's check for a partial ring (`target`, `threshold`) | deductive, inductive |
| `evaluate` | The argument shifted left with the two verdicts it is judged against beside it. `mode: validity \| soundness \| strength \| cogency` picks which one moves | validity, soundness, strength, cogency |
| `advice` | A crowned source flowing to a target, with struck-out truth values under the line | advice |
| `belief` | Advice's shape in the accent colour, with a lone T | statement-of-belief |
| `warning` | Advice's shape with a caution triangle | warning |
| `conditional` | One bubble pointing at two, lighting one route at a time | conditional |
| `expository` | A topic, a panel of elaboration, then the rest. `glyph: eye \| book` marks what the elaboration is made of — book is what makes it an explanation | expository, explanation |
| `illustration` | A line that stops half way for its examples, then carries on | illustration |
| `report` | The world on one side, information about it on the other | report |

Adding a kind means a `case` in `renderFigure` and a block of CSS in
`assets/css/definitions.css`. Two house rules, both learned the hard way:

- **Animate the smallest unit that changed, and never branch the animation on
  which content it is.** A per-content special case is how one word ends up
  refreshing a whole sentence while its neighbours do not.
- **Every loop must be self-cleaning.** Check `isConnected` on each hop, or a
  closed window leaves a timer running forever.

## Guarding the vocabulary

Prose edits must not quietly reword a term. Before committing a language pass,
diff the term blocks:

```bash
python3 - <<'EOF'
import re
T = re.compile(r'\{\{<\s*term\s+"([a-z0-9-]+)"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', re.S)
def uses(p):
    d = {}
    for k, v in T.findall(open(p).read()): d.setdefault(k, set()).add(v)
    return d
before, after = uses('chapter-01.before'), uses('chapter-01.md')
for k in sorted(set(before) | set(after)):
    if before.get(k) != after.get(k):
        print(k, sorted(before.get(k, [])), '->', sorted(after.get(k, [])))
EOF
```

Everything it prints should be a change you meant — a case shift for sentence
position, a singular/plural, or a typo fix. Anything else is a term that lost its
wording.

## Checking your work

```bash
make typecheck        # tsgo, strict; CI blocks on it
make css && hugo      # a bad glossary key logs a build warning, never breaks the page
hugo server           # then read /misc/basic-logic/
```

Worth checking by hand, because none of it is caught by a build: the page with
JavaScript off (every widget has a server-rendered fallback and should still be
readable), and `prefers-reduced-motion`, where every animation should land on a
sensible static state rather than nothing at all.
