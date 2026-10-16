---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The page
# for motion: video made from code, the pipeline around it, and animation in
# apps. New videos on animation, motion design or code-made video fold in here.
#
# youtube : the JavaScript video, as the flag. Its presence marks the card at
#           /misc/ (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/motion/, styled by
# css/pages/motion/motion.css on top of the shared video-notes box, with
# behaviour lazy-loaded from static/js/motion/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Motion"
description: "Notes on three videos about motion: making explainer videos from JavaScript with Claude, a five-stage folder pipeline borrowed from Disney's 1930s studio, and the animation vocabulary that makes an app feel alive."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Frames, folders and easing curves."
blurb: "Three videos on motion: video as a function of time, a Disney-style pipeline for code-made videos, and the animation techniques that make apps feel alive."
icon: "sparkles"
prose: true
youtube: "https://youtu.be/rscb1DgJtNg"
---

Two things I want to do eventually both turn out to be about motion. I have
articles that could become videos, which is one way to be seen at all, and I
build iPhone apps like [Harmony Pulse](/projects/harmony-pulse) that would feel
better with some life in them. These are my notes on three videos that cover
both, plus two widgets for the ideas that only make sense when they move.

## 1 · A video is a function of time

The first video makes motion-graphics explainers with nothing but Claude Code
and JavaScript. The idea underneath is one sentence: Claude writes a function
that takes a time *t* and returns one picture. Ask for 60 of them a second,
play them in order, and that's a video. A headless browser (Playwright) draws
each frame, FFmpeg stitches them into an MP4, and the soundtrack can be code
too.

{{< motion/frame >}}

Because the same *t* always gives the same picture, any frame can be checked on
its own. Claude can't watch a video, but it can look at frames. The loop that
makes the results good is a contact sheet: pull a grid of frames, look for
anything overlapping or cut off, fix the function, render again.

The narrator ran one prompt at three effort levels: about 20 minutes on low, 30
on high, and eight hours on the highest. All three were solid. The lesson they
draw is that bad results are usually a prompt problem. A good prompt states:

- the length and kind of video, and the aspect ratio;
- that it's built in JavaScript and rendered with Playwright and FFmpeg;
- the soundtrack, and whether visuals are timed to a narration you supply;
- a storyboard first, with frames for each beat, before any real rendering;
- and the contact-sheet loop before calling it done.

References help most after that: an image for the look, or another video for
the composition with your own content poured in.

## 2 · A studio in a folder

The second video was made, it says, entirely out of one folder, and walks
through that folder from inside itself. Its structure comes from how Disney
made cartoons around 1930: voices recorded first, every syllable charted on an
exposure sheet, story sketches filmed against the soundtrack as a story reel,
rough animation screened as pencil tests in a room the animators called the
sweatbox. Only after all that did a drawing reach ink and paint.

| Stage | Makes | A person checks |
|-------|-------|-----------------|
| 1 · Voice | A brief, then a script read by a cloned voice, in chunks | The whole take, start to finish |
| 2 · Words (the exposure sheet) | Every word with its exact start and end time | Names the transcription got wrong |
| 3 · Storyboard (the story reel) | Plain-text beats, each keyed to a phrase, timed into a table | The beats, before any animation |
| 4 · Animation (pencil test and sweatbox) | The scene as code, from a reusable kit; a contact sheet | The whole thing, with the voice playing |
| 5 · Render (ink and paint) | The video, a phone copy, thumbnails, chapters | The title and thumbnail stay human |

The folder itself is simple. A top-level file tells any AI what lives where. A
second file holds the pipeline as one table. Each stage has its own folder
with a short contract saying what it reads, what it makes, and who checks it,
and each video gets a folder of its own.

The part worth stealing has nothing to do with video. Take any work you repeat,
give each step a folder and a contract, and put a person's check between steps.
Fixing a beat in a text file is far cheaper than fixing a rendered scene, and
the check is what stops one bad take from becoming a bad video.

## 3 · Motion in apps

The third video comes from John, a staff engineer at Meta who has built
animations for Instagram Reels and Threads. His argument is that AI-built apps
all drift toward the same lifeless middle, because a model has no way to
validate what *feels* good. Ask for "an animation" and you get something
generic. Name the technique and you can steer it.

{{< motion/ease >}}

His vocabulary, compressed:

| Technique | Reach for it when |
|-----------|-------------------|
| Keyframes | A choreographed move from one state to another: position, size, color, opacity |
| Easing and springs | Anything that should feel physical, like a button press or a card settling |
| Gestures | Something should follow a finger, then spring or fling when released |
| Physics | A world that should react on its own: bounce, gravity, tilt |
| SVG paths and morphs | Motion along a curve, or one shape becoming another |
| Shaders | Effects that change pixels directly, like rounded masks or refraction |
| Layout transitions | Cards reordering or a list becoming a grid; the quickest way to feel premium |
| Particles | Confetti and sparkles on a success |
| Sprites and video | Hand-drawn frames, or a pre-rendered clip |
| Rigging, Rive | Characters with expressions and many small moving parts |

Two habits from his own puzzle app stuck with me. Every character animation
starts and ends at a resting state, the way game characters are built, so any
animation can follow any other. And he reviews every animation by eye, because
the clipped corner or cut-off frame is exactly what an AI misses. He even had
Codex drive the Rive editor through computer use to add new animations.

## The plan

- Turn one article into a short video the folder way: script, timed words,
  storyboard, scene as code, contact sheet, render.
- Keep a person's check between every stage, starting with the storyboard.
- In the apps, name the motion I want (an ease-out on arrival, a snappy spring
  on press) instead of asking for "an animation."
- Give every animated thing a resting state, and review the result by eye.

## Source

Three videos, watched in October 2026. Everything above is my synthesis of
their arguments, and the details (effort timings, the Disney history, the job
history) are the narrators' own. The second video's narrator isn't named in
the transcript, and the captions garble one animation tool's name, so I've
left both out. Two of the three end by pointing to a paid community or vault.

- [Making videos with Claude Code and JavaScript](https://youtu.be/rscb1DgJtNg): frames as a function of time, the render loop, prompting, references, turning it into a skill.
- [A whole video made from one folder](https://youtu.be/EhWlGingCl0): the five-stage pipeline and the Disney studio it copies.
- [John on animation in apps](https://youtu.be/f-Ar8mwm3kQ): why motion matters, the technique vocabulary, resting states, reviewing by eye.
