---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md, and a
# LIVING page: Claude changes monthly, so this one is meant to be revised.
#   - Only what a person does or can make. Background behaviour that's merely
#     neat stays off the page, and prose stays to a line or two per section.
#   - Every list lives in data/claude/*.yaml (capabilities, power-tools,
#     parallel, skill-rules, mods) and renders through shortcodes/claude/; an
#     update is "edit an entry", and the "As of" line in the intro moves.
#   - Every revision adds one dated line to the Changelog, newest last.
#
# youtube : the mods video (the one video still cited), as the flag. Its presence marks the card at /misc/
#           (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/claude/, styled by
# css/pages/claude/claude.css on top of the shared video-notes box, with
# behaviour lazy-loaded from static/js/claude/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Claude"
description: "A living cheat sheet for Claude: what it can make (Docs, Slides, Design, Dashboards, Motion) and on which plans, power-user commands and shortcuts, running work in parallel, rules for writing skills with a linter, and Claude Code mods."
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

## Writing Skills

Rules from Anthropic's updated skill guide. Newer models need less
hand-holding and more structure.

{{< claude/skill-rules >}}

Paste a skill to check it against the rules.

{{< claude/lint >}}

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

## Sources

Checked against Anthropic's
[Claude Code desktop docs](https://code.claude.com/docs/en/desktop),
[commands reference](https://code.claude.com/docs/en/commands),
[Dashboards and Motion](https://claude.com/resources/articles/dashboards-and-motion),
[Motion help](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion),
[projects](https://claude.com/resources/articles/projects-redesigned) and
[skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
Mods are from [a video](https://youtu.be/lDrAZ1wAyVs) and are its claims.
