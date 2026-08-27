---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM A VIDEO, with widgets. The shape here is the template for the rest
# of the set: watch it, summarise it in my own words, keep the numbers and names
# the video actually claims, mark it plainly as a synthesis of someone else's
# argument — and then build the parts that only work if you can poke them.
#
# youtube : the source video. Presence of this key is what puts the red corner
#           mark on this page's card at /misc/ — see layouts/misc/list.html. The
#           URL is used there only as a flag; the actual link out lives in the
#           body, under Source.
# prose   : Tailwind Typography. EVERY widget root carries `not-prose`, or
#           Typography restyles the chips, tables and form fields inside them.
#
# THE WIDGETS FOLLOW THE ML ARTICLE'S CONTRACT, deliberately — same .gc-/.mli-
# box, same "Live · …" label, same lazy loader at the bottom of the page. Each
# module is a `window.GcThing.init(root)` in static/js/, fetched only when its
# section scrolls near, so a reader who stops after method two never downloads
# the other four. Adding one means three things: the markup here, a file there,
# and a whenVisible() line in the script block at the bottom.
#
# ONE RULE FOR WHAT EARNS A WIDGET: it has to teach the mechanism the prose just
# described, and it has to be something reading cannot do. The braid generates
# real patterns from your sentence; the quaestio form refuses to let you write
# your answer first. A diagram of six boxes would have been decoration.
# ─────────────────────────────────────────────────────────────────────────────
title: "The Genius Curriculum"
description: "Notes on six historical educational systems that each produced a wildly disproportionate number of great thinkers — Vedic recitation, Zhu Xi's reading method, isnād, the scholastic quaestio, ḥavruta, and Budapest's unsolved-problem pedagogy — and the five-session study loop assembled out of them."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Six traditions that mass-produced great thinkers, and what they have in common."
blurb: "Six historical school systems that each mass-produced great thinkers, and the five-session study loop you can build out of them."
icon: "academic-cap"
prose: true
youtube: "https://youtu.be/NN9Dl3zhYp0"
---
<style>
  /* ── Shared shell, borrowed wholesale from the ML article's .mli-demo ────────
     Same tokens, same box, same "Live · …" label, so a reader who has been to
     /articles/what-is-ml-infrastructure/ recognises what these are on sight. */
  .gc-demo{border:1px solid rgb(var(--c-border));border-radius:.75rem;background:rgb(var(--c-border) / .12);padding:1.1rem 1.15rem;margin:1.9rem 0;}
  .gc-demo-label{font-family:var(--font-mono);font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:rgb(var(--c-muted));margin-bottom:.85rem;}
  .gc-caption{font-size:.8rem;color:rgb(var(--c-muted));margin-top:.9rem;line-height:1.5;}
  .gc-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:1rem;}
  .gc-btn{font:inherit;font-size:.85rem;font-weight:500;padding:.42rem .9rem;border-radius:.5rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .12);color:rgb(var(--c-fg));cursor:pointer;transition:transform .12s ease,background-color .15s ease;}
  .gc-btn:hover:not(:disabled){background:rgb(var(--c-accent) / .2);}
  .gc-btn:active:not(:disabled){transform:scale(.97);}
  .gc-btn:disabled{opacity:.45;cursor:default;}
  .gc-btn-ghost{background:transparent;border-color:rgb(var(--c-border));}
  .gc-btn-ghost:hover:not(:disabled){background:rgb(var(--c-border) / .3);}
  .gc-input{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.5rem .65rem;border:1px solid rgb(var(--c-border));border-radius:.45rem;background:rgb(var(--c-bg));color:rgb(var(--c-fg));}
  .gc-input:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:1px;}
  .gc-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

  /* ── 1 · the braid ──────────────────────────────────────────────────────── */
  .gc-braid-src{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.9rem;}
  .gc-src-word{font:inherit;display:flex;align-items:flex-end;gap:.4rem;padding:.3rem .45rem;border-radius:.45rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));cursor:default;transition:border-color .15s ease,background-color .15s ease;}
  .gc-src-word.is-on{border-color:rgb(var(--c-accent));background:rgb(var(--c-accent) / .12);}
  .gc-src-txt{font-family:var(--font-mono);font-size:.76rem;color:rgb(var(--c-fg));line-height:1.5;}
  .gc-src-bar{display:flex;align-items:flex-end;width:.34rem;height:1.15rem;border-radius:999px;background:rgb(var(--c-border) / .6);overflow:hidden;}
  .gc-src-bar span{display:block;width:100%;background:rgb(var(--c-accent));border-radius:999px;}
  .gc-src-n{font-family:var(--font-mono);font-size:.6rem;color:rgb(var(--c-muted));font-variant-numeric:tabular-nums;line-height:1.9;}
  .gc-tabs{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:1.1rem;}
  .gc-tab{font:inherit;display:flex;flex-direction:column;align-items:flex-start;line-height:1.25;padding:.35rem .6rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-muted));cursor:pointer;transition:border-color .15s ease,background-color .15s ease,color .15s ease;}
  .gc-tab:hover{background:rgb(var(--c-border) / .3);}
  .gc-tab.is-on{border-color:rgb(var(--c-accent) / .7);background:rgb(var(--c-accent) / .14);color:rgb(var(--c-fg));}
  .gc-tab-name{font-family:var(--font-mono);font-size:.8rem;font-weight:600;}
  .gc-tab-gloss{font-size:.6rem;letter-spacing:.06em;text-transform:uppercase;opacity:.75;}
  .gc-braid-out{display:flex;flex-wrap:wrap;align-items:center;gap:.22rem;margin-top:.9rem;padding:.75rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));min-height:3.5rem;max-height:15rem;overflow-y:auto;}
  .gc-chip{font-family:var(--font-mono);font-size:.76rem;padding:.1rem .3rem;border-radius:.28rem;color:rgb(var(--c-fg));background:rgb(var(--c-border) / .35);transition:background-color .15s ease,color .15s ease,opacity .15s ease;}
  .gc-braid-out.has-same .gc-chip{opacity:.35;}
  .gc-chip.is-same{opacity:1;background:rgb(var(--c-accent) / .22);box-shadow:inset 0 0 0 1px rgb(var(--c-accent) / .6);}
  .gc-chip.is-lit{opacity:1;background:rgb(var(--c-accent));color:rgb(var(--c-bg));}
  .gc-sep{color:rgb(var(--c-muted));opacity:.5;padding:0 .12rem;font-size:.8rem;}
  .gc-braid-empty{font-size:.82rem;color:rgb(var(--c-muted));}
  .gc-braid-note{margin-top:.75rem;font-size:.84rem;line-height:1.5;color:rgb(var(--c-muted));}
  .gc-braid-stat{font-size:.8rem;color:rgb(var(--c-muted));}
  .gc-braid-stat b{color:rgb(var(--c-fg));font-family:var(--font-mono);font-variant-numeric:tabular-nums;}

  /* ── 2 · empty the mind ─────────────────────────────────────────────────── */
  .gc-toggle{display:inline-flex;align-items:center;gap:.5rem;font-size:.82rem;color:rgb(var(--c-muted));cursor:pointer;margin-bottom:.4rem;}
  .gc-toggle input{accent-color:rgb(var(--c-accent));width:1rem;height:1rem;}
  .gc-om-row{margin-top:.8rem;}
  .gc-om-line{margin:0;font-size:.92rem;line-height:1.6;color:rgb(var(--c-fg));transition:opacity .25s ease;}
  .gc-om-line.is-dropped{opacity:.38;}
  .gc-om-num{display:inline-block;min-width:1.3rem;font-family:var(--font-mono);font-size:.66rem;color:rgb(var(--c-muted));vertical-align:.12rem;}
  .gc-om-obj{margin:.45rem 0 0 1.3rem;padding:.45rem .6rem;border-left:2px solid rgba(217,83,79,.65);background:rgba(217,83,79,.07);border-radius:0 .35rem .35rem 0;font-size:.84rem;line-height:1.5;color:rgb(var(--c-fg));}
  .gc-om-obj.is-late{margin-left:0;border-left-color:rgb(var(--c-accent) / .6);background:rgb(var(--c-accent) / .07);}
  .gc-om-tag{display:block;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-muted));margin-bottom:.15rem;}
  .gc-om-ans{display:block;margin-top:.3rem;font-family:var(--font-mono);font-size:.66rem;color:rgb(var(--c-muted));}
  .gc-om-verdict{margin-top:1.1rem;padding:.6rem .7rem;border-radius:.45rem;font-size:.84rem;line-height:1.55;color:rgb(var(--c-muted));border:1px solid rgb(var(--c-border));}
  .gc-om-verdict.is-bad{border-color:rgba(217,83,79,.5);background:rgba(217,83,79,.06);color:rgb(var(--c-fg));}
  .gc-om-verdict.is-good{border-color:rgb(var(--c-accent) / .55);background:rgb(var(--c-accent) / .07);color:rgb(var(--c-fg));}

  /* ── 3 · the chain ──────────────────────────────────────────────────────── */
  .gc-isnad-chain{margin-top:.3rem;}
  .gc-isnad-arm{display:flex;align-items:center;justify-content:center;height:1.5rem;position:relative;}
  .gc-isnad-arm::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:1px;background:rgb(var(--c-border));}
  .gc-isnad-arm-lab{position:relative;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-muted));background:rgb(var(--c-bg));padding:0 .4rem;}
  .gc-isnad-card{padding:.7rem .8rem;border-radius:.55rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));}
  .gc-isnad-card.is-primary{border-color:rgb(var(--c-accent) / .7);background:rgb(var(--c-accent) / .07);}
  .gc-isnad-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.35rem;}
  .gc-isnad-tier{font-family:var(--font-mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-accent));border:1px solid rgb(var(--c-accent) / .4);background:rgb(var(--c-accent) / .1);padding:.14rem .45rem;border-radius:999px;}
  .gc-isnad-when{font-family:var(--font-mono);font-size:.66rem;color:rgb(var(--c-muted));}
  .gc-isnad-src{margin:0 0 .3rem;font-size:.92rem;font-weight:600;line-height:1.35;color:rgb(var(--c-fg));}
  .gc-isnad-src a{color:rgb(var(--c-fg));text-decoration:none;border-bottom:1px solid rgb(var(--c-accent) / .5);}
  .gc-isnad-src a:hover{color:rgb(var(--c-accent));}
  .gc-isnad-says{margin:0;font-size:.86rem;line-height:1.55;color:rgb(var(--c-fg));font-style:italic;}
  .gc-isnad-cites{margin-top:.35rem;font-family:var(--font-mono);font-size:.66rem;color:rgb(var(--c-muted));}
  .gc-isnad-tests{margin-top:.55rem;display:grid;gap:.4rem;}
  @media (min-width:560px){.gc-isnad-tests{grid-template-columns:1fr 1fr;}}
  .gc-isnad-test{font-size:.78rem;line-height:1.5;color:rgb(var(--c-muted));border-top:1px solid rgb(var(--c-border));padding-top:.35rem;}
  .gc-isnad-q{display:block;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.05em;text-transform:uppercase;color:rgb(var(--c-fg));margin-bottom:.15rem;}
  .gc-isnad-verdict{margin-top:1rem;padding:.6rem .7rem;border-radius:.45rem;border:1px solid rgb(var(--c-accent) / .55);background:rgb(var(--c-accent) / .07);font-size:.84rem;line-height:1.55;color:rgb(var(--c-fg));}

  /* ── 4 · the quaestio ───────────────────────────────────────────────────── */
  .gc-q-stage{margin-top:.9rem;padding:.7rem .8rem;border-radius:.55rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));transition:opacity .2s ease;}
  .gc-q-stage.is-locked{opacity:.45;}
  .gc-q-head{display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;}
  .gc-q-num{font-family:var(--font-mono);font-size:.58rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-accent));border:1px solid rgb(var(--c-accent) / .4);background:rgb(var(--c-accent) / .1);padding:.14rem .45rem;border-radius:999px;}
  .gc-q-title{font-size:.86rem;font-weight:600;color:rgb(var(--c-fg));}
  .gc-q-lock{margin-left:auto;font-family:var(--font-mono);font-size:.6rem;color:rgb(var(--c-muted));}
  .gc-q-stage:not(.is-locked) .gc-q-lock{visibility:hidden;}
  .gc-q-fields{display:grid;gap:.4rem;}
  .gc-q-fields textarea{min-height:3.1rem;resize:vertical;line-height:1.5;}
  .gc-q-status{margin-top:.8rem;font-size:.8rem;line-height:1.5;color:rgb(var(--c-muted));}
  .gc-q-status.is-ready{color:rgb(var(--c-fg));}
  .gc-q-art{margin-top:1rem;padding:.9rem 1rem;border-radius:.55rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .06);}
  .gc-q-art-q{margin:0 0 .6rem;font-size:1rem;font-weight:600;line-height:1.35;color:rgb(var(--c-fg));}
  .gc-q-art-p{margin:.45rem 0 0;font-size:.86rem;line-height:1.6;color:rgb(var(--c-fg));}
  .gc-q-art-p b{font-family:var(--font-mono);font-size:.74rem;letter-spacing:.02em;color:rgb(var(--c-accent));}
  .gc-q-art-sc,.gc-q-art-resp,.gc-q-art-reps{padding-top:.45rem;border-top:1px solid rgb(var(--c-border));margin-top:.7rem;}
  .gc-q-art-p.is-weak{opacity:.5;}
  .gc-q-flag{margin-top:.8rem;padding:.6rem .7rem;border-radius:.45rem;border:1px solid rgba(217,83,79,.55);background:rgba(217,83,79,.07);font-size:.84rem;line-height:1.55;color:rgb(var(--c-fg));}

  /* ── 5 · the havruta clock ──────────────────────────────────────────────── */
  .gc-hv-face{display:flex;flex-wrap:wrap;align-items:baseline;gap:.9rem;}
  .gc-hv-clock{font-family:var(--font-mono);font-size:2.6rem;font-weight:700;line-height:1;color:rgb(var(--c-fg));font-variant-numeric:tabular-nums;}
  .gc-hv-name{font-size:.95rem;font-weight:600;color:rgb(var(--c-accent));}
  .gc-hv-track{height:.4rem;border-radius:999px;background:rgb(var(--c-border) / .55);overflow:hidden;margin-top:.85rem;}
  .gc-hv-bar{display:block;height:100%;width:0;background:rgb(var(--c-accent));border-radius:999px;transition:width .25s linear;}
  .gc-hv-pips{display:flex;gap:.4rem;margin-top:.6rem;}
  .gc-hv-pip{flex:1;text-align:center;padding:.3rem .2rem;border-radius:.4rem;border:1px solid rgb(var(--c-border));color:rgb(var(--c-muted));transition:border-color .2s ease,background-color .2s ease,color .2s ease;}
  .gc-hv-pip b{display:block;font-family:var(--font-mono);font-size:.9rem;font-weight:700;line-height:1.1;}
  .gc-hv-pip small{font-family:var(--font-mono);font-size:.55rem;letter-spacing:.08em;text-transform:uppercase;opacity:.8;}
  .gc-hv-pip.is-on{border-color:rgb(var(--c-accent));background:rgb(var(--c-accent) / .14);color:rgb(var(--c-fg));}
  .gc-hv-pip.is-done{color:rgb(var(--c-fg));border-color:rgb(var(--c-border));background:rgb(var(--c-border) / .35);}
  .gc-hv-rule{margin-top:.85rem;font-size:.86rem;line-height:1.6;color:rgb(var(--c-muted));}

  /* ── 6 · the unsolved problem ───────────────────────────────────────────── */
  .gc-pr-stmt{margin:0;font-size:.95rem;line-height:1.65;color:rgb(var(--c-fg));}
  .gc-pr-scratch{width:100%;box-sizing:border-box;min-height:5rem;resize:vertical;font:inherit;font-size:.9rem;line-height:1.55;padding:.6rem .7rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-fg));margin-top:.9rem;}
  .gc-pr-scratch:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:1px;}
  .gc-pr-skip{font:inherit;font-size:.74rem;color:rgb(var(--c-muted));background:none;border:0;padding:0;text-decoration:underline;text-underline-offset:2px;cursor:pointer;}
  .gc-pr-skip:hover{color:rgb(var(--c-fg));}
  .gc-pr-note{margin-top:.75rem;font-size:.78rem;line-height:1.5;color:rgb(var(--c-muted));}
  .gc-pr-body{margin-top:1rem;padding:.8rem .9rem;border-radius:.55rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .06);font-size:.88rem;line-height:1.65;color:rgb(var(--c-fg));}
  .gc-pr-body p{margin:.5rem 0 0;}
  .gc-pr-body p:first-child{margin-top:0;}
