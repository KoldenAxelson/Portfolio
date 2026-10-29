---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The page
# for game audio and voice tricks; new videos on making games sound alive fold
# in here.
#
# youtube : the Mythfall devlog, as the flag. Its presence marks the card at
#           /misc/ (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/npc-voices/ (build, cast, lab) around
# partials/npc-voices/box.html, styled by css/pages/npc-voices/npc-voices.css on
# top of the shared video-notes box, with one script for all three,
# static/js/npc-voices/nv-voice.js. The cast and the build-up steps are data:
# data/npc-voices/voices.yaml, stages.yaml and lab.yaml (every knob in the lab).
# ─────────────────────────────────────────────────────────────────────────────
title: "NPC Voices"
description: "Notes on UnitOfTime's Mythfall devlog about mumble speech: NPC voices synthesized from the dialogue text as it types, with no recordings. The typewriter rhythm, vowels from a buzz and a tube, a cast from tube length, and a tune from punctuation, with a live rebuild you can play."
blurb: "Mumble-speech NPC voices built from the text as it types, with no recordings. A live rebuild you can step through and give your own lines."
icon: "speaker-wave"
group: "make"
prose: true
youtube: "https://youtu.be/NaW0d7Tghw0"
---

UnitOfTime is building Mythfall, a bullet hell MMO that runs in the browser,
from scratch, and posts devlogs as it goes. In this one the NPCs stop being
silent. They mumble now, the way Animal Crossing villagers do, and none of it
is recorded: the game builds every sound from the dialogue text while you
read. I've watched a lot of devlogs, and this is one of the few I finished
wanting to build the thing myself, so I did, and it's on this page.

These are my notes on the video and a rebuild of the system in your browser
from its description. The idea that holds it together is that the text
already knows how it should sound.

## Three flavors of mumble

The video sorts the games that do this into three kinds. Undertale plays one beep
per letter, with a different beep for each character. Banjo-Kazooie plays a
handful of grunts per character in random order while the text scrolls.
Animal Crossing has a tiny sound for every letter of the alphabet and plays
them back so fast it almost sounds like words.

Why not hire voice actors? It's a one-person project whose dialogue gets rewritten constantly,
and in a browser game every sound file is something the player has to
download. Mumble speech is tiny and never goes out of date.

## The typewriter is the clock

Everything hangs off the text box. Letters appear one at a time on a single
timer, and how long the timer waits depends on the letter it just typed: about
a thirtieth of a second for a letter, three times that after a comma, and
twice as long again after a period, question mark or exclamation mark. So the
text has a rhythm before there's any sound, pausing where a person would
breathe.

The sound hangs off the same timer. The letter appearing is what plays the
sound, so there's no separate track to line up and the voice can't drift from
the text. Step through the whole build below as you read; each step is one
fix from the video.

{{< npc-voices/build >}}

A beep per letter is about 30 sounds a second, which is a buzz. The first idea
was a random pitch for every beep, and that's worse. Random notes don't sound
like talking. That leaves two problems: too many sounds, and each one is just
a beep.

## A buzz and a tube

Fixing the beep meant learning what a voice is, and it's two parts. Your vocal
folds make a plain buzz, a bit like a kazoo. Your throat and mouth make a tube
the buzz travels through, and a tube makes some pitches louder and others
quieter. Changing the shape of your mouth changes which ones, and that's all
a vowel is: hum one note and slide from "ah" to "ee", and the note stays the
same while only the tube changes.

So the script makes a buzz and boosts three bands of pitch per vowel, with the
numbers taken from old speech research. That gave six vowels with no
microphone anywhere, and they sounded like a steel drum.

## Three fixes that make it hum

Each fix is one way the synthetic voice was too clean, and step 4 in the demo
is where it starts sounding like someone humming. The sound started loud
and faded, which is the shape of something being hit, while a voice swells,
holds and lets go. A real voice is a buzz with some breath mixed in, so a little soft
noise goes in. And vocal folds never buzz exactly the same way
twice, and perfectly even sounds like a robot, so every cycle is now slightly
off from the last.

