---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md, and a
# LIVING page: Claude changes monthly, so this one is meant to be revised.
#   - "Where it stands now" opens with "As of <month year>" and is rewritten,
#     not appended to, on each revision.
#   - The two lists that grow (skill rules, mods) live in data/claude/*.yaml and
#     render through shortcodes/claude/; an update is "add an entry".
#   - Every revision adds one dated line to the Changelog, newest last.
#
# youtube : the skills video, as the flag. Its presence marks the card at /misc/
#           (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/claude/, styled by
# css/pages/claude/claude.css on top of the shared video-notes box, with
# behaviour lazy-loaded from static/js/claude/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Claude"
description: "A living page for keeping up with Claude: the current rules for writing skills (with a linter), what Claude Code mods are and which ones are worth installing, and why cheaper AI code means more code and bigger systems than the AI can hold."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Keeping up, one revision at a time."
blurb: "A living page on keeping up with Claude: skill-writing rules with a linter, Claude Code mods, and why cheap AI code makes systems the AI can't hold."
icon: "robot"
prose: true
youtube: "https://youtu.be/VQyYzLJ6xos"
---

Claude changes faster than I can keep a mental model of it, and most of what I
learn arrives as a video I half remember a week later. This page is where
those notes go instead. It's meant to be revised: the lists live in data
files, the summary up top gets rewritten each time, and the changelog at the
bottom says what moved.

## Where it stands now

As of October 2026, the 5.5 models are out, and Opus and Fable are the most
capable. Anthropic updated its guide to writing skills alongside
them, and some of what used to work now wastes tokens or holds the newer
models back. On the first of October Claude Code got mods: add-ons, built by
describing them to Claude, that change how Claude Code itself looks and works.

## Writing skills

The skills video walks through Anthropic's updated best-practices guide. I
checked it against the guide itself, and everything below except the last rule
is in there, mostly word for word. The surprise for me was the preview
behavior: a file Claude reaches through another file may only get its first
hundred lines read, so anything important further down might as well not
exist.

{{< claude/skill-rules >}}

The thread through all of them is that newer models need less hand-holding and
more structure. Skills written for older models over-explain, and over-explained
skills can make the output worse. A rule that would cost you if broken moves
into code.

Most of these can be checked from the text alone, so here's a checker. The
sample is a deliberately bad invoicing skill.

{{< claude/lint >}}

## Mods

A skill tells Claude how to do a job. A connector plugs Claude into another
app. A mod runs inside Claude Code and changes Claude Code itself: extra
panels, a progress bar, a confirmation before something risky. Under the hood,
Claude Code emits an event for everything it does, and a mod is a small piece
of code that listens for those events and can watch them, change them, or
handle them itself.

Making one means describing it to Claude, which has a built-in skill for
building them. The video's practical notes: mods need Claude Code 2.1.287 or
newer, they work in the terminal and the desktop app's code tab (not yet the
VS Code extension, as of recording), a new mod lasts only for the session until
you ask Claude to save it as a plugin, and most run as plain code with no token
cost unless they call a model. These are the nine it rates:

{{< claude/mods >}}

The two I'd install first are Blast Radius and Reflect. One is a safety net for
the one mistake an agent can make that I can't undo, and the other turns a
correction I'd otherwise repeat next week into a rule.

## Too much code

The third video argues that the trouble with AI code now is its volume. When
building a feature gets cheaper, more of the backlog becomes worth building, so
a company ends up spending more on software. That's Jevons'
paradox, the same thing that happened to coal when steam engines got more
efficient.

{{< claude/jevons >}}

More code makes bigger systems, and the bigger the system, the less of it any
model can see at once. The video walks through why each fix leaks:

- The context window is a hard limit. A change can look fine inside it and
  break a module outside it, or call a function it can't see and guess the
  wrong return shape. A loop that looks linear can call something outside the
  window that is itself linear, and quietly become quadratic.
- A bigger window costs more and still has blind spots. Models attend best to
  the start and end of long input and lose things in the middle, and standard
  attention compares every token with every earlier one, so doubling the window
  roughly quadruples the work.
- Sparse attention cuts the comparisons by skipping most pairs, which means it
  can skip the one that mattered.
- Retrieval searches the codebase for what's needed, but it can only find
  links that exist in the code. The video's example: a change applies a
  discount before writing an order, a nightly report that reads the same table
  subtracts it again, and nothing in the edited code ever mentions the report.

The conclusion is a loop: AI makes more code, more code makes systems too large
for AI to hold, and those systems get maintained with more AI.

## What I changed

A page about rules is only worth something if I follow them, so I ran both
videos against this site's own agent files.

- Every skill file over a hundred lines now opens with a one-line contents
  list, so a partial read still knows what's further down.
- The video-notes skill now lists every file it depends on directly instead of
  through a chain, and its final checks are a checklist to copy and tick, with
  go-back lines.
- The code standards gained a sixth rule, from the nightly-report example:
  when two files depend on each other through something no search would find
  (a shared string, a data key, a table), name the other end in a comment at
  both ends, and treat deleting replaced code as part of the change.

Still on the list: the skill descriptions are written as instructions rather
than in the third person, and a couple of rules this repo states in capitals
("never overwrite `bin/`") are candidates for hooks.

## Changelog

- October 16, 2026: first version, from three videos on skills, mods and AI
  code volume.

## Source

Three videos, watched in October 2026. The skill rules were checked against
Anthropic's [skill best-practices guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices);
the hooks rule and everything about mods are the videos' claims, and the mod
names are as the captions give them. Both Claude videos end in a pitch for a
paid community, which I've left out.

- [Claude skills changed: ten new rules](https://youtu.be/VQyYzLJ6xos): Anthropic's updated skill guide, rule by rule.
- [Nine Claude Code mods worth installing](https://youtu.be/lDrAZ1wAyVs): what mods are, how they work, and nine to try.
- [The paradox of AI code](https://youtu.be/k2qls2LiBRc): Jevons' paradox for features, and the context-window limits that follow.
