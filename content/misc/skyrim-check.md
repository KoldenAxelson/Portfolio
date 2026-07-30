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

Runs the same bundle `/misc/skyrim/` ships, in a real browser, with no test
runner — the site's build is deliberately Node-free and a framework would be the
first thing to break that. Open this page after touching anything under
`assets/js/skyrim/`; the tab title reads `PASS` or `FAIL (n)`, so a headless
driver can check it without parsing the page.

It asserts numbers that are documented somewhere — UESP's anchors, the 122% I
measured in game — and structure a refactor could silently drop. Not appearance;
that is what screenshots are for, and screenshots are exactly what missed the two
bugs this page exists because of.

{{< skyrim-selfcheck >}}

<div hidden>{{< potion-builder >}}</div>