</style>

Six civilisations, six unrelated educational systems, each one producing great
thinkers at a rate no modern university comes close to. The claim in the video is
that they were doing six different things that share a hidden set of features,
and that you can reassemble those features into a curriculum for learning
practically anything.

These are my notes on that argument, plus the five-session loop it ends on. Four
of the six only make sense once you've handled them, so those have something to
poke at.

| # | Method | Where it comes from | What it fixes |
|---|--------|--------------------|---------------|
| 1 | The permutation | Vedic India, ~3,000 years ago | Getting it in accurately |
| 2 | The empty mind | Zhu Xi, 12th-century China | Understanding it fairly |
| 3 | The chain of custody | Islamic hadith scholarship | Knowing whether it's true |
| 4 | The *quaestio* | Abelard and Aquinas, medieval Europe | Working out what you think |
| 5 | The *ḥavruta* | The yeshiva tradition | Being tested by someone who isn't you |
| 6 | The unsolved problem | Budapest, ~1900 | Producing something new |

## 1 · The permutation

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

<div class="not-prose gc-demo" id="gc-braid">
<div class="gc-demo-label">Live · the Vedic recitation patterns, built from your own sentence</div>
<label><span class="gc-sr">A short phrase to braid</span>
<input class="gc-input" id="gc-braid-in" type="text" maxlength="70" autocomplete="off" value="the list should always outrun you" /></label>
<div class="gc-braid-src" id="gc-braid-src"></div>
<div class="gc-tabs" id="gc-braid-tabs" role="tablist" aria-label="Recitation pattern"></div>
<div class="gc-braid-out" id="gc-braid-out" aria-live="polite"></div>
<div class="gc-braid-note" id="gc-braid-note"></div>
<div class="gc-controls">
  <button class="gc-btn" id="gc-braid-play" type="button">Recite it</button>
  <span class="gc-braid-stat" id="gc-braid-stat"></span>
