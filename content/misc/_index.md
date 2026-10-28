---
title: "Misc"
description: "A junk drawer of personal reference pages — notes, cheat sheets, and odds and ends I keep handy."
layout: "list"
container: "wide"
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "A junk drawer of personal reference pages — the notes and cheat sheets I keep handy."

# The shelves /misc is sorted onto, in the order they render. Every visible
# page under content/misc/ (and every `elsewhere:` entry below) names one of
# these keys in its own `group:` — misc/collect.html fails the build on a page
# with no group or an unknown one, so a new page can't quietly fall off the
# grid. The same list feeds the filter aux button and the page's JSON-LD.
#
# `order:` ranks each shelf's cards by slug, most likely to be clicked first
# (a judgement call, not analytics). A page missing from its shelf's list
# still shows, after the listed ones and alphabetically, and the build warns
# so a new page gets placed on purpose. Read by layouts/partials/misc/collect.html.
groups:
  - key: "play"
    label: "Play with it"
    icon: "play"
    order: ["black-hole", "emergence", "sun", "quotes"]
  - key: "make"
    label: "Make things"
    icon: "pencil-square"
    order: ["writing", "pixel-art", "motion", "vps-protection", "dagea", "ba-gil"]
  - key: "tools"
    label: "Tools"
    icon: "wrench-screwdriver"
    order: ["skyrim", "dnd", "rule-zero", "viva-pinata-tip", "drafts"]
  - key: "reference"
    label: "Reference"
    icon: "bookmark"
    order: ["cool-sites", "tech-watch", "claude", "fathers-puzzle", "brine-mining"]
  - key: "learn"
    label: "Learn"
    icon: "academic-cap"
    order: ["how-to-learn", "python-for-ml", "basic-logic"]
  - key: "better"
    label: "Get better"
    icon: "arrow-trending-up"
    order: ["resume-tips", "working-for-yourself", "ikigai", "getting-known", "get-moving"]
  - key: "about"
    label: "About me"
    icon: "user"
    order: ["impossible-list", "genes", "now", "uses"]

# Pages that belong on this shelf but live outside content/misc/, so their URLs
# stay where they are (/now, /uses — both are linked from elsewhere and indexed
# under those paths). Rendered as ordinary cards and searched the same way;
# only the href differs. See layouts/misc/list.html.
elsewhere:
  - label: "Inspirational Quotes"
    href: "/quotes"
    icon: "quote"
    group: "play"
    blurb: "The lines I keep coming back to, shuffled fresh on every visit."
  - label: "Now"
    href: "/now"
    icon: "clock"
    group: "about"
    blurb: "What I'm focused on right now. A /now page, the idea Derek Sivers collects at nownownow.com."
  - label: "Impossible List"
    href: "/impossible-list"
    icon: "flag"
    group: "about"
    blurb: "Things I want to build, learn, and do, plus the games I'm playing and the books I'm reading."
  - label: "Uses"
    href: "/uses"
    icon: "desktop"
    group: "about"
    blurb: "The gear, software and setup I work with. A /uses page, like the ones Wes Bos collects at uses.tech."
---
