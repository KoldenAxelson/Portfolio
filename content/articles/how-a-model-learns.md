---
title: 'How Does a Model Actually Learn?'
description: "No math required: loss, gradient descent, learning rates and overfitting, with a line you can train by hand and a curve you can watch memorize the practice test."
pubDate: 2026-09-01
tags: ['ml', 'training', 'fundamentals', 'explainer']
glossary: "ml"
thoughts:
  - "'The machine learns' sounds mystical. It's a very patient game of hot and cold."
  - "Picture training as 'roll downhill on the error' and half the jargon in ML stops being scary."
---

In the [first post of this series](/articles/what-is-ml-infrastructure/), I said a {{< term "model" >}}model{{< /term >}} is a function whose inner numbers are learned from examples instead of written by hand. That's true, but it skips the interesting part. *How* does a pile of numbers learn anything?

The answer is a surprisingly simple game of hot and cold, repeated an enormous number of times. You need three ideas: a way to score how wrong you are, a way to know which direction is less wrong, and a way to check you haven't just memorized the answers.

## Step one: a number for "how wrong"

Start with a guess. Before {{< term "training" >}}training{{< /term >}}, the model's {{< term "weights" >}}weights{{< /term >}} are random, so its predictions are nonsense. Now compare them with the right answers and boil the difference down to one number.

That number is the {{< term "loss" >}}loss{{< /term >}}, which Google's course defines as ["a numerical metric that describes how wrong a model's predictions are."](https://developers.google.com/machine-learning/crash-course/linear-regression/loss) Zero means perfect. Bigger means worse.

For a line through some points, the usual loss is the average squared vertical gap between each point and the line. For a {{< term "llm" >}}large language model{{< /term >}}, it's [how surprised the model was](https://d2l.ai/chapter_recurrent-neural-networks/language-model.html) by each real next word. Once "how wrong" is one number, learning becomes a search: find the weights that make that number as small as possible.

## Step two: roll downhill

Picture every possible setting of the weights as a landscape, with the loss as the height. You're somewhere on a hillside in fog, and you want to reach the lowest valley. You can't see it, but you can feel which way the ground slopes under your feet. So you take a small step downhill, feel again, and repeat.

That's {{< term "gradient-descent" >}}gradient descent{{< /term >}}, and it's old: it's usually credited to [Augustin-Louis Cauchy in 1847](https://ems.press/content/book-chapter-files/27368?nt=1). The "feel the slope" part, for millions of weights at once, is {{< term "backpropagation" >}}backpropagation{{< /term >}}, popularized in [a 1986 Nature paper](https://www.nature.com/articles/323533a0). Try it with the simplest model there is, a straight line with two weights:

{{< ml-descent >}}

The {{< term "learning-rate" >}}learning rate{{< /term >}} is the size of each step. Google's course describes both ways it fails: too low and the model ["can take a long time to converge"](https://developers.google.com/machine-learning/crash-course/linear-regression/hyperparameters), too high and it ["bounces around"](https://developers.google.com/machine-learning/crash-course/linear-regression/hyperparameters) the bottom instead of settling. Choosing it is one of the fiddliest parts of training real models.

## The same game, at scale

A {{< term "llm" >}}large language model{{< /term >}} plays exactly this game, with billions of weights instead of two. Real training doesn't compute the loss on all the data for every step, which would be far too slow. It takes [a small random batch](https://cs231n.github.io/optimization-1/), steps, and takes another: {{< term "stochastic-gradient-descent" >}}stochastic gradient descent{{< /term >}}. One full pass through the data is an {{< term "epoch" >}}epoch{{< /term >}}.

The numbers get large, but the ideas don't change. Meta trained Llama 3 405B with a refined version of gradient descent called AdamW, over [1.2 million steps](https://arxiv.org/abs/2407.21783) and 15.6 trillion {{< term "token" >}}tokens{{< /term >}}, with a carefully scheduled learning rate that warms up and then slowly shrinks. Every one of those steps was: measure the loss, feel the slope, step downhill.

## Step three: don't memorize the practice test

The trap is that a flexible enough model can drive the loss on its training examples almost to zero by memorizing them, noise and all. That's {{< term "overfitting" >}}overfitting{{< /term >}}: a model that ["matches (memorizes) the training set so closely that the model fails to make correct predictions on new data"](https://developers.google.com/machine-learning/crash-course/overfitting/overfitting).

The defence is to hold data back. Train on one set, and score the model on a {{< term "test-set" >}}test set{{< /term >}} it never trained on. The classic handwritten-digit dataset, MNIST, ships that way: [60,000 training images and 10,000 test images](https://keras.io/api/datasets/mnist/). The test score is the honest measure of {{< term "generalization" >}}generalization{{< /term >}}: how the model does on data it has never seen.

In practice there's often [a third slice](https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets), a {{< term "validation-set" >}}validation set{{< /term >}}, for choosing settings like the learning rate along the way, so the test set stays untouched until the very end. Watch the two scores part ways:

{{< ml-overfit >}}

One modern wrinkle: very large {{< term "neural-network" >}}neural networks{{< /term >}} don't always follow this textbook curve. Researchers found that past a certain size, test error can [fall again after rising](https://arxiv.org/abs/1912.02292), called "double descent". The rule of checking on held-out data holds either way.

## Why models need retraining

All this explains something from the [first post](/articles/what-is-ml-infrastructure/): why models go stale. Training finds weights that work for the data it saw. Google's course notes that good generalization assumes the training examples are ["statistically similar"](https://developers.google.com/machine-learning/crash-course/overfitting/overfitting) to real-world data. When the world {{< term "drift" >}}drifts{{< /term >}} away from the training data, that assumption breaks, and the fix is to play the game again on newer data.

## So how does a model learn?

By being wrong in a measurable way, and stepping toward less wrong, over and over. Score the guesses with a loss, follow the slope downhill with gradient descent, keep the steps the right size, and check against data the model has never seen so it learns the pattern instead of the answers. It's the same game whether the model has two weights or a trillion.

## References & further reading

Every claim above traces back to one of these, in the order the article reaches them.

{{< ml-references >}}
