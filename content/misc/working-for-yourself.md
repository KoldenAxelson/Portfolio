---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The page
# for going independent: freelancing, building a product, and the business
# numbers under both. New videos on any of that fold in here. The MBA video's
# section is deliberately self-contained so it can move to its own page later.
#
# youtube : the freelancing video, as the flag. Its presence marks the card at
#           /misc/ (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/working-for-yourself/, styled by
# css/pages/working-for-yourself/working-for-yourself.css on top of the shared
# video-notes box, with behaviour lazy-loaded from static/js/working-for-yourself/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Working for Yourself"
description: "Notes on five videos about going independent: a seven-day freelance launch, how Linear broke into Jira's market by choosing quality, a founder's three steps to a high-leverage business (taken with some salt), a free site that undercut a $400 stock-footage fee, and the MBA numbers underneath all of it."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "From selling your hours to selling something that sells without you."
blurb: "Five videos on going independent: launching a freelance business in a week, building a product people love, testing an idea before you build it, and the numbers that decide whether any of it pays."
icon: "briefcase"
group: "better"
prose: true
youtube: "https://youtu.be/aymkhtyJfYM"
---

I'm losing some faith in the corporate path, and being my own boss sounds
good in the way things sound good before you've priced them out. I've done
contract work before ([BigHammerGarage](/projects/bighammergarage) was one), but
never as the plan. These are my notes on five videos about making it the plan.

They run in a rough order. Freelancing sells your time, so it starts fast and
caps out. A product sells without you, so it starts slow and doesn't. The page
follows that order: a one-week freelance launch, then building something that
sells on its own, then the arithmetic that decides whether either one pays. It's a synthesis of other people's claims,
and I've marked where I trust them less.

| # | Idea | From |
|---|------|------|
| 1 | Sell a solved problem, priced from a floor | A freelancer of 16 years |
| 2 | Test the idea before you build it | A founder, with caveats |
| 3 | Make quality the strategy | How Linear took on Jira |
| 4 | Find the toll on something free | A free stock-footage site |
| 5 | Know your break-even | An MBA in 25 minutes |

## 1 · Sell a solved problem

Jamie, a freelancer for sixteen years with clients from Google and Netflix
down to boring B2B companies that "pay better than those big guys," starts
with the mistake most new freelancers make: naming a skill. "I do
graphic design" sounds replaceable. Business is money exchanged for solved
problems, so the offer should be one sentence you could say at a bar: I solve
*this problem* for *these people* to get *this result*. "I write launch emails
for new SaaS products to help drive early traction."

Pick the lane by asking which of your skills makes someone money, saves them
time or removes risk, where you've already done that (a day job counts), and
which people you naturally understand. Industries over-represented in your own
network grow fastest. Then give your process a name, like a "brand clarity
sprint," because a named process sounds owned.

Jamie's pricing rule is the part I'd never heard. Don't price from the market or
from what you need to survive. Price from what it would cost you to
subcontract the job, plus your margin, so the work could run without you. The
worked example: $80K a year across 40 projects with a 25% buffer means no
project under $2,500. When a client pushes on budget, negotiate the scope,
never the fee.

{{< working-for-yourself/floor >}}

The rest of the week is short enough to keep as a table:

| Day | Build | The move that matters |
|-----|-------|----------------------|
| 1 | A lane | Problem first; check Upwork for who's paying and the words they use |
| 2 | An offer | The one-sentence offer, a floor price, a named process |
| 3 | A process | Onboarding, pre-production sign-off, a midpoint check-in, a delivery email that pitches the next project |
| 4 | A portfolio | Two or three spec projects, labeled as spec, each with a one-paragraph case study |
| 5 | Your network | Ten handwritten messages: what you do, for whom, "feel free to forward this" |
| 6 | Job boards | Search by problem; a three-sentence pitch ending in a call or a Loom |
| 7 | A launch post | What you offer, who it's for, what to do next |

Two lines from that week stuck. Iterate "on the cheap side of the project,"
while it's still a sketch, because changes get expensive once it's built. And
the trophy is the repeat client, which is why delivery ends with a pitch for
the next job.

## 2 · Test it before you build it

Freelancing caps at the hours you have. The alternative is a
"high-leverage" business: recurring revenue, margins around 70%,
growth through software instead of headcount, and a product you own. That case comes from a founder who says
they sold their last company for $110 million, and I'm taking it with some
salt. It quotes statistics I couldn't trace, so
I've kept only the ideas that stand without its numbers. Its "no agencies, no
consulting" rule also clashes with section 1, and I read it as where to end
up.

