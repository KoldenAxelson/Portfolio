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

{{< logic-widget name="standard-form" title="Standard Form Example" icon="puzzle-piece" >}}
# P1  Whoever wrote *Macbeth* is the best playwright who ever lived.
# P2  Shakespeare wrote *Macbeth*
# --------------------------------------------------------------------------------------------------------------------------------------------------
# C   Shakespeare is the best playwright who ever lived.
{{< /logic-widget >}}

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

{{< logic-widget name="deductive-argument" title="Deductive Argument" icon="puzzle-piece" >}}
# P1  Socrates was a man.
# P2  All men are mortal.
# --------------------------------------------------------------------------------------------------------------------------------------------------
# C   Socrates was mortal.
{{< /logic-widget >}}

{{< logic-widget name="inductive-argument" title="Inductive Argument" icon="puzzle-piece" >}}
# P1  Most crows are black.
# P2  Carl is a crow.
# --------------------------------------------------------------------------------------------------------------------------------------------------
# C   Carl is most likely black.
{{< /logic-widget >}}

{{< term "inferential-claim-indicator" >}}Inferential claim indicator words{{< /term >}} are the words found in the conclusion that hint towards whether an argument is deductive or inductive. Additionally, we must treat the argument as it identifies itself. 

## 1.5 Recognizing Arguments

It's important to learn to distinguish arguments from {{< term "non-inferential-passage" >}}non-inferential passages{{< /term >}}. Those statements may have truth values, but lack the supporting two part structure. There's types of NIP's: {{< term "advice" >}}Advice{{< /term >}}, {{< term "conditional" >}}Conditional{{< /term >}}, {{< term "expository" >}}Expository{{< /term >}}, {{< term "illustration" >}}Illustration{{< /term >}}, {{< term "report" >}}Report{{< /term >}}, {{< term "statement-of-belief" >}}Statement of Belief{{< /term >}}, {{< term "warning" >}}Warning{{< /term >}}, and {{< term "explanation" >}}Explaination{{< /term >}}. Just because something is on that list, doesn't mean it can't be part of an argument, only that it is not an argument in it of itself. Explainations are tricky, as they contain an explanandum--- that which must be explained, and explanans--- that which does the explaining. Explainations can actually sometimes serve as arguments, only when the explanandum is contentious.

## Evaluative Terms

### Validity
*A property of deductive arguments in which: it is impossible for the premises to be true and the conclusion false.*

{{< logic-widget name="valid-argument" title="Valid Argument" icon="puzzle-piece" >}}
# P1  All cats are fish.
# P2  Konrad was a cat.
# --------------------------------------------------------------------------------------------------------------------------------------------------
# C   Konrad was a fish.
{{< /logic-widget >}}
*Valid, however the premise and conclusions are false.*

{{< logic-widget name="invalid-argument" title="Invalid Argument" icon="puzzle-piece" >}}
# P1  California is in the United States.
# P2  United States is in North America.
# --------------------------------------------------------------------------------------------------------------------------------------------------
# C   Konrad is in California.
{{< /logic-widget >}}
*Invalid, however the premise and conclusions are all true.*

### Soundness
*A property of valid deductive arguments in which: all the premises are true.*

### Strength
*A property of inductive arguments in which: it is likely when the premises are true that the conclusion is also true.*

The counterpart is {{< term "validity" >}}Validity{{< /term >}}, the premises being true or false does not weaken the argument. 

### Cogency
*A property of strong inductive arguments in which: all the premises are true, and no pertinent information is omitted.*
