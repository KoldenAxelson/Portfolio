---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, with widgets — same shape as genius-curriculum.md, which
# is the template: watch it, summarise it in my own words, keep the numbers and
# names the videos actually claim, mark it plainly as a synthesis of someone
# else's argument — and then build the parts that only work if you can poke them.
#
# The one structural difference from the curriculum page: SEVEN source videos,
# not one. They're all from the same recruiter, so the page reads as one
# argument and the Source section carries all seven links. `youtube:` points at
# the channel — the key is only a flag for the red corner mark on the card at
# /misc/ (see layouts/misc/list.html); the links out live in the body.
#
# prose   : Tailwind Typography. EVERY widget root carries `not-prose`, or
#           Typography restyles the chips, tables and form fields inside them.
#
# THE WIDGETS FOLLOW THE SAME CONTRACT as the gc-/mli- ones, deliberately —
# same box, same "Live · …" label, same lazy loader at the bottom of the page.
# Each module is a `window.RtThing.init(root)` in static/js/, fetched only when
# its section scrolls near, and each init() is idempotent (data-rt-ready).
# Adding one means three things: the markup here, a file there, and a mount()
# line in the script block at the bottom.
#
# ONE RULE FOR WHAT EARNS A WIDGET, inherited: it has to teach the mechanism
# the prose just described, and it has to be something reading cannot do. The
# five-second pass makes you fail a recall test; the extractor scrambles a
# two-column layout in front of you; the forge refuses to let a bullet leave
# without a number; the line deck grades your own intuition against her
# rulings. A table of dos and don'ts would have been decoration.
# ─────────────────────────────────────────────────────────────────────────────
title: "Resume Tips"
description: "Notes on seven videos by ex-Google recruiter Farah Sharghi — who actually reads a resume and how fast, what the ATS really does, the XYZ bullet formula, the line between translating your work and inventing it, and the interview answers everyone expects."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Seven videos from a recruiter who screened 100,000+ résumés, distilled."
blurb: "Seven videos from an ex-Google recruiter, distilled: the five-second skim, what the ATS actually is, bullets that survive, and where translating ends and lying begins."
icon: "clipboard-document"
prose: true
youtube: "https://www.youtube.com/@Farah_Sharghi"
---
<style>
  /* ── Shared shell, same tokens and box as the gc-/mli- demos ─────────────
     so a reader who has seen the curriculum page or the ML article knows on
     sight what these are. */
  .rt-demo{border:1px solid rgb(var(--c-border));border-radius:.75rem;background:rgb(var(--c-border) / .12);padding:1.1rem 1.15rem;margin:1.9rem 0;}
  .rt-demo-label{font-family:var(--font-mono);font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:rgb(var(--c-muted));margin-bottom:.85rem;}
  .rt-caption{font-size:.8rem;color:rgb(var(--c-muted));margin-top:.9rem;line-height:1.5;}
  .rt-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:1rem;}
  .rt-btn{font:inherit;font-size:.85rem;font-weight:500;padding:.42rem .9rem;border-radius:.5rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .12);color:rgb(var(--c-fg));cursor:pointer;transition:transform .12s ease,background-color .15s ease;}
  .rt-btn:hover:not(:disabled){background:rgb(var(--c-accent) / .2);}
  .rt-btn:active:not(:disabled){transform:scale(.97);}
  .rt-btn:disabled{opacity:.45;cursor:default;}
  .rt-btn-ghost{background:transparent;border-color:rgb(var(--c-border));}
  .rt-btn-ghost:hover:not(:disabled){background:rgb(var(--c-border) / .3);}
  .rt-input{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.5rem .65rem;border:1px solid rgb(var(--c-border));border-radius:.45rem;background:rgb(var(--c-bg));color:rgb(var(--c-fg));}
  .rt-input:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:1px;}
  .rt-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  .rt-note{margin-top:.75rem;font-size:.84rem;line-height:1.55;color:rgb(var(--c-muted));}
  .rt-verdict{margin-top:1rem;padding:.6rem .7rem;border-radius:.45rem;font-size:.84rem;line-height:1.55;border:1px solid rgb(var(--c-border));color:rgb(var(--c-muted));}
  .rt-verdict.is-good{border-color:rgb(var(--c-accent) / .55);background:rgb(var(--c-accent) / .07);color:rgb(var(--c-fg));}
  .rt-verdict.is-bad{border-color:rgba(217,83,79,.5);background:rgba(217,83,79,.06);color:rgb(var(--c-fg));}

  /* ── 1 · the five-second pass ────────────────────────────────────────────── */
  .rt-sk-page{border:1px solid rgb(var(--c-border));border-radius:.55rem;background:rgb(var(--c-bg));padding:.9rem 1rem;margin-top:.9rem;}
  .rt-sk-name{margin:0 0 .1rem;font-size:1rem;font-weight:700;color:rgb(var(--c-fg));}
  .rt-sk-role{margin:0 0 .55rem;font-family:var(--font-mono);font-size:.7rem;color:rgb(var(--c-muted));}
  .rt-sk-page ul{margin:0;padding-left:1.1rem;}
  .rt-sk-page li{margin:.3rem 0;font-size:.88rem;line-height:1.5;color:rgb(var(--c-fg));}
  .rt-sk-track{height:.34rem;border-radius:999px;background:rgb(var(--c-border) / .55);overflow:hidden;margin-top:.9rem;}
  .rt-sk-bar{display:block;height:100%;width:100%;background:rgb(var(--c-accent));border-radius:999px;}
  .rt-sk-q{margin-top:.9rem;font-size:.92rem;font-weight:600;color:rgb(var(--c-fg));}
  .rt-sk-opts{display:grid;gap:.45rem;margin-top:.7rem;}
  .rt-sk-opt{font:inherit;text-align:left;font-size:.86rem;line-height:1.45;padding:.55rem .7rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-fg));cursor:pointer;transition:border-color .15s ease,background-color .15s ease;}
  .rt-sk-opt:hover:not(:disabled){border-color:rgb(var(--c-accent) / .6);}
  .rt-sk-opt:disabled{cursor:default;}
  .rt-sk-opt.is-right{border-color:rgb(var(--c-accent));background:rgb(var(--c-accent) / .12);}
  .rt-sk-opt.is-wrong{border-color:rgba(217,83,79,.6);background:rgba(217,83,79,.07);}
  .rt-sk-tag{display:inline-block;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-accent));border:1px solid rgb(var(--c-accent) / .4);background:rgb(var(--c-accent) / .1);padding:.14rem .45rem;border-radius:999px;margin-bottom:.6rem;}
  .rt-sk-pair{display:grid;gap:.7rem;margin-top:.9rem;}
  @media (min-width:640px){.rt-sk-pair{grid-template-columns:1fr 1fr;}}

  /* ── 2 · the extractor ───────────────────────────────────────────────────── */
  .rt-px-wrap{display:grid;gap:.8rem;margin-top:.9rem;}
  @media (min-width:700px){.rt-px-wrap{grid-template-columns:1fr 1fr;}}
  .rt-px-pane-lab{font-family:var(--font-mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-muted));margin:0 0 .4rem;}
  .rt-cv{border:1px solid rgb(var(--c-border));border-radius:.55rem;background:rgb(var(--c-bg));padding:.8rem;display:flex;gap:.8rem;font-size:.72rem;line-height:1.45;color:rgb(var(--c-fg));}
  .rt-cv.is-single{display:block;}
  .rt-cv-left{flex:0 0 38%;}
  .rt-cv-right{flex:1;}
  .rt-cv.is-single .rt-cv-left,.rt-cv.is-single .rt-cv-right{flex:none;}
  .rt-cv-photo{width:2.6rem;height:2.6rem;border-radius:999px;border:1px dashed rgb(var(--c-muted) / .7);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.5rem;color:rgb(var(--c-muted));margin-bottom:.5rem;}
  .rt-cv.is-single .rt-cv-photo{display:none;}
  .rt-cv-name{font-weight:700;font-size:.86rem;margin:0 0 .1rem;}
  .rt-cv-h{font-family:var(--font-mono);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:rgb(var(--c-muted));margin:.6rem 0 .2rem;}
  .rt-cv p{margin:.15rem 0;}
  .rt-cv-job{font-weight:600;margin:.2rem 0 .1rem;}
  .rt-cv ul{margin:0;padding-left:1rem;}
  .rt-cv li{margin:.14rem 0;}
  .rt-cv-dots{letter-spacing:.08em;color:rgb(var(--c-accent));}
  .rt-cv-seg{border-radius:.2rem;transition:background-color .12s ease,box-shadow .12s ease;}
  .rt-cv-seg.is-reading{background:rgb(var(--c-accent) / .25);box-shadow:0 0 0 2px rgb(var(--c-accent) / .35);}
  .rt-cv-ghost{margin-top:.6rem;font-size:.62rem;line-height:1.4;color:transparent;user-select:text;border-radius:.2rem;}
  .rt-cv-ghost.is-revealed{color:rgb(var(--c-bg));background:rgba(217,83,79,.85);padding:.3rem .4rem;}
  .rt-px-out{border:1px solid rgb(var(--c-border));border-radius:.55rem;background:rgb(var(--c-border) / .18);padding:.8rem;font-family:var(--font-mono);font-size:.68rem;line-height:1.6;color:rgb(var(--c-fg));min-height:8rem;white-space:pre-wrap;overflow-wrap:anywhere;}
  .rt-px-out .is-new{background:rgb(var(--c-accent) / .2);}
  .rt-px-out .is-junk{color:rgba(217,83,79,.95);}
  .rt-toggle{display:inline-flex;align-items:center;gap:.5rem;font-size:.82rem;color:rgb(var(--c-muted));cursor:pointer;}
  .rt-toggle input{accent-color:rgb(var(--c-accent));width:1rem;height:1rem;}

  /* ── 3 · the forge ───────────────────────────────────────────────────────── */
  .rt-fg-fields{display:grid;gap:.6rem;margin-top:.9rem;}
  .rt-fg-lab{display:block;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-muted));margin-bottom:.25rem;}
  .rt-fg-lab b{color:rgb(var(--c-accent));}
  .rt-fg-chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem;}
  .rt-chip-btn{font:inherit;font-family:var(--font-mono);font-size:.72rem;padding:.22rem .5rem;border-radius:999px;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-muted));cursor:pointer;transition:border-color .15s ease,color .15s ease,background-color .15s ease;}
  .rt-chip-btn:hover{border-color:rgb(var(--c-accent) / .7);color:rgb(var(--c-fg));background:rgb(var(--c-accent) / .1);}
  .rt-fg-read{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.9rem;}
  .rt-fg-badge{font-family:var(--font-mono);font-size:.62rem;letter-spacing:.05em;padding:.2rem .5rem;border-radius:999px;border:1px solid rgb(var(--c-border));color:rgb(var(--c-muted));}
  .rt-fg-badge.is-good{border-color:rgb(var(--c-accent) / .6);background:rgb(var(--c-accent) / .1);color:rgb(var(--c-fg));}
  .rt-fg-badge.is-bad{border-color:rgba(217,83,79,.6);background:rgba(217,83,79,.08);color:rgb(var(--c-fg));}
  .rt-fg-out{margin-top:1rem;padding:.9rem 1rem;border-radius:.55rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .06);font-size:.95rem;line-height:1.6;color:rgb(var(--c-fg));}

  /* ── 4 · the line ────────────────────────────────────────────────────────── */
  .rt-ln-card{margin-top:.9rem;padding:.85rem .95rem;border-radius:.55rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));}
  .rt-ln-count{font-family:var(--font-mono);font-size:.62rem;color:rgb(var(--c-muted));margin-bottom:.4rem;}
  .rt-ln-move{margin:0;font-size:.94rem;line-height:1.6;color:rgb(var(--c-fg));}
  .rt-ln-ruling{margin-top:.8rem;padding:.6rem .7rem;border-radius:.45rem;font-size:.84rem;line-height:1.55;border:1px solid rgb(var(--c-border));color:rgb(var(--c-fg));}
  .rt-ln-ruling.is-safe{border-color:rgb(var(--c-accent) / .55);background:rgb(var(--c-accent) / .07);}
  .rt-ln-ruling.is-pulled{border-color:rgba(217,83,79,.55);background:rgba(217,83,79,.07);}
  .rt-ln-ruling b{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.07em;text-transform:uppercase;}
  .rt-ln-score{font-family:var(--font-mono);font-size:.72rem;color:rgb(var(--c-muted));font-variant-numeric:tabular-nums;}