</div>
<div class="gc-caption">Hover or tab to a word to light every place it is spoken. The bar beside it is how many times — that redundancy is the error correction, and it is the entire reason a text survives three thousand years of mouths without drifting.</div>
</div>

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

## 2 · The empty mind

Zhu Xi, in 12th-century China, left behind something almost nobody else bothered
to write: an explicit methodology of reading. Two of its principles do most of
the work.

The first is *hányǒng* — empty the mind and swim in it. Before you evaluate a
text at all, suspend your own opinions entirely and let the thing speak. The
second is the opposite move, and it comes second on purpose: set yourself against
the text personally and ask what it demands of you.

Almost nobody actually does the first one. Here is a five-sentence argument and a
switch. Read it in the state you are probably already in, then flip it.

<div class="not-prose gc-demo" id="gc-om">
<div class="gc-demo-label">Live · the same passage, read two ways</div>
<label class="gc-toggle"><input type="checkbox" id="gc-om-switch" /> <span>Suspend judgement while reading (<i>hányǒng</i>)</span></label>
<div id="gc-om-body"></div>
<button class="gc-btn" id="gc-om-eval" type="button" hidden>Now evaluate</button>
<div id="gc-om-foot" class="gc-om-verdict"></div>
<div class="gc-caption">The passage is rigged, but rigged the way real arguments are: every objection is answered by a sentence further down. With judgement running, the objection ends your attention on the sentence that provoked it, so you never reach the answer — and the argument you end up disagreeing with is one you assembled yourself.</div>
</div>

