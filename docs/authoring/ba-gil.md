# Ba-Gil — authoring guide

`/misc/ba-gil/` presents the language. Every fact on it lives in `data/ba-gil/`;
the templates only arrange it, so growing the language is a data edit.

## Where things live

```
content/misc/ba-gil.md                the page: prose between the widgets
data/ba-gil/
  alphabet.yaml                       letter order (as the alphabet's name), vowels, sounds
  families.yaml                       one family per consonant, with a status
  frames.yaml                         frame rows (vowel → word) and the body ladder
  morphemes.yaml                      words and affixes outside any frame
  examples.yaml                       worked compounds: static list + decoder presets
  status.yaml                         built / in progress / next
layouts/shortcodes/ba-gil/*.html      one widget per section
layouts/partials/ba-gil/              gloss line, spatial diagram, assets
layouts/partials/func/ba-gil-*.html   letters (with values) and the merged lexicon
assets/css/pages/ba-gil/ba-gil.css
assets/scripts/pages/ba-gil/          decoder, inversion flip, number converter
```

## Common edits

- **A new word in a frame:** add the vowel to that frame's `slots` in
  `frames.yaml`. The table cell, the decoder and any example using it all pick it up.
- **A new frame:** add an entry to `frames.yaml` (`kind: grid`, the frame's
  `shape`, `slots`). An empty `slots: {}` shows as a hatched "not built yet" row.
- **A word outside the frames:** add it to `morphemes.yaml`. Its shape is read
  off its letters. A form must not be in both files; the build warns if it is.
- **A finished family:** change its `status` in `families.yaml`. The
  "N of 10 established" line counts `done` and `partial`.
- **A new example:** add it to `examples.yaml` with the hyphenated `text` and its
  `meaning`. Glosses come from the lexicon, so a `?` under a piece means that
  piece isn't defined yet.

## Rules the page relies on

- Letter values are positions in the alphabet (`b` = 0 … `t` = 15) and are
  computed, never written down. Reordering `groups` renumbers every number.
- Inversion is detected by shape and position: a CV piece last in a word, or a
  VC piece first, inverts. The decoder applies this; the static examples explain
  it in their `note`.
- `respell: true` marks a word that uses a letter outside the 16. Clear it once
  the word has a legal spelling.
- The script is still in development, so the page uses Latin letters. When glyphs
  exist, they belong in the alphabet widget.