</style>

Seven videos by one recruiter. Farah Sharghi ran technical recruiting at Google,
Uber, TikTok, Lyft and the New York Times, and puts her lifetime screening count
past a hundred thousand résumés; before that she interned on OCR software — her
dad's field — writing the kind of machine-readable search strings people imagine
the "resume robot" runs. So when she says what happens after you hit submit, she
has stood on both sides of the machine.

These are my notes on the whole set, taken while working up the nerve to rewrite
[my own CV](/cv). The argument that holds the seven together is from her
hundred-thousand-subscriber video, and it's a writing rule, not a hiring rule:
the goal is not to be understood — it is to be **impossible to misunderstand**.
Every tip below is that rule pointed at a different part of one document.

| # | Rule | Carried by |
|---|------|-----------|
| 1 | A tired human decides in about five seconds | *6 Résumé Secrets*, *Beat the ATS* |
| 2 | The ATS is a filing cabinet, not a judge | *Beat the ATS*, *Resume Masterclass* |
| 3 | A resume is a claim of business value, not a to-do list | *Best Candidate*, *Masterclass* |
| 4 | Every bullet: X, measured by Y, by doing Z | *Masterclass*, *6 Résumé Secrets* |
| 5 | Translate your work; never invent it | *"Lying" On Your Resume* |
| 6 | Boring formatting wins | *Masterclass* |
| 7 | The same rules apply out loud | *"Lying" Gets You Hired* |

