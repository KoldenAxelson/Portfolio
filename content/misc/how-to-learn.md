---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. A bucket
# for learning systems worth trying: each system gets a `##` section of its
# own, and new videos on how to learn fold in here. Was /misc/genius-curriculum/
# (The Genius Curriculum, now the first section); `aliases` keeps that URL as a
# redirect. That section predates the length and voice rules; new sections
# follow them.
#
# youtube : the genius-curriculum video, as the flag. Its presence marks the
#           card at /misc/ (layouts/misc/list.html) AND ships the widget assets
#           (partials/video-notes/assets.html). The links out live under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/how-to-learn/, styled by
# css/pages/how-to-learn/how-to-learn.css on top of the shared video-notes box,
# with behaviour lazy-loaded from static/js/how-to-learn/.
# ─────────────────────────────────────────────────────────────────────────────
title: "How to Learn"
description: "A collection of learning systems worth trying, starting with the genius curriculum: six historical school systems (Vedic recitation, Zhu Xi's reading method, isnād, the scholastic quaestio, ḥavruta and Budapest's unsolved problems) and the five-session study loop built from them."
aliases: ["/misc/genius-curriculum/"]
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Systems for learning, collected and tried."
blurb: "Learning systems worth trying, starting with six historical school systems that mass-produced great thinkers and the study loop built from them."
icon: "academic-cap"
prose: true
youtube: "https://youtu.be/NN9Dl3zhYp0"
---

This page is where I keep learning systems I find interesting enough to try:
methods for getting something into your head, understanding it fairly, and
turning it into something of your own. Each one gets a section, and the page
grows as I find more.

## The genius curriculum

Six civilisations, six unrelated educational systems, each one producing great
thinkers at a rate no modern university comes close to. The claim in the video is
that they were doing six different things that share a hidden set of features,
and that you can reassemble those features into a curriculum for learning
practically anything.

These are my notes on that argument, plus the five-session loop it ends on. Four
of the six only make sense once you've handled them, so those have something to
poke at.

| Method | Where it comes from | What it fixes |
|--------|--------------------|---------------|
| The permutation | Vedic India, ~3,000 years ago | Getting it in accurately |
| The empty mind | Zhu Xi, 12th-century China | Understanding it fairly |
| The chain of custody | Islamic hadith scholarship | Knowing whether it's true |
| The *quaestio* | Abelard and Aquinas, medieval Europe | Working out what you think |
| The *ḥavruta* | The yeshiva tradition | Being tested by someone who isn't you |
| The unsolved problem | Budapest, ~1900 | Producing something new |

### 1 · The permutation

The Vedic tradition had to move an enormous body of text across generations with
every syllable intact, and without writing any of it down. Whisper Down the Lane
says that should have been impossible.

The fix was to stop treating recitation as a sequence. Students learned the text
in as many as eleven permuted patterns — in *jaṭāpāṭha* the words are braided
together and recited back and forth. Someone who genuinely knows the material can
produce it in any of the eleven forms. Someone who has only memorised the order
falls apart the moment the order is scrambled.

Here are the classical patterns, generated from whatever you type. Start at
*pada* and walk right; watch the counter under each word.

{{< how-to-learn/braid >}}

It worked. The Rigveda came down roughly three millennia of oral transmission as
essentially one text, with a fidelity no other ancient corpus matches. And the
system produced Pāṇini, who around the 4th century BCE composed the
*Aṣṭādhyāyī* — a complete generative grammar of Sanskrit in about 4,000 rules,
which Leonard Bloomfield called one of the greatest monuments of human
intelligence and which computer scientists now compare to a Turing machine. He
never wrote it down. He built the whole thing inside the oral system.

**The principle:** you have not learned something until you can produce it in an
order other than the one you learned it in. Forwards, then backwards, then
sideways — and wherever the versions disagree, you have just located the exact
place your understanding is broken.

### 2 · The empty mind

Zhu Xi, in 12th-century China, left behind something almost nobody else bothered
to write: an explicit methodology of reading. Two of its principles do most of
the work.

The first is *hányǒng* — empty the mind and swim in it. Before you evaluate a
text at all, suspend your own opinions entirely and let the thing speak. The
second is the opposite move, and it comes second on purpose: set yourself against
the text personally and ask what it demands of you.

Almost nobody actually does the first one. Here is a five-sentence argument and a
switch. Read it in the state you are probably already in, then flip it.

{{< how-to-learn/openmind >}}

Zhu Xi's insistence was that comprehension and evaluation are two separate
activities, and doing them simultaneously wrecks both.

In 1313 the Chinese state made his commentaries on the Four Books the official
basis of the imperial examination system. They held that position until 1905 —
nearly six centuries — while also shaping education in Korea, Japan and Vietnam.
Essentially every credentialed thinker in East Asia for six hundred years came up
through this reading method.

### 3 · The chain of custody

From the Islamic scholarly tradition, and specifically the discipline built
around hadith: the *isnād*. A claim does not travel alone. It travels with its
chain — the documented sequence of who heard it from whom, all the way back.

The institutional version was the *ijāza*, a licence to transmit a specific text,
granted by a teacher who himself held one. In principle you could only teach what
you could trace.

Pull on one and watch where the numbers come from.

{{< how-to-learn/isnad >}}