Zhu Xi's insistence was that comprehension and evaluation are two separate
activities, and doing them simultaneously wrecks both.

In 1313 the Chinese state made his commentaries on the Four Books the official
basis of the imperial examination system. They held that position until 1905 —
nearly six centuries — while also shaping education in Korea, Japan and Vietnam.
Essentially every credentialed thinker in East Asia for six hundred years came up
through this reading method.

## 3 · The chain of custody

From the Islamic scholarly tradition, and specifically the discipline built
around hadith: the *isnād*. A claim does not travel alone. It travels with its
chain — the documented sequence of who heard it from whom, all the way back.

The institutional version was the *ijāza*, a licence to transmit a specific text,
granted by a teacher who himself held one. In principle you could only teach what
you could trace.

Pull on one and watch where the numbers come from.

<div class="not-prose gc-demo" id="gc-isnad">
<div class="gc-demo-label">Live · one claim, traced back to its primary source</div>
<div class="gc-isnad-chain" id="gc-isnad-chain"></div>
<div class="gc-controls"><button class="gc-btn" id="gc-isnad-back" type="button">Trace it back</button></div>
<div class="gc-isnad-verdict" id="gc-isnad-verdict" hidden>The number you started with — “three times” — appears in no link of this chain except the first one. Nobody fabricated it. It accreted, between a news article and a newsletter, because at every step the person passing it on was quoting someone they trusted rather than something they had read.</div>
<div class="gc-caption">A constructed example, and worth saying so plainly: the paper at the bottom is real and linked, but the three links above it stand for the shape of what you find rather than for specific posts. Every card carries the two tests the method demands — <i>is this source reliable</i>, and <i>what can I actually conclude from it</i> — kept apart, because the gap between them is where a claim quietly grows.</div>
</div>