## 1 · The reader

Nobody with a rubric reads your resume. A recruiter with two hundred applications
to clear that day reads it, between meetings, under metrics — offer extends,
offer accepts, time to hire. Her claim is that this person is not hunting for the
most impressive candidate; they're hunting for a *safe pair of hands* — someone
who can step into a drowning manager's week without creating more work. Vague
résumés don't read as modest. They read as risk, and risks get cut.

The corollary she keeps returning to: silence is also risk. A recruiter will
never stop to investigate an unexplained gap, a three-month stint, a sideways
title — they'll write their own story, and it will be worse than yours. Anything
on the page that raises a question gets its one-line answer *on the page*:
"position impacted by departmental reorganization," "career break, family
caregiving, now available full-time." The gap already got you the interview —
they saw it, they still called — so the gap is rarely the problem. Making it
weird is.

You've read that; now fail it. Two candidates, five seconds each.

<div class="not-prose rt-demo" id="rt-skim">
<div class="rt-demo-label">Live · the five-second pass, scored</div>
<div id="rt-skim-stage"><button class="rt-btn" id="rt-skim-go" type="button">Show me candidate one</button></div>
<div class="rt-caption">Both pages describe the same person doing the same job. One is written as duties, one as evidence — and the recall test after each is the point: what you can't remember, a recruiter never saw. She gives you about five seconds; you're getting the same.</div>
</div>

