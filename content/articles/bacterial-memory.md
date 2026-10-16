---
title: 'Could a Learning Machine Remember Like a Bacterium?'
description: "A hypothesis, not a result: bacteria remember without neurons, using iron, primed sensors, self-sustaining gene loops and fast and slow ribosomes. Adam already copies one of those tricks. What if an optimizer also borrowed the slime mould's trick of keeping memory in a shared, fading trail?"
pubDate: 2026-10-16
tags: ['ml', 'optimization', 'biology', 'hypothesis']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 6
build:
  list: never
# Audit notes from the writing session: the A. baumannii result is a bioRxiv
# preprint (not peer reviewed); the Northwestern result is simulation with lab
# validation ongoing; the PRX Life paper was read through The Scientist's
# summary because the journal page wouldn't load. The swarm demo's constants
# were tuned headless (see the header of scripts/pages/ml/swarm.ts).
thoughts:
  - "This one's a hunch I wanted to write down before I talked myself out of it."
  - "Adam already has the bacterium's two-speed memory. It just forgets everything when the run ends."
---

Bacteria don't have brains, and a handful of recent studies say they remember
anyway. E. coli that has swarmed before swarms faster the next time. A hospital
superbug that gets a whiff of hydrogen peroxide stays braced for the real
attack. A cell that has lived through feast and famine adapts faster to the
next meal. None of it uses a single neuron.

