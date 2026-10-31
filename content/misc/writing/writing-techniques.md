---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md: a bucket
# for writing-technique videos, kept as a reference while I write Grunt Force.
# New videos are folded into the argument (a new section, or a fix in place),
# with a card in data/ml/references/writing-techniques.yaml.
#
# The "Grunt Force try" and "For Grunt Force" lines are mine, set in the book's
# world (content/misc/writing/grunt-force.md), not quotes from the videos.
# Levels run small to large (sentences, description, dialogue, scenes,
# characters, the whole book, revision); a new video goes in the level it fits.
#
# shelf + label : the "Writing utilities" shelf of /misc/writing/, with a label
#                 in place of a story count (writing/book-card.html).
# youtube       : the first source video. On a writing page it ships the
#                 video-notes widget assets (layouts/writing/single.html).
# Widgets: one shortcode each in shortcodes/writing-techniques/ (landings,
# rhythm, echoes, cut, eyes, voices, beats, outcome, pace, wound, distance,
# skip, drill), styled by css/pages/writing-techniques/writing-techniques.css,
# behaviour lazy-loaded from static/js/writing-techniques/wt-<name>.js. The
# text tools (landings, rhythm, echoes, cut) share the in-editor highlighting
# in wt-editor.js, which each of them loads on first use. Every
# sample line in them is mine, set in the Grunt Force world.
# ─────────────────────────────────────────────────────────────────────────────
title: "Writing Techniques"
description: "Craft notes I keep beside the draft of Grunt Force, from 22 Bookfox videos: sentence shapes and words to cut, description, dialogue, building and pacing scenes, voice and point of view, time skips, the middle, theme, game structures and revision, with a live demo to try most of them on."
lead: "Craft notes I keep beside the draft"
cover: "writing-techniques"
shelf: "Writing utilities"
label: "Techniques"
weight: 2
youtube: "https://youtu.be/jnaljahKibQ"
---

This is where I put what I learn about the craft while I write
[Grunt Force](/misc/writing/grunt-force/). It's a bucket: so far 22 videos,
all from John, the fiction editor behind the Bookfox channel, boiled down to
one set of notes and ordered from the smallest unit up, sentence to scene to
the whole book, then revision. Where a technique has a published example, I
name the book; where it fits the novel, there's a line on how. The idea under
all of it is that every unit, down to a single sentence, is a small story that
decides where the reader leans in. Most sections end in a small demo,
built on lines from the novel, so the idea gets tried before it gets filed.

## Sentences

### Let the last sentence pick the next