The example is al-Bukhārī, working in the 9th century: sixteen years travelling
across the Islamic world, over a thousand teachers, something on the order of
600,000 narrations examined, of which he retained around 7,000.

**The principle:** take the single claim your whole position rests on and trace
it back. Who says it, citing whom, citing what, until you hit a primary source.

## 4 · The *quaestio*

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

<div class="not-prose gc-demo" id="gc-q">
<div class="gc-demo-label">Live · write one, in Aquinas's order, with no skipping</div>

<div class="gc-q-stage" data-gc-stage data-gc-hint="Start here. State it as a strict yes or no — “should I…”, “is it true that…” — not as a topic.">
  <div class="gc-q-head"><span class="gc-q-num">i</span><span class="gc-q-title">The question</span><span class="gc-q-lock">locked</span></div>
  <div class="gc-q-fields"><input class="gc-input" id="gc-q-question" type="text" placeholder="Whether …?" autocomplete="off" /></div>
</div>

<div class="gc-q-stage" data-gc-stage data-gc-hint="Three objections to your own position, strongest first. Not strawmen — the ones that worry you. Everything below stays locked until they exist.">
  <div class="gc-q-head"><span class="gc-q-num">ii</span><span class="gc-q-title">Objections to your own position</span><span class="gc-q-lock">locked</span></div>
  <div class="gc-q-fields">
    <textarea class="gc-input" id="gc-q-o1" placeholder="Objection 1 — the strongest one against you"></textarea>
    <textarea class="gc-input" id="gc-q-o2" placeholder="Objection 2"></textarea>
    <textarea class="gc-input" id="gc-q-o3" placeholder="Objection 3"></textarea>
  </div>
