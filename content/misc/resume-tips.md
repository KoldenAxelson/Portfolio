---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The one
# page on getting hired: new résumé, interview or job-hunting videos fold in
# here rather than starting a page of their own.
#
# youtube : Farah Sharghi's channel, where most of the sources come from. Its
#           presence flags the card at /misc/ (red corner mark,
#           layouts/misc/list.html) AND ships the widget assets
#           (partials/video-notes/assets.html). The links out live under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/resume-tips/, styled by
# css/pages/resume-tips/resume-tips.css on top of the shared video-notes box,
# with behaviour lazy-loaded from static/js/resume-tips/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Resume Tips"
description: "Notes on eight videos from two former recruiters: who reads a resume and how fast, what the ATS actually does, the XYZ bullet formula, where translating your work turns into lying, and the psychology of the interview itself."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Eight videos from two recruiters, distilled."
blurb: "Eight videos from two ex-recruiters, distilled: the five-second skim, what the ATS really is, bullets that survive, the line you can't cross, and the first ninety seconds of the interview."
icon: "clipboard-document"
prose: true
youtube: "https://www.youtube.com/@Farah_Sharghi"
---

Most of this page comes from Farah Sharghi, who ran technical recruiting at
Google, Uber, TikTok, Lyft and the New York Times and puts her lifetime count
past a hundred thousand résumés. The last section adds a second former
recruiter, who says they spent a decade hiring across 50 countries and treats
the interview as mostly psychology.

I took these notes while working up the nerve to rewrite [my own CV](/cv).
Farah's rule holds the whole thing together: write so you're impossible to
misunderstand. The person deciding is tired, busy and reading fast, and every
tip below makes their decision easier.

| # | Rule | Carried by |
|---|------|-----------|
| 1 | A tired human decides in about five seconds | *6 Résumé Secrets*, *Beat the ATS* |
| 2 | The ATS is a filing cabinet | *Beat the ATS*, *Resume Masterclass* |
| 3 | A resume is a claim of business value | *Best Candidate*, *Masterclass* |
| 4 | Every bullet: X, measured by Y, by doing Z | *Masterclass*, *6 Résumé Secrets* |
| 5 | Translate your work; never invent it | *"Lying" On Your Resume* |
| 6 | Boring formatting wins | *Masterclass* |
| 7 | The interview is decided early | *Psychology of landing a job*, *"Lying" Gets You Hired* |

## 1 · The reader

Nobody with a rubric reads your resume. A recruiter with two hundred
applications to clear reads it between meetings, measured on offers extended,
offers accepted and time to hire. Farah says what this person wants is a safe
pair of hands: someone who can step into a drowning manager's week without
making more work. A vague resume reads as risk, and risks get cut.

Silence counts as risk too. A recruiter won't stop to investigate an
unexplained gap, a three-month stint or a sideways title. They'll fill in a
story, and it will be worse than yours. So anything that raises a question gets
a one-line answer on the page: "position impacted by departmental
reorganization," or "career break, family caregiving, now available
full-time." They saw the gap and still called, so the gap is rarely what sinks
you. Making it weird does.

Here's the skim. Two candidates, five seconds each.

{{< resume-tips/skim >}}

## 2 · The machine

The T in ATS stands for tracking. Every system Farah used (and she interned on
OCR software before she recruited) was a digital filing cabinet: it posts the
job, parses each applicant and shows recruiters the pile, roughly first in,
first out. Its search is Ctrl-F with a worse interface.

According to her, it doesn't score you, rank you with AI or reject you for
missing keywords; the "80% match" numbers come from third-party sellers nobody
on a hiring team sees. The one real auto-reject is the knockout questions at the
top of the form, like work authorization. What the machine can actually do to
you is dumber: it extracts text top to bottom, and it can't guess what your
layout meant. White-font keywords survive that and arrive, fully visible, in
front of the hiring manager.

{{< resume-tips/parse >}}

## 3 · The claim

The word she repeats is alignment: your skills, matched to what this job needs,
stated so the reader can't miss the match. Her restaurant analogy stuck with
me. A menu doesn't list forks and plates, because those come with being a
restaurant, and "detail-oriented" or "excellent communicator" is the same
silverware. Read the job description like a menu and sell the dish they're
ordering.

Alignment also decides what stays. The last five to seven years carry the
story, older roles shrink to a couple of bullets, and a summary earns its place
only when something needs explaining first, like a layoff or a career change.
The strongest pages show range on purpose (technical credibility, business
impact, leadership), as in her example: built a $200M product line by
translating research into scalable platforms; shipped a Python tool 900+
engineers use, saving $2M a year.

## 4 · The bullet

The unit of a resume is the bullet, and her formula for it is the one Google
uses internally: accomplished X, as measured by Y, by doing Z. "Increased
regional sales 25% in one year by implementing new training programs, resulting
in a $1.2M revenue increase." It scales up, too: exceeded quota with $22M
against $20M in 2020 and $25M against $23M in 2021.

The first word matters as much as the formula, because in a skim it's often the
only word that registers. "Helped," "supported," "worked on," "assisted with"
and "responsible for" are passenger language; they say you were present while
things happened. Start with "led," "built," "cut," "drove" or "launched" and
the same history reads a level more senior. Her version: one resume lists
tasks, the other lists decisions, and the second one gets the call.

Try one. The forge won't let it out without a number.

{{< resume-tips/bullet >}}

## 5 · The line

Her "lying" video draws the line harder than its title suggests. Offers get
pulled over anything a background check or a first week can verify: degree,
companies and dates, whether you were fired, skills, languages, and any
invented title or direct reports. One candidate three credit hours short wrote
"bachelor's degree" and lost an offer for a role that didn't require one.