What holds up is the insistence on selling before building: recruit a "customer advisory board" of ten real prospects who sign a letter
of interest before you write code, then build a "black car product" that
solves one problem only, after Henry Ford's any-color-so-long-as-it's-black.
The sales order is what, how, who: what change they want, how you'll deliver
it, and why you're the one to trust. Prospects liked the founder's product and
didn't buy until the pitch added slides about the team.

The cheapest test is a fake door. A chef with a cooking blog adds a "buy my
book" page that just collects emails, and checks the clicks two weeks later.
The founder's math turns those clicks into $12,000 a month. All of it rests on one
borrowed guess about how many clickers would actually buy.

{{< working-for-yourself/fakedoor >}}

## 3 · Make quality the strategy

Linear's story is the most convincing case here. In 2019 three Finnish founders went after
issue tracking, a market Atlassian's Jira owned so thoroughly that collaborating
with another team usually meant using Jira. Their wedge was speed and focus,
against a tool developers mostly try to avoid.

They scoped the first version by user instead of by feature: small startups
like their own, with enterprise leads turned away. They let in about ten new
users a week, took no funding until investors came to them, and by the video's
account were profitable within two years. Early on
they spent six months on a sync engine that makes every change feel instant.
The lesson is to invest early in infrastructure a
competitor can't copy without rewriting everything, not to build a sync engine
"for your horse Tinder project."

The process is the part I'd steal. No A/B tests; taste and real users decide.
Prototypes ship in three to five days behind a feature flag, first to the team,
then to beta users, then to everyone. Bugs beat features, with an internal
one-day fix target. And no customization that helps a middle manager's reports
at the expense of the person who lives in the tool. Survivorship bias applies,
though: the founders came from Uber, Airbnb and Coinbase, and their
first waitlist followed them from there.

## 4 · Find the toll on something free

Getty Images charges $400, its lowest
license, for a three-second clip of General Patton that comes from a public
domain film on archive.org. One creator built a free site that pulls the
public domain FedFlix collection from archive.org, cuts each film into
individual shots automatically, and makes them searchable by what's in the
picture. It holds over 40,000 shots, each linked to its source, with no
sign-up, paywall or ads.

It isn't a business; it runs at a loss on donations. But the shape of the
opportunity is worth keeping. When an incumbent charges for convenience on top
of something free, the convenience is the whole product, and cheap tools can
rebuild it.

## 5 · Know your break-even

A year of business school squeezed into 25 minutes is mostly definitions
worth keeping, and it deserves a page of its own someday. For working alone, these are the ideas that matter most.

Cash is not profit. Accrual accounting books revenue when it's earned, so a
January sale paid in July makes you profitable in January and broke until
summer, and a profitable company can still run out of cash. Working capital
(current assets minus current liabilities) is whether you can pay the bills.

Price has four common bases: cost plus markup, the value you create, what
competitors charge, and how hard buyers flinch when the price rises. The
rule underneath all four is that if price is less than cost, you are a
charity. Everything else falls out of contribution margin, the price minus the
cost of each unit, which pays down your fixed costs:

{{< working-for-yourself/breakeven >}}

The finance half adds the time value of money: a dollar today is worth more
than a dollar later, so future cash gets discounted, and a project is worth
doing when its discounted returns beat what it costs (positive net present
value). Payback period is the fast-food version, quick and filling and blind
to anything after the money comes back.

## The plan

Read in order, it's a path more than a choice:

1. Write the one-sentence offer and set a floor price before the first call.
2. Freelance in that lane, with a real process, and watch for the problem
   clients keep paying to have solved.
3. Before building a product for it, put up a fake door and line up people
   who'll sign something.
4. Build the black car: one problem, for one kind of user, at a quality the
   incumbents can't be bothered with.
5. Know the break-even, and keep enough cash to survive the gap between
   earning money and receiving it.

## Sources {#sources}

Five videos, watched in October 2026. Everything above is my synthesis of their
arguments, and the figures (Atlassian's and Linear's valuations, the $110
million sale, the $400 license, the freelancer's client list) are the
speakers' claims. I've treated the million-dollar video with the most caution,
because its statistics come without sources. The
footage site's address is garbled by the captions, so I've left it out.

{{< ml/references >}}
