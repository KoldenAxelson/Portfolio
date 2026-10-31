---
title: 'CodeTurtle'
tier: 1
summary: 'A code reviewer that runs on my Mac and audits a repository against its own written rules. It reports each finding with the rule it breaks and how it would fail, and it can have Claude fix what it found on a branch of its own. Rust underneath, a native macOS app on top. I use it on my own projects; it has not been released.'
tags: ['code-review', 'security', 'static-analysis', 'ai']
types: ['security', 'tooling']
stack: ['Rust', 'tree-sitter', 'Swift', 'SwiftUI', 'Claude Code', 'SARIF']
role: 'Solo build'
year: '2026'
status: 'in-progress'
cover: '/covers/codeturtle.webp'
featured: false
thoughts:
  - 'I spent five years clearing Fortify findings. This is the reviewer I wanted on the other side of that desk.'
  - 'A finding has to name the rule it breaks and say how it fails. Anything less is noise, and noise is why people stop reading reports.'
  - 'The first real run fixed 24 issues in my horse app. Then I noticed none of those fixes had been tested, because I never told it how to run the tests.'
  - 'It leaves no trace in the repo it reviews. The only marks it should ever leave are the fixes.'
---

## Problem

Every project I start gets a copy of the same review know-how: prompts, checklists, the "we never do this here" rules. The copies drift, and within a month each one is a little wrong in its own way.

I also spent five years on the receiving end of a static analyser, resolving more than 1,000 Fortify findings on federal contracts. A long list of flagged lines is easy to produce and hard to act on. What I wanted was a reviewer that holds the method in one place, holds each repository's own rules next to it, and only speaks up when it can say which rule broke and how it would actually fail.

CodeTurtle keeps both halves in its own folder on my machine, keyed by the repository's git remote. The repository itself carries no trace of having been reviewed: after a full audit, `git status` shows nothing.

## Constraints

- **Code leaves the machine only through my own Claude Code.** CodeTurtle starts the `claude` command as a child process and never reads or stores the login. Each review call runs with no tools, in safe mode, from an empty temporary folder, so the reviewer sees the rule and the code and nothing the author wrote about the code. I measured why that matters: without safe mode, Claude Code still slipped the project's own `CLAUDE.md` into the prompt.
- **Few false alarms beats catching everything.** I would rather miss a nitpick than read noise, so the model stages are built to throw candidates out.
- **Spending is visible and capped.** Every audit has a ceiling, every issue severity has one, and a fix prints its plan and estimate and stops until I say yes.
- **It never touches my checkout.** A fix works in a separate working tree and commits to one branch, `codeturtle/staged`. It pushes only when asked, only its own branches, and never with force.

## How it works

I run `ctut repo` inside a repository. The first run registers it with the shipped rule packs for the languages it finds and audits it.

The cheap checks go first and cost nothing: regular expressions, tree-sitter queries, limits on nesting and function length, taint tracking, duplicate blocks, gitleaks, and any scanner that prints SARIF. For rules that need judgement, a prefilter finds candidate lines locally, and a model is asked to disprove each one. If it's unsure, Opus gets one more look. Anything still unsure goes under "Needs a human look". Each quote a model returns is checked against the file first, so an invented finding is dropped before it costs another call. Answers are cached by content, so a second run on unchanged code makes no model calls at all.

The report splits what needs attention today (high and critical by default) from the backlog, which is written in full beside it. Every issue gets a number it keeps across runs, and from there I can ignore it, defer it with a reason, have an agent explore it (read-only, coming back with real, not an issue, or unsure), or have Claude fix it. The fixer can read and edit files in its own working tree and nothing else. The repository's tests decide whether an edit is kept, and the fixed branch is audited again at the end.

The Mac app is an inbox over the same issues, sorted into New, Staged, Completed, Backlog and Ignored, with Explore and Fix buttons that show the cost before anything runs. Every change it makes is a `ctut` command underneath.

## What I've built

- A Rust workspace of four crates, about 47,000 lines. The core library never prints, never reads the environment or the clock, and never starts anything but `git` and the tools it names. Only one crate is allowed to send anything off the machine, and the lint config enforces that. `unwrap`, `expect` and `panic!` are banned outside tests, and `unsafe` is forbidden.
- A language table of 23 tree-sitter grammars, from Python to Odin, and taint tracking that follows data across functions and files.
- Six rule packs: quality, security, hardening, dependencies, judgement and engines. The dependencies pack asks each package registry whether every name in your lockfiles exists, since a package name a model made up is one anyone can register.
- More than 300 Rust tests, all offline. The model stages replay from a recorded cache, so the suite never spends a cent.
- Measurement against code nobody planted. On twenty generated programs it had never seen, the judgement rule found four or five of the eleven hand-labelled weaknesses per run and flagged none of the 47 look-alikes, at about a cent and a half per program. The plain security pack found none of the eleven. One finding was a real bug the human labellers had missed: an invite mailer whose encrypted connection never checked the server's certificate.
- The native macOS app in SwiftUI, about 6,900 lines, with its testable half free of AppKit so its tests also run on Linux.
- The work itself ran from 96 written tickets, each with a "Done when" list that decides whether it's finished.

## Current state

The bulk of it was built over ten days in October 2026, across 152 commits. Its first real job was <a href="/projects/harmony-pulse/" hx-boost="false">Harmony Pulse</a>: 27 explorations and 24 fixes in one sitting, and 17 of those fixes pushed as commits to that repository.

That run is what the next round of work comes from. None of those fixes were tested, because I had never given CodeTurtle a test command for that repository, so the next version warns before fixing anything untested. One fix changed behaviour and went out with nothing to set it apart from the others. The exploration estimate came in about 3.6 times too high. After those comes a head-to-head against CodeQL and Semgrep on a public benchmark.

It isn't released, there's no public repository, and I'm its only user.

## What I'd do differently

Set up the test command before the first fix. The gate was there the whole time; I just gave it nothing to run.

And make the first test fixture harder. My early one was so easy that every model tier scored perfectly, which told me the pipeline worked and nothing else. The useful numbers only started once I measured it on code nobody had planted bugs in.