Translation, she says, is expected. Her TikTok badge read "Global Talent
Acquisition Partner"; her resume says "Lead Recruiter," because that's what the
work was. Work you led without the title goes in the bullet. A six-week
wrong-fit job can be left off, as long as it leaves LinkedIn too. Try ruling on
a few yourself:

{{< resume-tips/line >}}

## 6 · The mechanics

Her formatting advice compresses to one rule: nothing on the page should make
the reader work. One column, because of the extractor above. A plain font like
Arial or Calibri. No templates, headshots or skill-dot meters. Bold only
employers and dates, send a PDF, and spell-check twice: she watched a Google
hiring manager reject a strong candidate over one typo.

Tailoring takes five minutes if the base resume was written against a job
family. Collect the postings you want, pull out what they all ask for, write to
that, and close the remaining gaps per application in the posting's own words.

## 7 · The room

The second recruiter's video picks up at the interview. Their claim that hiring
is about 80% psychology comes from someone selling coaching, so I hold the
number loosely, but the biases they name are textbook ones. People favor what
feels easy, so an answer that wanders loses them. Liking one thing about you
colors the rest (the halo effect), and by this recruiter's count the decision
lands in the first 60 to 90 seconds, with the rest of the conversation spent
confirming it. Here's what that does to three identical answers.

{{< resume-tips/frame >}}

Then be someone they'd enjoy working with: ten minutes of complaining about
your last manager prompts the question "are you going to talk about me like
this in two months?" And before you leave, lock in what happens next:

> "Before I go, could you walk me through the next steps and when I should
> expect an update?" Then: "Perfect. And if I don't hear anything by then, is it
> okay to give you a polite nudge?"

You leave with a date, and the follow-up is something they already agreed to.
For the questions themselves, Farah has a cheat sheet:

| They ask | They're really asking | The shape that works |
|----------|----------------------|----------------------|
| How are you? | Can you regulate on a hard day? | "Great, thanks. How are you?" Every time. |
| Why do you want to work here? | Taker or contributor? | Name a problem of theirs you can solve. Never "I love your mission." |
| Where are you in five years? | Are you leaving in six months? | Here, deeper in this work. Not grad school, not "a leadership role somewhere." |
| Why are you looking? | What will you say about *us* later? | "Learned a lot, ready for a new challenge." One sentence, then move on. |
| How's your current manager? | You may be describing *me*. | Nothing negative, ever. She watched a candidate lose an offer describing a "micromanager" to one. |
| Hobbies? | Give me one memorable thing. | Specific and curious. The vintage-motorcycle restorer came up in debrief three times; "Netflix" is forgettable. |
| Tell me about your role | Do you know what you did? | Claim the work over the badge: "while my title was coordinator, I led&hellip;" |
| The gap? | Is this going to be weird? | One matter-of-fact line, then forward. It already got you the interview. |
| Questions for us? | Are you picturing the job? | Have two ready: "Why is this position open?" and "What does success look like in 90 days?" Never "no." |

## The rewrite

The loop I'm taking to [my CV](/cv), from all eight videos:

1. Collect five to ten postings in one job family and outline from what they
   all ask for.
2. Lead with experience, weighted to the last five to seven years; add a
   summary only if something needs explaining.
3. Write every bullet as X measured by Y by doing Z, owner verb first.
4. Translate titles to what the work was, keep LinkedIn matching, and answer
   every risk the page raises in one line.
5. Hand it to someone for five seconds and ask what changed because of you.
6. Ship it boring: one column, plain font, PDF, spell-checked twice.
7. Walk into the interview with a clear first minute, and leave with the next
   step and a date.

## Source

Eight videos, watched between August and October 2026. Everything above is my
synthesis of their arguments, and the numbers and names are the ones the videos
assert. Two claims stay theirs until someone checks them against primary
sources: Farah's legal claim in the ATS video, that OFCCP and EEOC rules flatly
prohibit automated hiring decisions, and the second recruiter's 80/20 split.
That video never gives the recruiter's name, so I haven't guessed it.

Seven from [Farah Sharghi's channel](https://www.youtube.com/@Farah_Sharghi):

- [*"Beat the ATS"? They Lied, the Resume Truth*](https://youtu.be/nUlomY7RsIg): the five myths, the OCR family history, the Lever walkthrough.
- [*Resume Masterclass to get FAANG Interviews*](https://youtu.be/ck5nw7R1uEs): the full formula, from research and summary through XYZ, education, formatting and tailoring.
- [*6 Résumé Secrets That Get You Hired*](https://youtu.be/eGmZZFJ-8PY): safe hands, risk on the page, translation, verbs, signal, range.
- [*Why "Lying" On Your Resume Gets You Hired*](https://youtu.be/rAoo7X7V-Ps): the line between translation and what pulls offers.
- [*Why "Lying" Gets You Hired*](https://youtu.be/T__1QViXUxk): the nine interview answers everyone expects.
- [*Why The Best Candidate Doesn't Get The Job*](https://youtu.be/RyMrWQZBtis): alignment, recruiter incentives, "you are not a pick me."
- [*The One Rule That Gets You Hired*](https://youtu.be/mVJwjI3JP0I): impossible to misunderstand, the rule under all of it.

And one from a second former recruiter:

- [An ex-recruiter on the psychology of landing a job](https://youtu.be/m4U4iDuZaDk): cognitive ease, the halo effect, confirmation bias in the first 90 seconds, likability, authority, and the commitment lock.