## A cast from one script

The easy way to give everyone their own voice is pitch: lower for a guard,
higher for someone small. That works until you want a woman's voice, because
pitching a man's voice up just sounds like the same guy straining. Pitch only
changes the buzz, and a different person also has a different size tube. A
shorter tube moves all three bands up together, and an even shorter one gives
a child.

The same knobs gave a pirate who mutters with his mouth almost closed. My
favorite is the old voice. The first guess was that old means deep, and the
second was more random pitch, which sounded drunk. What works is a slow, steady wobble about twice a
second.

## One sound per syllable

The trick that made the whole thing work: English has roughly one vowel sound
per syllable, so the game only plays a sound where a group of vowels starts
and every other letter stays quiet. That takes it from 30 sounds a second to
about 10, which is fast, chatty talking. The letter also picks the vowel (an
A plays "ah", two O's play "oo"), so the same line sounds the same every time
and names start to have a shape.

The video tried consonants too, little puffs of noise for letters like S, T and K.
They sounded like clicks, so they came out.

## Punctuation is the tune

When people talk, pitch drifts down through a phrase and jumps back up when
the next one starts, so the game does that and resets at every comma. The
punctuation at the end changes the tune: a question mark lifts the last word,
an exclamation mark starts the phrase high, three dots fade the voice out, and
a word in capitals is a shout. None of it is written per line. It's all read
from punctuation the dialogue already had.

Each sound's pitch is four things added together: the character's own voice,
where the letter sits in its phrase, a tiny random nudge, and the wobble if
they're old. Each sound also lasts a little longer than the gap to the next,
so they overlap into one stream of babble. Give the cast your own line.

{{< npc-voices/cast >}}

The same timer carries two extras. A line can fire a sound effect at an exact
letter, which is how Mythfall's cats purr mid-sentence. And pressing the button while
a line is typing shows it all at once; the voice just stops, because there are
no letters left to type.

## Make your own

Everything above, with every knob out on the table. Start from someone in the
cast or from scratch, type their line, and pull the sliders. The drawing shows
what the tube does to the buzz: the curve is the three bands, the lines are the
buzz's harmonics, and moving the tube or the mouth moves the bands under them.

{{< npc-voices/lab >}}

## What it comes down to

The video's three lessons, and I agree with all of them after building it: the rhythm
matters more than the sound, a little imperfection is what makes a sound feel
human, and punctuation gives you the tune for free. Every voice in Mythfall
together comes to about half a megabyte, and a new character's voice is one
line. My rebuild's whole cast is six entries in a data file and no audio files
at all, which still delights me, and a voice you make in the lab copies out as
a seventh.

## Source

One video, watched in October 2026. Everything above is my synthesis of the
video's explanation, and the sizes and numbers are its own. The captions mangle a few
things: the letter delay comes through as "a 13eenth of a second", which I've
read as a thirtieth because the video also says a beep per letter is about 30 a
second, and the list of six vowels is garbled, so the demo uses ah, eh, ee,
oh, oo and uh.

The demos are my own rebuild from the description; I couldn't find the
game's code, and UnitOfTime's Go library [flow](https://github.com/unitoftime/flow) has an
audio package but no mumble speech that I could see. The vowel bands are
Peterson and Barney's 1952 averages for adult men, my pick for "old speech
research" since the video doesn't name it. They have no "oh", so the demo's oh
uses their vowel in "bought". The amounts in the tune (how far a phrase
drifts, how high a question goes) and each character's settings are mine,
tuned by ear.

- [I Gave My NPCs Voices Without Recording Anything](https://youtu.be/NaW0d7Tghw0): the three flavors, the typewriter timer, formant vowels and the three fixes, tube length per character, vowel groups, and the punctuation tune.
