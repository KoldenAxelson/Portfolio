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
groups:
  - key: "play"
    label: "Play with it"
    icon: "play"
  - key: "make"
    label: "Make things"
    icon: "pencil-square"
  - key: "tools"
    label: "Tools"
    icon: "wrench-screwdriver"
  - key: "reference"
    label: "Reference"
    icon: "bookmark"
  - key: "learn"
    label: "Learn"
    icon: "academic-cap"
  - key: "better"
    label: "Get better"
    icon: "arrow-trending-up"
  - key: "about"
    label: "About me"
    icon: "user"

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
  - label: "Impossible List"
    href: "/impossible-list"
    icon: "flag"
    group: "about"
    blurb: "Things I want to build, learn, and do, plus the games I'm playing and the books I'm reading."
  - label: "Uses"
    href: "/uses"
    icon: "desktop"
    group: "about"
---