## 2 · The machine

The T in ATS stands for *tracking*, not Terminator. Her description of every
system she used — and she used them at four of the biggest tech companies on
earth — is a digital filing cabinet on twenty-year-old bones: it posts the job
to the boards, builds a profile per applicant, parses your contact details, and
shows recruiters the pile in roughly first-in, first-out order. Its search is
Ctrl-F with a worse interface, and most recruiters don't bother with it.

What it does not do, per both her and the Lever walkthrough she embeds from
another recruiter (Sam — the auto-captions chew his surname): score your resume,
rank you with AI, or reject you for missing keywords. The "80% match" numbers
come from third-party audit-sellers — the videos name Jobscan — and no one on a
hiring team ever sees them. The white-font keyword trick doesn't beat the
machine either; it survives extraction just fine and then arrives, fully
visible, in the text a recruiter pastes to the hiring manager. And the one real
auto-reject is mundane: knockout questions you answered at the top of the form —
work authorization, visa sponsorship, are-you-over-18.

So the machine's only genuine power over you is dumber than the myth: it
extracts text, top to bottom, and it cannot guess what your layout meant.

<div class="not-prose rt-demo" id="rt-parse">
<div class="rt-demo-label">Live · what the filing cabinet actually keeps</div>
<div class="rt-px-wrap">
<div>
<p class="rt-px-pane-lab" id="rt-parse-deslab">What you designed</p>
<div class="rt-cv" id="rt-parse-cv"></div>
</div>
<div>
<p class="rt-px-pane-lab">What gets extracted</p>
<div class="rt-px-out" id="rt-parse-out" aria-live="polite">—</div>
</div>
</div>
<div class="rt-controls">
  <button class="rt-btn" id="rt-parse-run" type="button">Run the extraction</button>
  <button class="rt-btn rt-btn-ghost" id="rt-parse-flip" type="button">Same resume, one column</button>
  <label class="rt-toggle"><input type="checkbox" id="rt-parse-ghost" /> <span>Reveal the white-font block</span></label>
