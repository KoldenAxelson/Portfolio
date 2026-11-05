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
description: "Notes on four videos about motion: making explainer videos from JavaScript with Claude, a five-stage folder pipeline borrowed from Disney's 1930s studio, the animation vocabulary that makes an app feel alive, and eight open-source Claude skills for making video."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Frames, folders and easing curves."
blurb: "Four videos on motion: video as a function of time, a Disney-style pipeline, the animation techniques that make apps feel alive, and the skills that check what Claude can't see or hear."
icon: "film"
group: "make"
prose: true
youtube: "https://youtu.be/rscb1DgJtNg"
---

Two things I want to do eventually both turn out to be about motion. I have
articles that could become videos, which is one way to be seen at all, and I
build iPhone apps like [Harmony Pulse](/projects/harmony-pulse) that would feel
better with some life in them. These are my notes on four videos that cover
both, plus two widgets for the ideas that only make sense when they move.

## 1 · A video is a function of time

Motion-graphics explainers can be made with nothing but Claude Code and
JavaScript. The idea underneath is one sentence: Claude writes a function
that takes a time *t* and returns one picture. Ask for 60 of them a second,
play them in order, and that's a video. A headless browser (Playwright) draws
each frame, FFmpeg stitches them into an MP4, and the soundtrack can be code
too.

{{< motion/frame >}}

Because the same *t* always gives the same picture, any frame can be checked on
its own. Claude can't watch a video, but it can look at frames. The loop that
makes the results good is a contact sheet: pull a grid of frames, look for
anything overlapping or cut off, fix the function, render again.

One creator ran one prompt at three effort levels: about 20 minutes on low, 30
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

One video was made, it says, entirely out of one folder, and walks through
that folder from inside itself. Its structure comes from how Disney
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

This section comes from John, a staff engineer at Meta who has built
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

## 4 · Skills that check their own work

AI Labs tried a pile of the video skills people have published for Claude and
kept eight that each do a different job. Every one is an install command and
a slash command.

| Repo | What it does |
|------|--------------|
| [huashu-motion](https://github.com/alchaincyf/huashu-motion) | Launch films built from a site's own colors, fonts and words, with the music written first and every cut on its beat |
| [rossark-motion](https://github.com/rossark0/rossark-motion-skill) | Rules for animating drawings, mascots and logos, plus a notes file of what each character can and can't do |
| [take-one](https://github.com/talsiach/take-one) | One line to a finished short film, planned by a strategist, a creative director and a storyboard artist |
| reanimate | Copies an animation from a site, video or GIF by recording it frame by frame and rebuilding it until the two match |
| [argo](https://github.com/shreyaskarnik/argo) | Clicks through your app in a browser and turns the recording into a narrated demo |
| [explainroo](https://github.com/vincentsch/explainroo) | Explainers with a voice-over, every scene timed to the word it belongs to |
| [video-director](https://github.com/win4r/video-director) | Director rules, with one checker for the plan and another for the finished video |
| [earshot](https://github.com/Leonxlnx/earshot) | Turns sound into notes Claude can read, lined up against the frames |

What they share matters more than any one of them. The good ones give Claude a
sense it lacks: frames to look at, a recording to listen back to, a cue sheet
for sound, a side-by-side against the original. Several hand the finished cut
to a reviewer that never saw the build, and send it back if the score is low.
And their rules are the same few: a hook in the first three seconds, text big
enough to read on a phone, a pause before the biggest moment. One more lesson
came free. Explainroo's first cut looked like a template, and it only got good
once it was rebuilt around a real Claude Code session.

## The plan

- Turn one article into a short video the folder way: script, timed words,
  storyboard, scene as code, contact sheet, render.
- Keep a person's check between every stage, starting with the storyboard.
- Give Claude a way to check what it can't sense (frames for the picture, a
  cue sheet for the sound), and have a reviewer that never saw the build score
  the cut.
- Use real screens over template boxes wherever the product has them.
- In the apps, name the motion I want (an ease-out on arrival, a snappy spring
  on press) instead of asking for "an animation."
- Give every animated thing a resting state, and review the result by eye.

## Sources {#sources}

Four videos, watched in October and November 2026. Everything above is my
synthesis of their arguments, and the details (effort timings, the Disney
history, the job history, what each repo does) are the narrators' own. AI Labs
says huashu-motion is an open clone of a motion tool Anthropic offers only on
Team and Enterprise plans; I haven't checked that. I couldn't find reanimate's
repository from its name alone, so it has no link. The captions garble one animation tool's name,
so I've left it out. Three of the four end by pointing to a paid community or vault, and one has a sponsor read.

{{< ml/references >}}