</div>

<div class="gc-q-stage" data-gc-stage data-gc-hint="One consideration on the other side. One. Aquinas gets a sentence here, not a case.">
  <div class="gc-q-head"><span class="gc-q-num">iii</span><span class="gc-q-title">Sed contra</span><span class="gc-q-lock">locked</span></div>
  <div class="gc-q-fields"><textarea class="gc-input" id="gc-q-sc" placeholder="On the contrary, …"></textarea></div>
</div>

<div class="gc-q-stage" data-gc-stage data-gc-hint="Now your answer, in one paragraph — written by someone who has just spent ten minutes arguing against it.">
  <div class="gc-q-head"><span class="gc-q-num">iv</span><span class="gc-q-title">Your answer</span><span class="gc-q-lock">locked</span></div>
  <div class="gc-q-fields"><textarea class="gc-input" id="gc-q-resp" placeholder="I answer that, …"></textarea></div>
</div>

<div class="gc-q-stage" data-gc-stage data-gc-optional data-gc-hint="Reply to each objection individually, by number. Leave one blank if you cannot answer it — the article will assemble either way, and say what that means.">
  <div class="gc-q-head"><span class="gc-q-num">v</span><span class="gc-q-title">Replies, one per objection</span><span class="gc-q-lock">locked</span></div>
  <div class="gc-q-fields">
    <textarea class="gc-input" id="gc-q-r1" placeholder="Reply to Objection 1"></textarea>
    <textarea class="gc-input" id="gc-q-r2" placeholder="Reply to Objection 2"></textarea>
    <textarea class="gc-input" id="gc-q-r3" placeholder="Reply to Objection 3"></textarea>
  </div>
