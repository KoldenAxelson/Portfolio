---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : shows as the page heading + banner + Misc card label
# lead        : one-line summary under the banner (falls back to description)
# description  : used for SEO/meta and as the card blurb fallback
# weight      : chapter order in the list (1, 2, 3, …). Lower = higher up.
# updated     : renders a "Last updated …" line at the top of the chapter
# hidden      : set true to keep a work-in-progress chapter off the list
# draft       : set true to exclude from the built site entirely
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 1: What is Logic?"
lead: "What it is, why it matters, and an introduction of the terms."
description: "Chapter 1 of Basic Logic: What it is, why it matters, and an introduction of the terms."
weight: 1
updated: 2026-07-20
---

## 1.1 Reasoning and Argumentation

{{< term "reasoning" >}}Reasoning{{< /term >}} has been defined as the *"capacity to abstract, comprehend, relate, reflect, notice similarities and differences, etc."* However, logicians usually mean our ability to {{< term "infer" >}}infer{{< /term >}}, to grasp that the truth of some statements implies the truth of other statements. An {{< term "argument" >}}argument{{< /term >}} is a set of these statements that imply a truth connection between themselves, usually in an attempt to pursuade. {{< term "logic" >}}Logic{{< /term >}} is the studying of that reasoning.

Only stating a {{< term "conclusion" >}}conclusion{{< /term >}} is not arguing, that'd be closer to either giving a fact or stating an opinion. If you first state your {{< term "premise" >}}premises{{< /term >}} with your conclusion, it then becomes an argument. Such as the following--- The ocean is the most beautiful thing. The ocean is blue. Therefore, blue is the most beautiful color. This is an argument, though you may disagree that the ocean is the most beautiful thing, the ocean's blue-ness, or even if beauty is derived from color. 

## 1.2 Why Study Logic

Arguments being an attempt to pursuade, are found everywhere in life. Studying logic will allow you to spot good vs. bad arguments, so that you're pursuaded by good arguments, and disuaded from bad arguments. It'll also allow you to craft arguments, and beyond public speaking or sales, this has its application in computer programming, and even your own internal reasoning for systematic thinking. 

## 1.3 Introductory Terms

### Argument
*A group of statements, one of which is meant to be supported by the other(s).*

### Premise
*A statement that is meant to support the conclusion of its argument.*

### Conclusion
*A statement that is meant to be supported by the premise(s) of its argument.*

### Standard Form
*A written argument in which the premises are listed first and seperated from the coclusion by a horizontal line.*

{{< arg title="Standard Form Example" >}}
Whoever wrote *Macbeth* is the best playwright who ever lived.
Shakespeare wrote *Macbeth*
---
Shakespeare is the best playwright who ever lived.
{{< /arg >}}

### Statement
*A sentence that makes an assertion*

### Truth Value
*The result of an assertion being either true or false*

### Supports
*A quality of a statement in relationship to another statement to persuade of the second statements truth value.*

### Premise Indicators
As, Because, For, For the reason that, Given than, In that, On account of, Since

### Conclusion Indicators
Accordingly, Consequently, Hence, It follows that, Must, So, Therefore, Thus

## 1.4 Deductive Arguments and Inductive Arguments

{{< term "deductive" >}}Deductive Arguments{{< /term >}} are arguments in which the premises support the conclusion in such a way it would be *impossible* for the conclusion to be false. Meanwhile an {{< term "inductive" >}}Inductive Argument{{< /term >}} the premises support the conclusion to only be *likely*.

{{< arg title="Deductive Argument" kind="Deductive" >}}
Socrates was a man.
All men are mortal.
---
Socrates was mortal.
{{< /arg >}}

{{< arg title="Inductive Argument" kind="Inductive" >}}
Most crows are black.
Carl is a crow.
---
Carl is most likely black.
{{< /arg >}}

{{< term "inferential-claim-indicator" >}}Inferential claim indicator words{{< /term >}} are the words found in the conclusion that hint towards whether an argument is deductive or inductive. Additionally, we must treat the argument as it identifies itself. 

## 1.5 Recognizing Arguments

It's important to learn to distinguish arguments from {{< term "non-inferential-passage" >}}non-inferential passages{{< /term >}}. Those statements may have truth values, but lack the supporting two part structure. There's types of NIP's: {{< term "advice" >}}Advice{{< /term >}}, {{< term "conditional" >}}Conditional{{< /term >}}, {{< term "expository" >}}Expository{{< /term >}}, {{< term "illustration" >}}Illustration{{< /term >}}, {{< term "report" >}}Report{{< /term >}}, {{< term "statement-of-belief" >}}Statement of Belief{{< /term >}}, {{< term "warning" >}}Warning{{< /term >}}, and {{< term "explanation" >}}Explaination{{< /term >}}. Just because something is on that list, doesn't mean it can't be part of an argument, only that it is not an argument in it of itself. Explainations are tricky, as they contain an explanandum--- that which must be explained, and explanans--- that which does the explaining. Explainations can actually sometimes serve as arguments, only when the explanandum is contentious.

## Evaluative Terms

### Validity
*A property of deductive arguments in which: it is impossible for the premises to be true and the conclusion false.*

{{< arg title="Valid Argument" kind="Valid" note="Valid, however the premise and conclusions are false." >}}
All cats are fish.
Konrad was a cat.
---
Konrad was a fish.
{{< /arg >}}

{{< arg title="Invalid Argument" kind="Invalid" note="Invalid, however the premise and conclusions are all true." >}}
California is in the United States.
United States is in North America.
---
Konrad is in California.
{{< /arg >}}

### Soundness
*A property of valid deductive arguments in which: all the premises are true.*

### Strength
*A property of inductive arguments in which: it is likely when the premises are true that the conclusion is also true.*

The counterpart is {{< term "validity" >}}Validity{{< /term >}}, the premises being true or false does not weaken the argument. 

### Cogency
*A property of strong inductive arguments in which: all the premises are true, and no pertinent information is omitted.*

## Homework

### Section A — Natural Speech to Standard Form

Reading an argument out of everyday speech and rebuilding it in standard form is the whole skill this chapter builds toward. Tap a sentence to break it into its logical pieces, assemble each premise and the conclusion word by word, then check your work — the widget also names what *kind* of argument you just parsed.

{{< arg-builder >}}

### Section B — Deductive or Inductive?

Every argument is either deductive (its premises are meant to *guarantee* the conclusion) or inductive (they only make it *probable*). The tell is the inferential claim indicator — a word in the conclusion that reveals which kind of support is being claimed. Read each argument, decide which it is, then tap the word that gives it away.

{{< indicator-picker >}}

### Section C — Argument or Not?

Not every passage is an argument. Some only give advice, sound a warning, report events, explain a known fact, or state a condition — these are **non-inferential** passages, because nothing is actually being inferred. Read each passage, decide whether it's an argument, and if it isn't, name what kind of non-inferential passage it is.

{{< recognize-passage >}}

### Section D — Evaluate the Argument

Once you know whether an argument is deductive or inductive, you can judge how well it holds together. A deductive argument is either **valid** — its conclusion follows necessarily — or **invalid**; an inductive one is either **strong** or **weak**, depending on how much its premises raise the likelihood of the conclusion. Remember this is a question of *form*, not fact: an argument can be perfectly valid and still rest on a false premise. Decide which kind each argument is, then judge it.

{{< validity-picker >}}