I found these strung together in [a video from Anton Petrov](https://youtu.be/OtuNKZh2gnA),
and I keep coming back to one question: what would a learning machine look
like if its memory worked like a bacterium's instead of a brain's? This post is
a hypothesis, not a result. I'll say where the evidence ends.

## Four ways to remember without a brain

### Iron

A team at UT Austin found that E. coli's swarming memory is
simply [the cell's iron level](https://pmc.ncbi.nlm.nih.gov/articles/PMC10691332):
low iron means swarm early and well, high iron goes with settling into a
{{< term "biofilm" >}}biofilm{{< /term >}}. Daughter cells inherit the level,
and the memory lasted to the fourth generation before fading by the seventh.
One number, passed down.

### A primed sensor

In [a preprint](https://www.biorxiv.org/content/10.64898/2026.04.08.717352v1)
that hasn't been peer reviewed yet, researchers report that the superbug
Acinetobacter baumannii uses a nickel-bearing sensor to detect hydrogen
peroxide. A harmless dose keeps its defenses switched on for 30 to 90 minutes
after the signal is gone, and primed cells survived lethal doses better. That's
a short-lived expectation: trouble is coming.

### A loop that outlasts its cause

Adilson Motter's group at Northwestern modeled E. coli's
{{< term "gene-regulatory-network" >}}gene regulatory network{{< /term >}} and
found that [switching one gene off briefly](https://news.northwestern.edu/stories/2024/august/bacterial-cells-transmit-memories-to-offspring)
can tip it into a self-sustaining state that outlasts the cause and passes to
offspring. So far that's simulation, with lab tests under way.

### Two speeds

A Georgia Tech team tracked tens of thousands of
single E. coli cells through cycles of feast and famine. Cells with a chaotic
past adapted faster to the same meal, and their model puts the memory in
{{< term "ribosome" >}}ribosome{{< /term >}} pools that change at different
speeds: [fast ones tracking now, slow ones holding the past](https://www.the-scientist.com/bacteria-learn-and-store-memories-like-ai-neural-networks-75062).
The authors compare it to a gated recurrent network.

## The optimizer already has two clocks

That last one made me sit up, because {{< term "training" >}}training{{< /term >}} already does a version of it.
{{< term "stochastic-gradient-descent" >}}Stochastic gradient descent{{< /term >}}
steps downhill on a noisy {{< term "loss" >}}loss{{< /term >}} and remembers
nothing between steps. {{< term "momentum" >}}Momentum{{< /term >}} adds a
memory of recent direction. {{< term "adam" >}}Adam{{< /term >}}, the
{{< term "optimizer" >}}optimizer{{< /term >}} behind most large models, keeps
[two of them](https://arxiv.org/abs/1412.6980): a fast
{{< term "exponential-moving-average" >}}exponential moving average{{< /term >}}
of the gradient and a slow one of its square.

{{< ml/clocks >}}

That's the {{< term "ribosome" >}}ribosome{{< /term >}} trick, more or less. But {{< term "adam" >}}Adam{{< /term >}}'s memory lives inside one
run, attached to one set of {{< term "weights" >}}weights{{< /term >}}, and it's
thrown away when the run ends. Every bacterial trick above does something {{< term "adam" >}}Adam{{< /term >}}
doesn't: it outlives the stimulus, it's inherited, or it's shared.

## Memory you can leave behind

The second video I keep thinking about is from [The Pathfinder's Codex](https://youtu.be/FhGKnjOtvQo),
which combines three artificial-life simulations: boids, particle life and a
slime mould. Boids and particle life react to their neighbors. The slime
particles leave a chemical trail instead, with three knobs: how much they
deposit, how fast it diffuses, how fast it evaporates. Then they steer by
sensing it. The creator calls it environmental memory, and that's exactly
right. The memory isn't in any particle; it's
{{< term "stigmergy" >}}stigmergy{{< /term >}}, coordination through marks left
in the world.

Optimization has borrowed this before.
{{< term "particle-swarm-optimization" >}}Particle swarm optimization{{< /term >}}
moves [a flock of guesses](https://doi.org/10.1109/ICNN.1995.488968) toward the
best spots any of them has found, and ant colony optimization lays
[digital pheromone](https://doi.org/10.1109/3477.484436) on good paths. A real
slime mould once grew [a network close to Tokyo's rail system](https://doi.org/10.1126/science.1177894).
Each is {{< term "emergence" >}}emergence{{< /term >}}: no part knows the plan.

## The hypothesis

Here it is, stated plainly enough to be wrong. Run a population of {{< term "adam" >}}Adam{{< /term >}}
{{< term "optimizer" >}}optimizers{{< /term >}} on the same problem and give them a shared trail. Each deposits
where its {{< term "loss" >}}loss{{< /term >}} is good, the trail spreads and fades, and each step blends the
optimizer's own gradient with the pull of the trail. When a run ends, keep the
trail and start the next generation in it, the way daughter cells inherit iron.

{{< ml/swarm >}}

On this toy {{< term "loss-landscape" >}}loss landscape{{< /term >}}, it does
what I hoped. {{< term "optimizer" >}}Optimizers{{< /term >}} stuck in a {{< term "local-minimum" >}}local minimum{{< /term >}}
get pulled toward the deeper valley others found, and the next generation
starts already leaning toward it. The coupling slider is the same open question
the slime video ends on: add the trail as another force, blend it in, or let it
change the optimizer's own settings? Push it too far and everyone piles into
whichever valley got marked first.

## Where it breaks

The landscape above has two {{< term "weights" >}}weights{{< /term >}}. A real {{< term "neural-network" >}}neural network{{< /term >}}
has millions or billions, so there's no map to lay a trail on, and running many
copies multiplies the compute. The trail would have to live somewhere small:
in the hyperparameters, say, or in a compressed summary of the {{< term "weights" >}}weights{{< /term >}}.
{{< term "population-based-training" >}}Population-based training{{< /term >}}
already does [the inheritance half](https://arxiv.org/abs/1711.09846) for
hyperparameters, so that's where I'd start.

The payoff I'd look for isn't beating {{< term "adam" >}}Adam{{< /term >}} on a fixed {{< term "benchmark" >}}benchmark{{< /term >}}. It's
{{< term "continual-learning" >}}continual learning{{< /term >}}, where a model
keeps learning as the world changes and
{{< term "catastrophic-forgetting" >}}catastrophic forgetting{{< /term >}} is
[the standing problem](https://arxiv.org/abs/1612.00796). That's what the
bacteria are good at: keep a cheap, fading record of what the world was like,
and let it bias the next response.

## So, could it?

Partly, it already does. {{< term "adam" >}}Adam{{< /term >}}'s two clocks are the {{< term "ribosome" >}}ribosome{{< /term >}} trick in
different clothes. What a learning machine doesn't have is memory outside its
{{< term "weights" >}}weights{{< /term >}}: a trail that outlives one run, is shared by a whole population, and
fades on purpose. That's the experiment I want to try next, on hyperparameters
first, where a trail actually fits.

## References & further reading

{{< ml/references >}}
