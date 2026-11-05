---
# ── Page front matter ────────────────────────────────────────────────────────
# A typing speed test. The page is the widget: layouts/shortcodes/typing-speed/
# test.html, run by assets/scripts/pages/typing-speed/ (main.ts, text.ts,
# library.ts), styled by css/pages/typing-speed/typing-speed.css. Durations and
# random words: data/typing-speed/test.yaml. Passages: the published articles
# and data/typing-speed/books/ (built by scripts/typing-speed/build-books.py),
# both published as JSON by partials/typing-speed/library.html. Assets ship
# from layouts/misc/single.html.
# ─────────────────────────────────────────────────────────────────────────────
title: "Typing Speed"
description: "A typing speed test in the browser: timed random words, or type my articles, a classic from Project Gutenberg (Marcus Aurelius, Aesop, Homer, Plato, Epictetus, Boethius) or your own text, scored in words per minute with accuracy, live momentum bars and a personal best. The clock stops when you pause."
blurb: "How fast can you type? Random words, my articles, a classic or your own text, with live momentum bars."
icon: "keyboard"
group: "play"
---

{{< typing-speed/test >}}
