---
# ── Page front matter ────────────────────────────────────────────────────────
# A toy: game-style mumble voices synthesized from the text as it types, no
# recordings.
#
# youtube : the Mythfall devlog the system is rebuilt from. Its presence marks
#           the card at /misc/ and ships the widget assets
#           (partials/video-notes/assets.html). The credit and other sources
#           are the carousel, data/ml/references/npc-voices.yaml.
#
# The page is the widget and its sources; no prose. The widget is
# layouts/shortcodes/npc-voices/lab.html around partials/npc-voices/box.html,
# styled by css/pages/npc-voices/npc-voices.css, run by
# static/js/npc-voices/nv-voice.js. Simple view's choices are
# data/npc-voices/picker.yaml, Advanced view's knobs lab.yaml, presets
# voices.yaml. The old explanatory notes are in private/reference/npc-voices/.
# prose   : Tailwind Typography, for the Sources heading. The widget root
#           carries `not-prose`.
# ─────────────────────────────────────────────────────────────────────────────
title: "NPC Voices"
description: "Make a game character talk: mumble-speech voices like Animal Crossing's and Undertale's, synthesized in your browser from the text as it types, with no recordings. Pick a voice, age, mood and style, or open every knob."
blurb: "Make a game character mumble your line, Animal Crossing style. Pick a voice in a few taps or pull every slider."
icon: "speaker-wave"
group: "play"
prose: true
youtube: "https://youtu.be/NaW0d7Tghw0"
---

{{< npc-voices/lab >}}

## Sources {#sources}

{{< ml/references >}}
