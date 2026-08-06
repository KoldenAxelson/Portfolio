---
title: "Skyrim self-check"
description: "Assertions for the Skyrim page's maths and markup, run in the browser."
lead: "Green or it is not."
icon: "shield-check"
container: "wide"
prose: true
# Kept off the Misc index and out of the sitemap: it is a development tool, not
# something a visitor has any use for.
hidden: true
sitemap_exclude: true
updated: 2026-07-29
---

Runs the same modules `/misc/skyrim/` ships, in a real browser, with no test
runner — the site's build is deliberately Node-free and a framework would be the
first thing to break that. Open this page after touching anything under
`assets/js/skyrim/`; the tab title reads `PASS — self-check` or `FAIL (n) — self-check`, so a headless
driver can check it without parsing the page.

The unminified caveat is in the shortcode's own header, where the second esbuild pass that
causes it lives.

It asserts numbers that are documented somewhere — UESP's anchors, the 120% I
measured in game — and structure a refactor could silently drop. Not appearance;
that is what screenshots are for, and screenshots are exactly what missed the two
bugs this page exists because of.

**Green here is only half the gate.** Hugo's esbuild strips TypeScript types without
checking them, so this page can be entirely green over code that does not typecheck. The
other half is `tsc --noEmit` against the repo's `tsconfig.json`, which is editor-only —
nothing in the build runs it. Do both before pushing.

{{< skyrim-selfcheck >}}

<div hidden>{{< potion-builder >}}</div>