Sentences work like notes in music: before writing one, look at the one before
it and decide whether to echo it or break from it. Vary length, but also
structure (not every sentence subject, verb, object; open on a short word and a
comma, or a "when" clause) and rhythm (a three-part sentence shouldn't sit next
to another one). Then build it on purpose: choose the verb instead of taking the
first one, let one word lift the sentence above information (Janet Fitch calls
it the power word, and it shouldn't come from a thesaurus), give longer ones a
small arc that pays off or twists at the end, and put the most important
information last.

{{< writing-techniques/landings >}}

### Make them wait

A delay sentence holds back its subject. Douglas Adams opens *The Hitchhiker's
Guide to the Galaxy* with four prepositional phrases before you learn what the
sentence is about, a small yellow sun. The long sentence is the same trick at
full size: grammatical and deliberate, never a run-on, and able to travel from
a standoff to agreement inside one sentence, as one in *Watership Down* does.

*Grunt Force try:* Past the dog park, past the pool nobody swims in, past the
forty-third white fence on Row Nine, sat the one container with its lights
still on.

### Two halves that turn

A contrast sentence calls the hard thing easy and the easy thing unbearable,
as Tana French's narrator does in *In the Woods*. A reversal sets something up
and flips it by the end; Orwell's "some animals are more equal than others" is
the famous one, and reusing the same word for the flip makes it ring.

*Grunt Force try:* If the Sergeant had screamed at me, I'd have forgotten it by
dinner, but I couldn't forget him being kind.

*Grunt Force try:* Dignity through work was the first thing the work took.

### Vary the length

Published writers go shorter than most of us and longer too. Cormac McCarthy
keeps repeating "They rode on." in *Blood Meridian*, set between sentences of
89 and 78 words. Short sentences have jobs: a punch straight after a long one,
a catchphrase the book returns to (Vonnegut's "So it goes"), a last line, a
cluster of three or four that slows the reader down, or a funnel where each
sentence in a paragraph is shorter than the last. His test: if nothing in your
draft is under four words, add one. Paste a paragraph here to see its shape.

{{< writing-techniques/rhythm >}}

*Grunt Force try:* I checked my score. Then my assignments. Then I stopped
checking.

### Echoes on purpose

Repetition reads as sloppy when it's accidental and clever when it's chosen.
Susanna Clarke's *Piranesi* uses one word three times in a sentence. A pile-on
keeps a word grammar doesn't need, for rhythm. A building sentence starts each
clause the same way (anaphora) and hands the last word of each clause to the
next. When an accidental repeat turns up in revision, try making it stronger
before reaching for a synonym; D. H. Lawrence's revisions of *The Rainbow*
doubled down on the repeated words.

{{< writing-techniques/echoes >}}

*Grunt Force try:* Every shift earns a point. Every point earns a perk. Every
perk buys a quiet night. Every quiet night costs a year.

### Make a claim, then prove it

A list sentence states something short, then backs it with details, as David
Benioff does in *City of Thieves*. Lists of three were writers' before they
were AI's, so don't give them up.

*Grunt Force try:* The base was a postcard: mowed by men who'd never own a
lawn, painted by hands that used to build houses, watched over by a number
nobody had seen.

### Words to cut

Most of these are fine once and a habit by the tenth time, so they're for a
search in revision, never a rule while drafting. Hedges belong in dialogue,
where people do hedge.

| Kind | Examples | Instead |
|---|---|---|
| Weasel | that, just | Matt Bell cut 800 "that"s from one novel |
| Puff | utilize, commence, endeavor | use, begin, try |
| Filter | saw, noticed, watched, felt, heard | show the thing seen |
| Time | suddenly, and then, finally | let the event arrive |
| Empty | something, stuff, there was | name the thing |
| Inflation | really, very, totally, actually | a stronger noun or verb |
| Hedge | usually, sort of, kind of, maybe | commit, which reads as authority |
| Doubled | sat down, nodded her head, whispered quietly | sat, nodded, whispered |

Two more habits: strings of three or four prepositional phrases, which he
counts worse than adverbs, and adjectives that repeat their noun (forested
woods, open fields). Here's the table as a search over your own paragraph.

{{< writing-techniques/cut >}}

## Description

### Thisness

The term is James Wood's: concrete detail that couldn't belong to any other
moment. Choose the unusual detail over the stock one (thorns in a man's beard
after he's thrown into prickly pears, in *Lonesome Dove*). Keep some details
off duty, there only to make the world believable. Go small, give the
detail readers don't expect, like the unopened Coke in *The Road*, and never
explain it afterwards; he calls explaining the biggest mistake.

### Through someone's eyes

Description says as much about the describer as the described, so filter it
through the viewpoint character's mood: the same dawn reads differently to a
happy man and a grieving one. Use more than sight (his challenge is four senses
in one paragraph), describe a place now and then by what's missing from it, and
keep it illustrative rather than exhaustive: write the crowded paragraph, then
keep the best two or three details. Pick a spot between Balzac's ten pages and
Chekhov's single glint of broken glass, and stay there, so the second half of
the book isn't sparser than the first.

*For Grunt Force:* the same base should look different through each narrator.
Andre sees guards and cameras, a believer sees the flowers, and nobody explains
the details that should horrify.

{{< writing-techniques/eyes >}}

## Dialogue

Get the mechanics right first: a new paragraph for each speaker, tags that
disappear, no adverbs on "said". Then give each character a voice of their
own; his test is a page of one line from each character with no tags, and a
reader who can still tell who said what. Mix in indirect and summarized
dialogue (keep 70 to 90 percent direct) to speed up dull talk, and let the
important things go unsaid; "Hills Like White Elephants" never names what the
couple is arguing about. So here's his test, on three of my narrators.

{{< writing-techniques/voices >}}

Watch the beats. An action for every line clogs a scene, and none at all
leaves voices floating. When two characters share a pronoun, put an action
right before the line instead of a tag. And when someone has to deliver
information, have them do something while they talk.

{{< writing-techniques/beats >}}

## Scenes

### Building one

His "octave" is eight steps: know what the character wants and what's in the
way, make the reader ask a question, raise the stakes (add someone vulnerable,
threaten something personal, or take resources away), salt it with something
fun even in dark material, move the plot, move the character, touch the theme
if it fits, and end on a high point rather than where things wind down.
Success should bring "yes, but" and failure "no, and", where the "and" is how
the character reacts.

{{< writing-techniques/outcome >}}

### Nancy Lamb's checks

Her method adds the checks I'd tape to the monitor. Every scene needs
a forwarding device: new information, a decision not yet acted on, or a new
complication. Don't solve a scene's obstacle in the same scene. Remind the
reader of the central conflict every chapter or so. Count the characters on
stage and cut one.

*For Grunt Force:* an obstacle can open in Owen's chapter and close in Kevin's,
which is how a mosaic stitches itself together.

### Pace

Give a scene the space its interest earns, not the space its clock time takes.
Alternate fast and slow, the way *Saving Private Ryan* follows the beach
landing with typewriters writing to the families. Stretch a fast run like a rubber band, then
release it with a calmer scene before it snaps. Long, loosely punctuated
sentences read fast and short, choppy ones slow, unless they're full of action;
two or three dialogue-heavy chapters in a row drag; short chapters feel quick,
so vary them on purpose.

{{< writing-techniques/pace >}}

### What to leave out

"Show the wound, not the knife." The aftermath of an event often matters more
than the event, so consider keeping some things off the page: the backstory of
the world (*The Road* never explains its apocalypse), graphic violence, even a
climax, as *No Country for Old Men* does. First-person narrators leave out what
incriminates them. And cut the connective tissue between scenes; nobody needs
to watch the drive to Scranton.

*For Grunt Force:* this is the book's whole method. The atrocity happens
between chapters and the next morning is what's on the page.

{{< writing-techniques/wound >}}

## Characters and voice

### Building a voice

Build a narrator unlike yourself from the inside, not from slang or "thee and
thou": their own metaphors drawn from their world, the subjects they only talk
around, whether they hide in the passive ("the deadline was missed"), their
filler words and the line they say most often, their syntax, their social
position (low-status characters hedge, high-status ones won't be interrupted),
and period words used lightly rather than copied.

*For Grunt Force:* a voice sheet per narrator, built from these eight, with
something measurable in each, so the rhythm meter can check them.

### Point of view

The common slips in close point of view: showing the narrator's own face
("a smile tugged at her lips"), drifting in psychic distance without meaning
to, writing only what a camera would record, tagging thoughts with "she
thought" or italics instead of letting the narration carry them, and filter
words that put a pane of glass between reader and character. Sally Rooney's
*Normal People* alternates one viewpoint per chapter and never slips, the
discipline a mosaic needs.

{{< writing-techniques/distance >}}

### Introductions

Bring a character on mid-action, give them a line worth quoting, hint at their
problem, describe the important features early and briefly, put them in a
telling place, and start them at the opposite end of the arc they'll travel.
Don't introduce four people in one paragraph, and skip the mirror. A character
coming back after a long absence needs a quiet reminder.

*For Grunt Force:* each narrator returns after three other chapters and a time
skip, so every return is a small reintroduction.

## The shape of the book

### Skipping time

From most to least explicit: date headers, a time marker in the first sentence
(in about nine chapters out of ten), situational clues (decide on a trip, then
arrive; get a wound, then it's healed), summary, or no mention at all, which
he calls the most dangerous. Size the break to the gap: a scene break for a
day, a chapter for weeks, a part for years. *Station Eleven* skips a huge stretch
with a list of what no longer exists.

{{< writing-techniques/skip >}}

### The middle

The middle needs a new question, different from the opening's; at least one
small revelation per chapter; one memorable tentpole event per chapter; plots
that rhyme with earlier ones at a different scale instead of new plotlines;
and the pleasures the opening promised, kept going. Close each stretch by
settling one question and opening the next.

### Theme

A topic is a word and a theme is a sentence. It usually turns up three
quarters of the way through the draft, and then you revise the opening to seed
it. It can be a question rather than a conviction, and each character should
stand in some relation to it, the antagonist against it. The ending should
twist the theme, not restate it.

### Worldbuilding

He'd rather call it world breaking: the story starts where the world goes
wrong. Set a rule in a sentence, then have a character break it; turn a
hierarchy over; reveal that a belief was a lie; and if a taboo is set up early,
break it before the end.

*For Grunt Force:* the twist I want is the opposite. The belief holds, and the
horror is that nobody breaks it.

### Game structures

Games have formalized plot shapes a novel in any genre can borrow: a
visible rise in status (*Old Man's War* ranks its hero up from a grunt), a skill tree of new abilities, objects that unlock
the next stage, challenges that get harder and more varied and open a door when
beaten, quests with a stated task and a stated reward, a controller steering an
avatar through an earpiece, and respawning: fail, reset, try again.

*For Grunt Force:* the base is the game, with the rules turned against the
players. The Social Trust Score is a level nobody can see, assignments are
quests with hidden rewards, and the one rule is that a Grunt is always a
Grunt. The squad only levels up in the game they play together at night.
Ending chapters on a status change, and denying it, could be the book's rhythm.

### What nobody teaches

Charm, interestingness, originality, connection with the world, depth of
vision, energy and authority. Depth of vision is how differently the book sees
people from everyone around you. Authority is decisive sentences, and he says
an agent can hear its absence in a few lines.

## Revision

"You can't polish sandstone." Cut before you polish: whole scenes first, then
paragraphs, then words. Cut the least interesting section of the book, then
the next weakest, moving anything essential elsewhere. Only then go hunting for
the words to cut and the sentence shapes above.

## The drill

Pick one technique per writing session, from any level. Write it once in the
shape and once plain, keep whichever is better, and put the shortest sentence
of the day through the meter. Or let the page pick.

{{< writing-techniques/drill >}}

## Sources {#sources}

Twenty-two videos from one channel, watched in October 2026. Everything above
is my synthesis of his arguments, and the examples are the books he reads from;
I haven't checked his quotes against the novels or his figures (Matt Bell's
800 cuts, the 70 to 90 percent direct dialogue, the "nine chapters out of ten"),
some of which he admits are guesses. Where the auto-captions mangled an author's
name and context didn't settle it, I left the example out. The practice lines
are mine.

{{< ml/references >}}
