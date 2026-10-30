---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md, and a
# LIVING page: Claude changes monthly, so this one is meant to be revised.
#   - Only what a person does or can make. Background behaviour that's merely
#     neat stays off the page, and prose stays to a line or two per section.
#   - Every list lives in data/claude/*.yaml (capabilities, power-tools,
#     parallel, workflows, skill-rules, skills, mods) and renders through shortcodes/claude/; an
#     update is "edit an entry", and the "As of" line in the intro moves.
#   - Every revision adds one dated line to the Changelog, newest last.
#
# youtube : the mods video, as the flag (two more are cited under Sources). Its
#           presence marks the card at /misc/ (partials/misc/card.html) and
#           ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/claude/, styled by
# css/pages/claude/claude.css on top of the shared video-notes box, with
# behaviour lazy-loaded from static/js/claude/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Claude"
description: "A living cheat sheet for Claude: what it can make (Docs, Slides, Design, Dashboards, Motion) and on which plans, power-user commands and shortcuts, running work in parallel, planning work with folders and the Elephant-Goldfish model, rules for writing skills with a linter, a shelf of favourite skills (a native Mac app builder, a pay-per-use image and video generator), and Claude Code mods."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Keeping up, one revision at a time."
blurb: "A living cheat sheet for Claude: what it can make, power-user shortcuts, parallel sessions, skill-writing rules and mods."
icon: "robot"
group: "reference"
prose: true
youtube: "https://youtu.be/lDrAZ1wAyVs"
---
What Claude can do and how to drive it, as of October 2026.

## Expanded Capabilities

Ask for any of these in a chat and Claude makes it as a live page you can edit,
comment on and share.

{{< claude/capabilities >}}

## Power User Tools

{{< claude/power-tools >}}

## Parallel Work

Two ways to run several jobs at once.

{{< claude/parallel >}}

## Planning the Work

Two ways to set the work up before Claude starts. They agree on one thing:
the useful structure is files Claude can read.

{{< claude/parallel "workflows" >}}

{{< claude/egm-flow >}}

If you install EGM, read the CLAUDE.md it writes. In AI LABS' test, Claude
added a line from memory saying subagents can't start subagents, which is no
longer true and stops the review from running as designed.

## Writing Skills

Rules from Anthropic's updated skill guide. Newer models need less
hand-holding and more structure.

{{< claude/skill-rules >}}

Paste a skill to check it against the rules.

{{< claude/lint >}}

## Skill Shelf

Skills I'd reach for again, kept here so I don't have to find them twice.
The claims on each card are their makers', not my tests.

{{< claude/skills >}}

BAMA's maker says its speed loop cut his video editor's export time tenfold,
and the /generate video puts GPT Image 2 at 5 cents for a 2K image on Kie.ai,
against roughly 31 to 34 cents through Higgsfield's plans. Kie.ai is the
cheapest but sometimes unreliable, so he defaults to fal.ai and uses WaveSpeed
for models fal doesn't have.

## Mods

Add-ons that change Claude Code itself. Describe one to Claude to build it;
it lasts one session unless you ask Claude to save it as a plugin. Needs
Claude Code 2.1.287 or newer, in the terminal or the desktop Code tab.

{{< claude/mods >}}

Start with Blast Radius and Reflect.

## Changelog

- October 16, 2026: first version.
- October 27, 2026: rebuilt as a cheat sheet: capabilities, power-user tools
  and parallel work added; background explainers cut.
- October 28, 2026: Planning the Work added, from two videos and the EGM
  README.
- October 30, 2026: Skill Shelf added, with BAMA and /generate.

## Sources {#sources}

Checked against Anthropic's own docs and help pages where they cover it. The
mods, "folders, not agents" and the Elephant-Goldfish walkthrough come from
videos and are their claims, with the EGM command names and the
not-an-official-product note checked against the repo's README, which credits
Dave Rensin's essay for the idea. The skill shelf's speed and price figures
are the videos' own, from October 2026; I checked BAMA's repo exists and is
free, and haven't run either skill yet.

{{< ml/references >}}
