---
# ── Page front matter ────────────────────────────────────────────────────────
# A PLAN, not a build: the fork of Hugh Howey's NEO I might make for writing
# Grunt Force. Nothing here exists yet. When the fork does, this page becomes
# its notes; until then, change the plan here.
#
# NEO's facts (files, rules, the More Features switch) were read from the repo
# at version 1.6.1, October 2026; recheck them before building. Its Tech Watch
# card is in data/tech-watch/items.yaml and links back here.
#
# shelf + label : the "Writing utilities" shelf of /misc/writing/, with a label
#                 in place of a story count (writing/book-card.html).
# ─────────────────────────────────────────────────────────────────────────────
title: "The NEO Fork"
description: "A plan for forking NEO, Hugh Howey's open-source word processor for authors, into a version for writing Grunt Force: a sentence shape suggester that waits for a pause, revision passes you ask for, and outline cards that ask questions."
lead: "Helpful distractions for a novel, planned"
cover: "neo-fork"
shelf: "Writing utilities"
label: "Fork plan"
weight: 4
---

[NEO](/misc/tech-watch/) is Hugh Howey's word processor for authors: free,
MIT licensed, and built on the idea that nothing should get between you and
the next sentence. I want to fork it for
[Grunt Force](/misc/writing/grunt-force/) and add a few distractions, the kind
that push the next sentence along instead of pulling me away from it. This page
is the plan. Nothing here is built yet.

## Why NEO

It's small enough to change. NEO is plain JavaScript in Electron with no build
step: one file for the window and the disk, one for the whole interface, and a
bridge between them. Books are plain files, chapters as HTML and metadata as
JSON, so anything I add can read the manuscript without a database in the way.
The repo even ships notes for coding agents, which makes it friendly to work on
with Claude.

## The rule I'm bending, carefully

Hugh's first ground rule is that nothing interrupts a writer mid-sentence: no
popups, no squiggles, no notifications while typing. I want to keep it. Every
distraction in the fork waits for a pause, a full stop and a beat of silence,
and shows up as a gray ghost line under the cursor, styled like the ghost
lines NEO already uses for outline notes but gone the moment I start typing. They stay off
until switched on, behind NEO's own "Show More Features" switch, and they're
drawn with the CSS Highlight API the way NEO draws search results, so none of
it is ever saved into a chapter file.

## The sentence shape suggester

You finish a sentence and stop. A faint line appears: *Try a short one. Your
last five sentences all ran 18 to 26 words.* That's the whole feature. It names
one of the nine shapes from my
[Writing Techniques](/misc/writing/writing-techniques/) notes and says why in
one line. It never writes the sentence for me.

It decides in two layers.

### The rhythm layer

Plain rules, instant and offline. It measures the current
scene's sentences and punctuation, using the rules from my Writing Techniques
notes:

| What it sees | What it suggests |
|---|---|
| A very long sentence just ended | Three to five words, to land it |
| Three or more sentences of about the same length | Break the run, either way |
| Nothing under four words for a while | A short sentence |
| Three short ones in a row | A long sentence, or a delay |
| Three openings in a row that start with the subject | Open on a clause, or a short word and a comma |
| A three-part sentence just ended | Anything but another three-part one |
| A paragraph whose sentences keep shrinking | Finish the funnel with a short one |
| A shape this chapter hasn't used yet | That shape, as a nudge |

### The story layer

Optional, and it reads meaning. It sends the scene so far, the
chapter's outline note and the narrator's name to a local model on my own
machine, through Ollama, the same setup that runs this site's chat assistant,
so the manuscript never leaves the computer. It picks the shape that fits what
the scene is doing: a delay before a reveal, a reversal when a promise sours,
a list when a character sizes up a room.

### Narrator leans

Each narrator gets a lean, from the voices in my style guide: Owen long and
anxious, so pile-ons and long sentences; Kevin dry and clinical, so short
sentences and contrasts; Andre quick and guarded, so short ones and lists;
Mateo warm, so building sentences and echoes. Those leans are my guesses. Once
each narrator has a voice sheet (the eight parts in Writing Techniques), the
leans come from the sheet, and the fork can measure whether a chapter matches
its narrator: sentence length, passive voice, hedges, the words they repeat.

## Revision passes

The suggester is the only thing that talks while I draft. Everything else is a
pass I ask for, the way NEO already makes spellcheck something you invoke. Each
pass marks the text with the CSS Highlight API and a margin list, and none of
them rewrites a word.

### What each pass flags

- Words to cut: the table from Writing Techniques, counted per thousand words,
  with dialogue left out of the hedge count.
- Point of view: since every chapter has one narrator, flag the narrator
  describing their own face, thought tags like "she thought", and filter verbs
  after the narrator's name.
- Clutter: three prepositional phrases in a row, body language that repeats
  itself ("nodded her head"), and sentences that only move someone between rooms.
- Description: a long block with no dialogue at a chapter's start, paragraphs
  that only use sight, and a first description of someone that leads with eye
  and hair colour.
- Dialogue: an action beat on every line, or long runs with none, and a
  voice check that compares each speaker's words, sentence length and pet
  phrases.
- Time and cast: a chapter whose first two sentences don't say when we are,
  and paragraphs that introduce more than two new names.

## Outline cards that ask questions

NEO's outline already lays every chapter and section out as an index card. The
fork would add a few optional fields to each card, from the scene methods in my
notes: what the scene's question is, its forwarding device (new information, a
decision not acted on yet, or a complication), whether it ends on "yes, but" or
"no, and", its one tentpole moment and its one revelation. An empty field is a
quiet gray prompt, never a warning.

A book view would chart what a card can't see: chapter lengths in a row,
dialogue share per chapter (two or three heavy ones in a row drag), runs of
fast chapters with no breather, and which narrator has gone longest without a
chapter.

## How it would fit in

- The rhythm rules and the passes live in new files of pure functions, so they're tested
  with Node's own test runner the way NEO tests its spellcheck and dashes.
- The suggester hooks into the typing section of NEO's interface file and borrows
  the outline notes' ghost styling for its line.
- The model call goes through NEO's bridge to the main process, since NEO's
  window never touches the disk or the network itself.
- New code stays in its own files where possible, so pulling Hugh's updates
  into the fork stays easy.

## Open questions

What counts as a pause: a full stop, an Enter, or two seconds of nothing?
Whether the suggestion should stay until dismissed or fade on the next
keystroke. Which local model is small enough to answer before I've started the
next sentence anyway. And whether the fork needs a name of its own.

## Sources {#sources}

NEO's features come from Hugh's video and the repo's README; its rules,
structure and More Features switch from the repo's contributing guide and
agent notes, read at version 1.6.1 in October 2026. The rules the suggester
and the passes would check come from the Bookfox videos digested in my
[Writing Techniques](/misc/writing/writing-techniques/#sources) notes, where
each one has its source card. The plan is mine.

{{< ml/references >}}
