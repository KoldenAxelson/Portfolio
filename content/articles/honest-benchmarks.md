---
title: 'How Do You Tell If a Benchmark Is Honest?'
description: "A benchmark can mislead without anyone lying: a test that can't fail, a rival given no chance, or memory measured from the wrong place. Five questions to ask before you believe one."
pubDate: 2026-11-03
tags: ['computing', 'ml', 'benchmarks', 'explainer']
glossary: "ml"
# In review: builds at its URL but stays off every list, feed and sitemap,
# and is noindexed. Listed at /misc/drafts/. Publish by deleting these lines.
review: true
reviewOrder: 17
build:
  list: never
# Audit note from the writing session: SWE-bench Verified figures from OpenAI's
# posts (August 2024, updated February 2025; and February 2026); weak-baseline
# figures from Yang et al. (SIGIR 2019) and Ferrari Dacrema et al. (RecSys
# 2019); Lipton's 1971 student paper via Jia & Harman (TSE 2011, Section I);
# /proc fields from the kernel's proc documentation (Table 1-2 for VmRSS and
# VmHWM; the smaps and smaps_rollup sections for Pss). The existing evals article
# is background only, not linked (the series is standalone).
#
# Demos (both 2D): the key visual, {{< ml/mutation-test >}}, closes "Could it
# have failed?" (real mutation testing of a leap-year function); and
# {{< ml/memory-sampling >}} sits in "Where was it measured from?" (a made-up
# memory trace polled like VmRSS, against the true peak VmHWM keeps).
thoughts:
  - "The first question I ask of any benchmark now: what result would it have given if the thing were broken?"
  - "Most misleading numbers I've seen weren't lies. Someone just never checked that the test could fail."
---

Time a loop that computes something and then throws the result away, and the {{< term "compiler" >}}compiler{{< /term >}} may delete the work entirely, giving a wonderful and meaningless time. Google's benchmark library has `DoNotOptimize` for exactly this, to stop a result being ["optimized away by the compiler"](https://github.com/google/benchmark/blob/main/docs/user_guide.md#preventing-optimization).

Nobody lied there, and the {{< term "benchmark" >}}benchmark{{< /term >}} still says the code is fast. Each way a benchmark can mislead like that has a question that catches it.

## Could it have failed?

The empty loop fails the first question: could a different result have come out? Ask what the test would have shown if the thing under test were broken. If the answer is "the same", it measured nothing.

The same goes for checking a test suite. Richard DeMillo and two colleagues set out {{< term "mutation-testing" >}}mutation testing{{< /term >}} in [a 1978 paper](https://doi.org/10.1109/C-M.1978.218136): break the code on purpose, in small ways, and see whether the tests notice. A test that passes no matter what you break can't fail.

{{< ml/mutation-test >}}

## Could it have passed?

The opposite failure is a test that rejects good answers. SWE-bench grades AI fixes to real GitHub issues by running each project's own tests. When OpenAI had 93 software developers review 1,699 of its samples, they flagged [61.1% of them](https://openai.com/index/introducing-swe-bench-verified/) for tests that may "unfairly mark valid solutions as incorrect". The cleaned-up version, SWE-bench Verified, is 500 samples the reviewers found sound.

A test like that checks whether a model wrote the fix the test expects, so a correct fix written another way is marked wrong. Even the cleaned-up set had the problem: in February 2026, OpenAI audited the Verified problems that models often failed and found that [at least 59.4% had tests that reject correct fixes](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/). It has since stopped reporting Verified scores.

## Was the rival given a chance?

A test that can fail and pass fairly can still be rigged by what it's compared against. A new method is usually shown beating a {{< term "baseline" >}}baseline{{< /term >}}, an existing way of doing the same job. The question is how hard anyone tried to make the baseline good. Run it with its default settings while the new method gets weeks of tuning, and the win says more about the effort than the method.

It happens a lot. Jimmy Lin's group went through papers on one standard search benchmark and found that in [36 of 109, a third](https://arxiv.org/abs/1904.09171), the baseline scored below the median entry in the 2004 contest the benchmark came from. Another team tried to rerun 18 recent neural recommendation methods; only 7 could be reproduced with reasonable effort, and [6 of those](https://arxiv.org/abs/1907.06902) could often be beaten by simple, well-tuned methods, some of them long known.

## Would it come out the same again?

A fair rival still needs a fair measurement. A single run is a single sample, and timing is noisy. Some of the noise doesn't even change between runs. Todd Mytkowicz's team showed that things with nothing to do with the code, such as [the size of the environment variables](https://doi.org/10.1145/1508284.1508275) or the order the program's object files were linked in, shifted its speed enough to flip whether gcc's `-O3` setting looked faster than `-O2`. Each setup gave the same answer every time it was rerun, so repeating the run couldn't expose the problem, but changing the setup between runs could.

So ask how many runs there were, how much they varied, and whether the setup was changed between them. A 3% win from a handful of runs that swing by 10% could easily be noise.

## Where was it measured from?

Even a steady number can come from the wrong place, and memory is where that's easiest. A program can count its own allocations, but it only sees what goes through its own bookkeeping. Python's `tracemalloc`, for example, traces ["memory blocks allocated by Python"](https://docs.python.org/3/library/tracemalloc.html), so memory a compiled library gets straight from C's `malloc()` can [slip past it](https://docs.python.org/3/c-api/memory.html) unless the library reports it.

The operating system sees all the memory a process has in RAM, whoever asked for it. On Linux, `/proc/<pid>/status` reports `VmRSS`, its {{< term "resident-set-size" >}}resident set size{{< /term >}} (how much is in RAM right now), and `VmHWM`, its [peak, the "high water mark"](https://docs.kernel.org/filesystems/proc.html). That second one matters: check `VmRSS` once a second and a spike shorter than that can fall between two checks, while `VmHWM` still records it.

{{< ml/memory-sampling >}}

## So how do you tell if a benchmark is honest?

Ask it the five questions: could it have failed, could it have passed, did the rival get the same care, would it come out the same again, and could the place it was measured from see everything it counts? The loop the compiler emptied fails the first one in a second, however fast it looks.

A benchmark that survives all five is worth believing. One that hasn't been asked is just a number.

## References & further reading

The sources in the order they appear.

{{< ml/references >}}