</div>
<div class="rt-note" id="rt-parse-note"></div>
<div class="rt-caption">The two-column reading order is her specific warning — she names Workday as a system that can't read more than a single column. The skill dots aren't text, so they extract as nothing (&ldquo;I don't know what those dots mean&hellip; it's like an interpretive dance&rdquo;), the headshot extracts as nothing, and the hidden keyword block extracts as everything.</div>
</div>

## 3 · The claim

Her bluntest video is the one about mindset. You are not a "pick me" — not
Meredith Grey, her phrase — and a job search is not an audition for being liked.
It's one word, repeated until it stops sounding like a platitude: alignment.
Skills, aligned to what this job needs, stated so the reader can't miss the
match. If the resume doesn't demonstrate the business value of your labor, it's
a to-do list with your name on it.

The restaurant analogy from the masterclass is the version that stuck with me. A
menu doesn't list "stainless steel utensils, teakwood furniture, porcelain
plates" — those are the entry conditions of being a restaurant. "Detail-
oriented," "excellent communicator," "works well in teams" are the same
silverware. Study the job description like a menu, work out which dish they're
ordering, and sell the sizzle, not the plate.

Two more cuts follow from alignment. The resume is a signal, not an
autobiography: the last five to seven years carry the story, older roles get
trimmed to two or three bullets or fall off entirely, and the college coffee
shop goes. And the strongest pages show range on purpose — technical
credibility, business impact, leadership — because any one alone reads as a
builder without direction, fluff, or a suit. Her example of all three in one
line: built a $200M product line by translating research into scalable
platforms; shipped a Python tool 900+ engineers use, saving $2M a year.

The summary block at the top earns its space only when something needs
explaining before the skim starts — a layoff, a relocation, a career change.
Otherwise she skips reading summaries entirely and goes straight to experience.

## 4 · The bullet

The unit of a resume is the bullet, and her formula for it is the one Google
uses internally: **accomplished X, as measured by Y, by doing Z.** Claim,
evidence, method. "Increased regional sales 25% in one year by implementing new
training programs, resulting in a $1.2M revenue increase." The claim-evidence
pattern scales up too — exceeded annual quota: $22M against $20M in 2020, $25M
against $23M in 2021, on pace for $32M against $30M.

The other half of the formula is the first word, because in a skim the first
word of each bullet is often the only one that registers. "Helped," "supported,"
"worked on," "assisted with," "responsible for" — passenger language. It marks
you as present while things happened. "Led," "built," "cut," "drove,"
"launched" — and suddenly the same history reads a level more senior. Her line:
one resume lists tasks, the other lists decisions, and the second person gets
the call every time.

<div class="not-prose rt-demo" id="rt-bullet">
<div class="rt-demo-label">Live · the bullet forge — X · Y · Z, enforced</div>
<div class="rt-fg-fields">
  <label><span class="rt-fg-lab"><b>X</b> · what changed because of you — start with the verb</span>
  <input class="rt-input" id="rt-fg-x" type="text" maxlength="120" autocomplete="off" placeholder="Cut onboarding time for new support hires" /></label>
  <div>
    <div class="rt-fg-chips" id="rt-fg-chips"></div>
  </div>
  <label><span class="rt-fg-lab"><b>Y</b> · how it's measured — needs a number</span>
  <input class="rt-input" id="rt-fg-y" type="text" maxlength="120" autocomplete="off" placeholder="from 6 weeks to 3 across ~40 hires a quarter" /></label>
  <label><span class="rt-fg-lab"><b>Z</b> · how you did it</span>
  <input class="rt-input" id="rt-fg-z" type="text" maxlength="140" autocomplete="off" placeholder="rebuilding the training program around real tickets" /></label>
</div>
<div class="rt-fg-read" id="rt-fg-read"></div>
<div class="rt-controls">
  <button class="rt-btn" id="rt-fg-build" type="button">Forge it</button>
  <button class="rt-btn rt-btn-ghost" id="rt-fg-copy" type="button" hidden>Copy</button>