The example is al-Bukhārī, working in the 9th century: sixteen years travelling
across the Islamic world, over a thousand teachers, something on the order of
600,000 narrations examined, of which he retained around 7,000.

**The principle:** take the single claim your whole position rests on and trace
it back. Who says it, citing whom, citing what, until you hit a primary source.

### 4 · The *quaestio*

Around 1121 Peter Abelard produced *Sic et Non* — "Yes and No" — laying out 158
theological questions and, for each, assembling the authorities that flatly
contradict each other. Then he supplied no resolutions at all.

Out of that grew the *quaestio disputata*, which Aquinas formalised into what is
still one of the most rigorous thinking templates ever devised. Every article in
the *Summa* runs the same way:

1. **The objections** — the strongest arguments against the position.
2. **The *sed contra*** — a single consideration on the other side.
3. **The response** — his actual answer.
4. **The replies** — each objection answered individually, in turn.

Look closely at that ordering, because the ordering is the whole thing: you are
required to state the case against yourself *before* you are permitted to state
your own. So here it is with the ordering actually enforced. Bring a real
question — something you already think you have settled.

{{< how-to-learn/quaestio >}}

Descartes spent eight years at the Jesuit Collège de La Flèche on a curriculum
built on Aristotle and the *Summa*, trained in disputation under *aemulatio* —
rivalrous play in pursuit of excellence. He then spent his career dismantling
scholastic philosophy. But look at how he published: the *Meditations* came out
with six sets of Objections and Replies appended, solicited from other
philosophers. He overthrew the content using its own format. The doctrine died;
the method is still one of the best tools we have.

### 5 · The *ḥavruta*

The *quaestio* has an obvious limit: you cannot really be your own opponent.

In the yeshiva tradition the primary mode of study isn't lecture and isn't
solitary reading. It's *ḥavruta* — paired study, out loud, for hours, where your
partner's job is to attack you. The Talmud grounds it in Proverbs: iron sharpens
iron, and so two scholars sharpen each other.

It inverts almost everything modern professional life trains you to do. Agreement
is the sign of weakness.

{{< how-to-learn/havruta >}}

### 6 · The unsolved problem

Everything above handles ideas that already exist. None of it makes you produce
anything new.

At the Fasori Lutheran Gimnázium in Budapest, a mathematics teacher named László
Rátz taught both John von Neumann and Eugene Wigner. The wider Budapest system of
that era also produced Leó Szilárd, Edward Teller, Theodore von Kármán, George
Pólya, Paul Erdős and John Harsányi.

Rátz inverted the normal order of instruction: students were put in front of hard
problems *before* they were taught the technique that solves them, and were
expected to construct the approach themselves. Running alongside it was
**KöMaL**, a journal founded in 1894 by Dániel Arany and edited by Rátz from
1896. Each month it posed deep problems with deliberately no time pressure — so
the problems could be genuinely difficult rather than merely fast. Teenagers did
original work in public, under their own names, read by their peers across the
country.

So: a problem, and no technique.

{{< how-to-learn/problem >}}

### The five-session loop

Choose one thing: one paper, one chapter, one problem, one argument. Spend five
sessions on it across two or three weeks. If that feels absurdly slow, that
reaction is precisely the thing all six traditions were built to overcome.

#### Session 1 · The fair statement — 40 minutes

Read it once. Reread it under a single prohibition: **you may not evaluate.** No
disagreement, no objections in the margin. Then write one paragraph stating the
author's case so well that the author would approve of it. Hand that paragraph to
someone who knows the material, or check it against the text line by line.

#### Session 2 · The scramble — 45 minutes

Close the source. Fifteen minutes: write a forward summary from memory. Fifteen
minutes: write it backwards — conclusion first, then what it rests on, all the
way back to the opening premise. Then name the three central claims and explain
each one in terms of the other two.

#### Session 3 · The warrant — 30 minutes

Take the one claim the whole thing rests on and trace it back. Who asserts it,
citing whom, citing what, until you reach a primary source. Write the chain out.
Then run two tests at every link: is this source reliable, and what can I — and
can I not — actually conclude from it?

#### Session 4 · The case against — 50 minutes

State the question as a strict yes or no. Then, before writing one word of your
own answer, spend twenty minutes writing your three strongest objections to your
own position, strongest first. Add the single best consideration on your side.
Then your answer, in one paragraph. Then reply to each objection individually, by
number.

Any objection you cannot answer now becomes your actual position.

#### Session 5 · The live test — 45 minutes

Out loud, with one partner. You state your answer; for twenty minutes they give
objections only. Then swap, and argue the position you just spent twenty minutes
demolishing. Use the last five minutes to write down what changed.

#### Within 48 hours

Two external checks, because either one alone will miss something:

- Report your conclusion to a third person in under three minutes.
- Publish your written attempt somewhere public, with your name on it, dead ends
  and mistakes included.

## Source

[*The Curriculum That Produced More Geniuses Than Any University*](https://youtu.be/NN9Dl3zhYp0)
— everything above is a synthesis of that video's argument, not independent
research. The names and figures are the ones it asserts; I have normalised the
transliterations (the auto-captions mangle Zhu Xi, *hányǒng* and *ḥavruta*) but
I have not gone back to the primary sources to check the claims, which is
exactly what Session 3 would have me do.
