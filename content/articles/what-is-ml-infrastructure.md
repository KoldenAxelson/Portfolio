---
title: 'What Is ML Infrastructure?'
description: "Machine learning infrastructure is what's built around these AI models to turn a chatbot into a real business: hooking up tools, and housing it on architecture to serve millions."
pubDate: 2026-07-15
tags: ['ml', 'infrastructure', 'mlops', 'explainer']
glossary: "ml"
thoughts:
  - "Wrote the version I wish someone had handed me when 'MLOps' still sounded like a spell."
  - "The model is the recipe. Everything I actually get paid for is the restaurant."
---

By now, we're all familiar with the basics of chatbots. {{< term "llm" >}}Large language models{{< /term >}} are {{< term "model" >}}models{{< /term >}} trained on a huge pile of text to predict what comes next. It's a neat parlor trick, and left at that, it makes a great wiki helper. The interesting part is where we give it some teeth to bite with.

That part is **ML infrastructure**: your AI assistant getting access to your files, your emails, and the rest, able to complete real tasks. Order you real coffee. Steal your real job. That's the sophisticated stuff, and it's where almost all of the engineering lives. Once you can see it, you can't unsee it. Let me build it up one piece at a time, with a few toys you can poke at along the way.

## First: what even is a "model"?

At the end of the day, a {{< term "model" >}}model{{< /term >}} is just a *function* whose contents are decided by the machine, through {{< term "training" >}}training{{< /term >}}. The simplest version is {{< term "linear-regression" >}}linear regression{{< /term >}}: a pattern emerges from the data points, you draw a line through it, and any new point lands somewhere on that line. It's *learning* in the sense that the pattern is emerging.

Here's a hands-on example: a 28×28 pixel grid. Each pixel has a sort of memory: "if I'm lit up, I'm most likely this number." Some pixels lean toward several numbers at once, so the model reads them in combination ("if I'm lit and my north neighbor is lit too, I'm probably a 4") when it wants more precision. This little {{< term "neural-network" >}}neural network{{< /term >}} is actually running totally locally, in your browser. (Not relevant, but I like to brag.)

{{< ml-digits >}}

That's the whole model. About nineteen thousand {{< term "weights" >}}weights{{< /term >}} (squeezed down with a {{< term "quantization" >}}quantization{{< /term >}} trick we'll get to), and it worked out its own rules instead of being handed any. The model behind a chatbot is millions of times bigger, but it's the exact same shape: input in, guess out. Everything else in this article is the stuff bolted around that box.

Here's the picture I keep coming back to: the model is a **recipe**. Everything else is the **restaurant**: the kitchen, the walk-in fridges, the supply trucks, the waiters, the dish pit. Everything that turns one good recipe into a thousand hot meals a night without poisoning anybody.

## The model is the easy part