</div>
<div class="rt-fg-out" id="rt-fg-out" hidden></div>
<div class="rt-verdict" id="rt-fg-verdict" hidden></div>
<div class="rt-caption">The forge reads your first word and sorts it — owner, passenger, or silverware — and it will not pass Y without a digit, because &ldquo;improved efficiency&rdquo; is a task and &ldquo;improved efficiency 30%&rdquo; is a result. It also flags menu-silverware phrases (&ldquo;team player,&rdquo; &ldquo;detail-oriented&rdquo;) wherever they appear. Nothing you type leaves this page.</div>
</div>

## 5 · The line

The video with "lying" in the title is really about a line, and she draws it
harder than the title suggests. On the far side — the offer-pulled, sometimes
career-ending side — sit the things background checks and first weeks verify:
your degree, the companies and dates, whether you were fired, skills and
software you claim, languages (an interviewer may simply switch into one), and
any invented title or direct reports. A candidate three credit hours short who
wrote "bachelor's degree" lost the offer for a role that didn't even require
one; the falsification mattered, not the credits.

On the near side sits translation, and her claim is that hiring managers
*expect* it. Internal titles are written by HR for comp bands, not for meaning —
her TikTok badge read "Global Talent Acquisition Partner," which she renders on
her own resume as "Lead Recruiter," because that's what the work was. Leading
work you did without the title is yours to claim in the bullet, not the title
line. A six-week wrong-fit job can be omitted entirely — if it also leaves
LinkedIn, or the inconsistency does the damage instead. Graduation dates come
off after five or six years. A gap filled with anything real — freelance,
consulting for a friend's business, an actual LLC — gets listed as that real
thing, framed generously.

Whether your own intuition puts each move on the right side of her line is
exactly the kind of thing you can't learn by nodding along. Ten rulings:

<div class="not-prose rt-demo" id="rt-line">
<div class="rt-demo-label">Live · translation or fabrication — you rule first</div>
<div id="rt-line-stage"><button class="rt-btn" id="rt-line-go" type="button">First move</button></div>
<div class="rt-caption">Every scenario and every ruling is hers, from the two &ldquo;lying&rdquo; videos — including the one most people miss, where the resume is fine and LinkedIn is the leak. Where I'd argue with a ruling, the reveal says so.</div>
</div>

## 6 · The mechanics

All of her formatting advice compresses to: nothing on the page that makes the
reader work. One column, because of the extractor above. Arial or Calibri (Times
New Roman is "making a comeback — it's chic"). No Canva templates, no headshot,
no clip art, no skill-dot meters. Bold for scanning anchors — employers, dates —
and nowhere else. Periods at the end of bullets or not, but consistently. PDF,
always, so the layout you approved is the layout they see. Education moves to
the top with dates only if you graduated in the last three years; otherwise it
sits below experience, dates optional. Certifications get their own section (or
"Education & Certifications"), with IDs and verification links if they exist.

And spell-check twice: she watched a Google hiring manager reject a strong
candidate over a single typo, reasoning that the person "does not pay attention
to detail."

Tailoring is a five-minute job, not a rewrite, *if* the base resume was built
against a job family in the first place — that's her prescribed prep: collect
the postings you actually want, extract the through-points they share, and write
to those. Per application, put the posting and your resume side by side and
close whatever daylight remains. Keyword-stuffing is the cargo-cult version of
this; peppering the posting's actual vocabulary through true bullets is the real
one — written for the human, findable by the Ctrl-F.

## 7 · Out loud

One of the seven videos applies the same translate-don't-invent rule to
interviews — nine questions where the honest-feeling answer hurts you and the
expected answer isn't a lie, just the version of the truth that serves the
conversation. Compressed:

| They ask | They're really asking | The shape that works |
|----------|----------------------|----------------------|
| How are you? | Can you regulate on a hard day? | "Great, thanks — how are you?" Every time. |
| Why do you want to work here? | Taker or contributor? | Name a problem of theirs you can solve. Never "I love your mission." |
| Where are you in five years? | Are you leaving in six months? | Here, deeper in this work. Not grad school, not "a leadership role somewhere." |
| Why are you looking? | What will you say about *us* later? | "Learned a lot, ready for a new challenge." One sentence, move on. |
| How's your current manager? | You may be describing *me*. | Nothing negative, ever — she watched a candidate torpedo an offer describing a "micromanager" to one. |
| Hobbies? | Give me one memorable thing. | Specific and curious — the vintage-motorcycle restorer got discussed in debrief three times. "Netflix" is forgettable. |
| Tell me about your role | Do you know what you did? | Claim the work, not the badge — "while my title was coordinator, I led&hellip;" |
| The gap? | Is this going to be weird? | Matter-of-fact, one line, forward-looking. It already got you the interview. |
| Questions for us? | Are you picturing the job? | Two ready: "Why is this position open?" and "What does success look like in 90 days?" Never "no." |