</div>

<div class="gc-q-status" id="gc-q-status"></div>
<div class="gc-controls">
  <button class="gc-btn" id="gc-q-build" type="button" disabled>Assemble the article</button>
  <button class="gc-btn gc-btn-ghost" id="gc-q-copy" type="button" hidden>Copy as text</button>
</div>
<div id="gc-q-out" hidden></div>
<div class="gc-caption">Nothing here leaves your browser, and nothing is saved — close the tab and it's gone. The lock is the method: a version of this form with every field open would teach nothing, because everyone fills in the answer first and then back-fills objections built to lose to it. The replies are the one stage that is <i>not</i> required, deliberately — you are allowed to finish with an objection you could not answer, and told what that means.</div>
</div>

Descartes spent eight years at the Jesuit Collège de La Flèche on a curriculum
built on Aristotle and the *Summa*, trained in disputation under *aemulatio* —
rivalrous play in pursuit of excellence. He then spent his career dismantling
scholastic philosophy. But look at how he published: the *Meditations* came out
with six sets of Objections and Replies appended, solicited from other
philosophers. He overthrew the content using its own format. The doctrine died;
the method is still one of the best tools we have.

## 5 · The *ḥavruta*

The *quaestio* has an obvious limit: you cannot really be your own opponent.

In the yeshiva tradition the primary mode of study isn't lecture and isn't
solitary reading. It's *ḥavruta* — paired study, out loud, for hours, where your
partner's job is to attack you. The Talmud grounds it in Proverbs: iron sharpens
iron, and so two scholars sharpen each other.

It inverts almost everything modern professional life trains you to do. Agreement
is the sign of weakness.

<div class="not-prose gc-demo" id="gc-hv">
<div class="gc-demo-label">Live · a 45-minute session, with the swap built in</div>
<div class="gc-hv-face"><span class="gc-hv-clock" id="gc-hv-clock">20:00</span><span class="gc-hv-name" id="gc-hv-name"></span></div>
<div class="gc-hv-track"><span class="gc-hv-bar" id="gc-hv-bar"></span></div>
<div class="gc-hv-pips" id="gc-hv-pips"></div>
<div class="gc-hv-rule" id="gc-hv-rule"></div>
<div class="gc-controls">
  <button class="gc-btn" id="gc-hv-start" type="button">Start the session</button>
  <button class="gc-btn gc-btn-ghost" id="gc-hv-skip" type="button">Next phase</button>
  <button class="gc-btn gc-btn-ghost" id="gc-hv-reset" type="button">Reset</button>
</div>
<div class="gc-caption">Twenty, twenty, five. The middle block is the one everyone drops when they run this from memory, and it is the one that does the work — arguing a position you have just spent twenty minutes demolishing is the only exercise here that a determined person cannot fake alone.</div>
</div>

## 6 · The unsolved problem

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

<div class="not-prose gc-demo" id="gc-pr">
<div class="gc-demo-label">Live · problem first, method second</div>
<p class="gc-pr-stmt">Six people are at a party. Any two of them either know each other or don't. <b>Show that there must be either three people who all know each other, or three people who are all mutual strangers.</b></p>
<label><span class="gc-sr">Scratch space for your attempt</span>
<textarea class="gc-pr-scratch" placeholder="Think here. Nothing is saved, and nobody sees it."></textarea></label>
<div class="gc-controls">
  <button class="gc-btn" id="gc-pr-show" type="button" disabled>Approach unlocks in 1:30</button>
  <button class="gc-pr-skip" id="gc-pr-skip" type="button">skip the wait</button>