Getting a model to work *once*, on your laptop, is the easy 10%. The other 90% is getting fresh data into it, retraining it without breaking anything, and shoving the result in front of real users, again and again, automatically, forever. A famous paper drew this to scale: in a real ML system, the box with the actual model code is a speck, swallowed by the sprawl of data, serving, and monitoring around it ([Sculley et al., "Hidden Technical Debt in Machine Learning Systems"](https://proceedings.neurips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html)). That loop has a name, {{< term "mlops" >}}MLOps{{< /term >}}, and what makes it its own discipline is {{< term "continuous-training" >}}continuous training{{< /term >}}: a model has to keep relearning just to stay correct.

Step through the loop below. Every stage is its own category of tooling and engineering, and the whole thing runs on repeat every time new data shows up.

{{< ml-mlops-loop >}}

Step four, the {{< term "eval-gate" >}}eval gate{{< /term >}}, is the quiet hero here. The rule is blunt: if the new model isn't actually better than the one already running, it doesn't ship. A big chunk of ML infrastructure exists just to enforce that automatically, so nothing bad slips out to your users at 2am while everyone's asleep. Google's own [*Rules of Machine Learning*](https://developers.google.com/machine-learning/guides/rules-of-ml) says it from the other side: nail your metrics and your infrastructure first, *then* get clever with the model.

## What the model actually eats

Go back to step one of that loop, *ingest data*, the tile that slid into the model box in half a second. That half second hides most of the actual job. A model is only ever as good as what it learned from, and that data doesn't fall from the sky: somebody has to gather it, clean it, label it, and park it somewhere the training run can reach. That whole apparatus is the {{< term "data-layer" >}}data layer{{< /term >}}, and on most real teams it's where most of the work goes.

Start with {{< term "label" >}}labels{{< /term >}}. Our little digit net learned from tens of thousands of images, each stamped with the right answer: this is a 7, this is a 2. Someone, or something, had to make those stamps, and if they're wrong, the model learns your mistakes faithfully. Feed it enough 7s labeled "1" and it'll call sevens ones, confidently, forever. Garbage in, garbage out isn't a slogan here. It's a mechanism.

{{< ml-garbage-in >}}

Then there's the trap of computing the same data twice. A {{< term "feature" >}}feature{{< /term >}} you calculate during {{< term "training" >}}training{{< /term >}} (a user's average order size, say) has to be calculated the exact same way when a live request lands, or the model sees a subtly different world in production than the one it trained on. Teams stand up {{< term "feature-store" >}}feature stores{{< /term >}} and pipelines mostly to kill that {{< term "train-serve-skew" >}}train/serve skew{{< /term >}}, and to keep last week's numbers meaning the same thing as this week's. Not hypothetical: the Uber team behind [Michelangelo](https://www.uber.com/us/en/blog/michelangelo-machine-learning-platform/), one of the first company-wide ML platforms, ran a feature store precisely so the exact same transformation code runs offline in training and online in serving, closing the gap by construction.

And since you'll eventually need to reproduce, audit, or roll back a model, the data needs {{< term "data-versioning" >}}data versioning{{< /term >}} too, just like code. "Which exact snapshot did this train on?" is a question you have to be able to answer. This is what people mean when they call data the real moat: the architecture is usually public, but nobody else has your data: gathered, cleaned, labeled, and versioned the way you have it.

## Watching it rot

Nothing about the model changes on its own. The {{< term "weights" >}}weights{{< /term >}} freeze the second you ship. And yet a model that scored 97% on launch day gets quietly worse, week after week, nobody touching a thing. It didn't break. The world moved, and it didn't.

This is {{< term "drift" >}}drift{{< /term >}}. Handwriting changes, fraud patterns evolve, slang turns over, and the frozen model keeps answering like it's still launch day. The gap between the world it learned and the world it's serving widens, and accuracy leaks out through it. And it's quiet: service up, latency fine, nothing red in the logs. The answers just slowly get worse.

{{< ml-drift >}}

So you watch it. {{< term "monitoring" >}}Monitoring{{< /term >}} an ML model isn't your usual CPU-and-error-rate dashboard. It's watching the *predictions themselves*, the kind of quiet distribution shift Chip Huyen's [*Designing Machine Learning Systems*](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) spends whole chapters on. Are the outputs still distributed like they used to be? Is confidence sliding? When the real answers finally roll in, is it still right as often? Cross a threshold and an alarm fires, and that alarm is what kicks the loop back to step one: ingest, retrain, re-evaluate, ship. The cycle you clicked through earlier finally has a motor. Drift is what turns it.

## Now do it a million times

A model answering one request is a demo. A model answering a million requests an hour, every hour, without ever falling over, is a product. Everything between those two is infrastructure. This layer has a name: {{< term "inference" >}}serving{{< /term >}}, or {{< term "inference" >}}inference{{< /term >}}.

Drag the traffic up and watch one server struggle. Then switch on autoscaling and try again.

{{< ml-load >}}

One fixed server holds up fine, until it doesn't. Push enough traffic and answers slow, then requests start dropping: the dreaded endless spinner. {{< term "autoscaling" >}}Autoscaling{{< /term >}} notices the crowd and adds servers so {{< term "latency" >}}latency{{< /term >}} stays flat. Bolt on health checks, retries, and monitoring, and you've got something that survives 3am on launch day. None of that reliability is the model's job. It's the infrastructure's.

## And do it cheaply

One last force: money. Every answer a model gives burns a little compute, and "a little" times "a million" is a real invoice. Which is why "make the model cheaper to run" is its own specialty, not an afterthought.

Play with the dials to size up a workload. Then flip on the optimizations, {{< term "quantization" >}}quantization{{< /term >}} and {{< term "batching" >}}batching{{< /term >}}, and watch the monthly bill fall. This isn't a paper trick: one landmark method, [LLM.int8()](https://arxiv.org/abs/2208.07339), ran a 175-billion-parameter model in 8-bit instead of 16, roughly halving the memory, with no measurable drop in accuracy.

{{< ml-cost >}}

Same model, same answers, a fraction of the cost. Multiply that gap across a growing company and it's obvious why inference optimization is one of the most valued skills in the field right now: it converts, almost directly, into margin.

## When it breaks, it lies

Regular software fails loud. A bug throws an exception, a stack trace hits the logs, a page goes red, somebody gets paged. The failure announces itself.

A model won't do you that favor. Ask it something it can't handle and it doesn't throw. It hands you a confident, well-formatted, completely wrong answer, in exactly the same shape as a right one. No exception, because from the model's point of view nothing went wrong: input in, output out, same as always. Your instincts are tuned for loud failure. Machine learning fails silent.

So a whole layer of infrastructure exists to catch the model being confidently wrong. Google even turned it into a scorecard, [*The ML Test Score*](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/), a 28-point rubric for the tests and monitoring that keep a silently-broken model out of production. {{< term "guardrail" >}}Guardrails{{< /term >}} check the output before it reaches a user. When something smells off, you {{< term "fallback" >}}fall back{{< /term >}} to something safer. None of this makes the model smarter. It just refuses to let a quiet mistake walk out the door. And most of it, as we're about to see, lives in the layer wrapped around the model, not the model itself.

## The twist for language models

Everything so far applies to any model, from our little digit net to the giant behind a chatbot. But once the model *is* one of those giants, a {{< term "llm" >}}large language model{{< /term >}}, a few new pieces of infrastructure show up, and they're where a lot of today's work is happening.

The shape's the same: text goes in as {{< term "token" >}}tokens{{< /term >}} (that cost-demo dial, remember), text comes out. But the model is frozen at its {{< term "training-cutoff" >}}training cutoff{{< /term >}}, so you feed the knowledge in at question time. That's {{< term "rag" >}}retrieval-augmented generation{{< /term >}}: look up the relevant documents and hand them to the model along with the question. The [paper that coined the term](https://arxiv.org/abs/2005.11401) bolted a frozen model onto a searchable index of Wikipedia and got more specific, more factual answers than the model gave alone. Doing that lookup fast means storing text as {{< term "embedding" >}}embeddings{{< /term >}} in a {{< term "vector-database" >}}vector database{{< /term >}}. A surprising amount of LLM infrastructure is just this retrieval plumbing.

Tokens aren't quite words and aren't quite characters. Type into the box and watch the split happen: the {{< term "token" >}}token{{< /term >}} count, not the word count, is the number you're billed for.

{{< ml-tokens >}}

And here's retrieval itself, made concrete. Pick a question about a company whose private docs the model never saw in training, and watch it either guess from memory or answer straight from the retrieved document.

{{< ml-rag >}}

Two more terms you'll keep hearing. {{< term "fine-tuning" >}}Fine-tuning{{< /term >}} vs. {{< term "prompting" >}}prompting{{< /term >}} is the build-versus-configure call of the LLM world: retrain the weights on your own data, or write a sharper prompt and retrieve better context? The second is cheap and usually enough. And the {{< term "kv-cache" >}}KV cache{{< /term >}} is the quiet reason serving LLMs is its own discipline. Manage it well and you've won half the battle on speed and cost. The [vLLM project](https://arxiv.org/abs/2309.06180) made the point by stealing a trick from operating systems, paging that cache the way an OS pages virtual memory, and lifting {{< term "throughput" >}}throughput{{< /term >}} two-to-four-fold at the same latency.

## The harness on top

Come back to the very first idea in this piece: a model is just a function. Input in, prediction out. No memory, no initiative. On its own it can't open a file, look something up, run a command, or string two steps together. So how does a bare next-token predictor turn into something that writes code, works a support queue, or grinds through a multi-step task?

You wrap it in a {{< term "harness" >}}harness{{< /term >}}: the loop that lets it take one step, see what happened, and pick the next. That reason-act-observe cycle got its name in the [ReAct](https://arxiv.org/abs/2210.03629) work, which showed a model interleaving thinking with real actions against outside tools instead of guessing in one shot. The model brings the judgment; the harness brings the hands, the memory, and the guardrails. Claude Code is the obvious example: the underlying model can't touch your filesystem, but wrap it in a harness with file access, a shell, and a feedback loop, and it becomes something that reads a codebase, makes edits, runs the tests, and reacts to what broke. Anthropic's own [guide to building effective agents](https://www.anthropic.com/engineering/building-effective-agents) draws the line here, between fixed workflows that script the model's steps and true {{< term "agent" >}}agents{{< /term >}} that let it drive its own tools.

Watch one run of that loop: think, call a tool, read what comes back, decide the next move, over and over until the job is done.

{{< ml-agent >}}

This is where the earlier pieces come home to roost. The retries, validation, and {{< term "fallback" >}}fallbacks{{< /term >}} from the silent-failure section mostly live here, in the harness, not the model. So do the evals, except now you're not scoring one prediction, you're scoring whether the whole agent actually got the job done. And it's the layer people actually touch: when someone says they "use an AI tool," they almost always mean a harness with a model inside it. Back to the kitchen: if the model is the recipe, the harness is the line cook, the one who reads it, works the stations, tastes as it goes, and plates the dish.

## So, what is ML infrastructure?

Put the pieces together and it's this: everything that turns a clever model into a product a lot of people can actually use.

It's the data plumbing that feeds the model: gathered, labeled, versioned. It's the [pipeline that retrains and ships it safely](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning), with an {{< term "eval-gate" >}}eval gate{{< /term >}} on the door and {{< term "monitoring" >}}monitoring{{< /term >}} watching for {{< term "drift" >}}drift{{< /term >}} to decide when to pull the trigger. It's the {{< term "inference" >}}serving{{< /term >}} layer that answers real requests fast, no matter how big the crowd. It's the cost engineering that keeps the whole thing cheap enough to stay in business. It's the {{< term "guardrail" >}}guardrails{{< /term >}} that catch the model being confidently wrong, because it fails quiet, not loud. And more and more, it's the {{< term "harness" >}}harness{{< /term >}} around the model that turns a bare function into something that actually does the work.

The model is the recipe. ML infrastructure is the restaurant. And if you've ever run anything at scale (servers, deploys, uptime, budgets), you already speak most of the language. The models are the new part. The plumbing is the same job it's always been.

## References & further reading

Every claim above traces back to one of these, in roughly the order the article reaches them. Start here if you want past the toy demos.

{{< ml-references >}}