## The rewrite

The loop I'm taking to [my CV](/cv), assembled from all seven:

1. **Study the menu.** Collect five to ten postings in the one job family you're
   actually writing for. Extract the through-points — the skills and outcomes
   they all order. That list, not your memory of your jobs, is the outline.
2. **State the claim.** One line of who you are professionally, with evidence,
   only if something needs explaining up front. Then experience, most recent
   first, weighted hard toward the last five to seven years.
3. **Forge every bullet.** X measured by Y by doing Z, owner verbs first,
   numbers wherever a number is true. Cut every duty that isn't a result and
   every phrase that's silverware.
4. **Check the line.** Translate titles to what the work was. Cut what's
   irrelevant — and keep LinkedIn identical to what remains. Answer every risk
   the page raises, on the page, in one line each.
5. **Run the five-second pass.** Hand it to someone, take it back after five
   seconds, and ask what changed because of you. If they can't answer, the
   resume didn't say it.
6. **Ship boring.** One column, plain font, PDF, spell-checked twice.

## Source

Seven videos from [Farah Sharghi's channel](https://www.youtube.com/@Farah_Sharghi),
watched August 2026 — everything above is a synthesis of her arguments, not
independent research, and the numbers and names are the ones the videos assert.
Her legal claim in the ATS video (that OFCCP and EEOC rules flatly prohibit
automated hiring decisions) I've kept as *her claim*; like the curriculum page,
checking it against primary sources is exactly the homework this page hasn't
done.

- [*"Beat the ATS"? They Lied — the Resume Truth*](https://youtu.be/nUlomY7RsIg) — the five myths, the OCR family history, the Lever walkthrough.
- [*Resume Masterclass to get FAANG Interviews*](https://youtu.be/ck5nw7R1uEs) — the full formula: research, summary, XYZ, education, formatting, tailoring.
- [*6 Résumé Secrets That Get You Hired*](https://youtu.be/eGmZZFJ-8PY) — safe hands, risk on the page, translation, verbs, signal, range.
- [*Why "Lying" On Your Resume Gets You Hired*](https://youtu.be/rAoo7X7V-Ps) — the line: what's translation, what pulls offers.
- [*Why "Lying" Gets You Hired*](https://youtu.be/T__1QViXUxk) — the nine interview answers everyone expects.
- [*Why The Best Candidate Doesn't Get The Job*](https://youtu.be/RyMrWQZBtis) — alignment, recruiter incentives, "you are not a pick me."
- [*The One Rule That Gets You Hired*](https://youtu.be/mVJwjI3JP0I) — impossible to misunderstand; the rule under all of it.

<script>
  /* Page-local module loader — same shape as genius-curriculum's. hx-boost
     swaps the body, so this inline script arrives with the page on every
     navigation; a <head> script would not. Each module is fetched only when
     its section is within 250px of the viewport, and each init() is
     idempotent (data-rt-ready) in case a swap re-runs this. */
  (function () {
    var loaded = {};
    function loadScript(src, cb) {
      if (loaded[src] === true) { cb(); return; }
      if (loaded[src]) { loaded[src].push(cb); return; }
      loaded[src] = [cb];
      var el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = function () { var q = loaded[src]; loaded[src] = true; for (var i = 0; i < q.length; i++) q[i](); };
      el.onerror = function () { loaded[src] = null; };
      document.head.appendChild(el);
    }
    function whenVisible(el, cb) {
      if (!el) return;
      if (!("IntersectionObserver" in window)) { cb(); return; }
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { io.disconnect(); cb(); return; }
      }, { rootMargin: "250px 0px" });
      io.observe(el);
    }
    function mount(id, file, global) {
      var root = document.getElementById(id);
      if (!root) return;
      whenVisible(root, function () {
        loadScript("/js/" + file, function () { if (window[global]) window[global].init(root); });
      });
    }
    mount("rt-skim", "rt-skim.js", "RtSkim");
    mount("rt-parse", "rt-parse.js", "RtParse");
    mount("rt-bullet", "rt-bullet.js", "RtBullet");
    mount("rt-line", "rt-line.js", "RtLine");
  })();
</script>