</div>
<div class="gc-pr-note" id="gc-pr-note">You have not been told what technique this needs, and that is deliberate — being handed the name of the method first is what turns a problem into an exercise.</div>
<div class="gc-pr-body" id="gc-pr-body" hidden>
<p><b>One way in.</b> Pick any one person; call her A. A has five relationships in the room, each of them one of two kinds. Five things in two boxes means one box holds at least three — so either A knows at least three people, or A is a stranger to at least three. Say she knows three of them: B, C and D.</p>
<p>Now look only at B, C, D. If any two of them know each other, that pair plus A is a trio who all know each other, and you're done. If none of them know each other, then B, C and D are three mutual strangers, and you're done. There is no third case.</p>
<p>(If A was instead a stranger to three people, run the identical argument with the two words swapped.)</p>
<p><b>What you just used</b> is the pigeonhole principle, and the answer is that six is the smallest number for which this is forced — with five people you can arrange the room so that neither trio exists. Nobody told you the name beforehand, which is the point: the technique was reachable from the problem, and reaching it yourself is what makes it yours the next time.</p>
</div>
<div class="gc-caption">Ninety seconds is not enough to solve it. It is enough to stop reading and start thinking, which is the transition the Budapest system was built to force and the one a worked example destroys.</div>
</div>

## The curriculum

Choose one thing: one paper, one chapter, one problem, one argument. Spend five
sessions on it across two or three weeks. If that feels absurdly slow, that
reaction is precisely the thing all six traditions were built to overcome.

### Session 1 · The fair statement — 40 minutes

Read it once. Reread it under a single prohibition: **you may not evaluate.** No
disagreement, no objections in the margin. Then write one paragraph stating the
author's case so well that the author would approve of it. Hand that paragraph to
someone who knows the material, or check it against the text line by line.

### Session 2 · The scramble — 45 minutes

Close the source. Fifteen minutes: write a forward summary from memory. Fifteen
minutes: write it backwards — conclusion first, then what it rests on, all the
way back to the opening premise. Then name the three central claims and explain
each one in terms of the other two.

### Session 3 · The warrant — 30 minutes

Take the one claim the whole thing rests on and trace it back. Who asserts it,
citing whom, citing what, until you reach a primary source. Write the chain out.
Then run two tests at every link: is this source reliable, and what can I — and
can I not — actually conclude from it?

### Session 4 · The case against — 50 minutes

State the question as a strict yes or no. Then, before writing one word of your
own answer, spend twenty minutes writing your three strongest objections to your
own position, strongest first. Add the single best consideration on your side.
Then your answer, in one paragraph. Then reply to each objection individually, by
number.

Any objection you cannot answer now becomes your actual position.

### Session 5 · The live test — 45 minutes

Out loud, with one partner. You state your answer; for twenty minutes they give
objections only. Then swap, and argue the position you just spent twenty minutes
demolishing. Use the last five minutes to write down what changed.

### Within 48 hours

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

<script>
  /* Page-local module loader, same shape as the ML article's. hx-boost swaps the
     body, so this inline script arrives with the page on every navigation — a
     <head> script would not. Each module is fetched only when its section is
     within 250px of the viewport, so the six of them cost nothing to a reader
     who stops after method two, and each init() is idempotent (they set
     data-gc-ready on their root) in case a swap re-runs this. */
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
    mount("gc-braid", "gc-braid.js", "GcBraid");
    mount("gc-om", "gc-openmind.js", "GcOpenMind");
    mount("gc-isnad", "gc-isnad.js", "GcIsnad");
    mount("gc-q", "gc-quaestio.js", "GcQuaestio");
    mount("gc-hv", "gc-havruta.js", "GcHavruta");
    mount("gc-pr", "gc-problem.js", "GcProblem");
  })();
</script>
