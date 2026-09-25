---
# ── Chapter front matter ──────────────────────────────────────────────
# title       : page heading, banner and card label
# lead        : one-line summary under the banner (falls back to description)
# description : SEO/meta, and the card blurb fallback
# weight      : chapter order (1, 2, 3, …)
# hidden      : true keeps a work-in-progress chapter off the list
# ──────────────────────────────────────────────────────────────────────
title: "Chapter 1: Python for People Who Already Code"
lead: "The language features ML code leans on, for readers who already program in another language."
description: "Chapter 1 of Python for ML: lists, dicts and sets, comprehensions, f-strings, unpacking, dataclasses, with blocks and generators, and the virtual environment every later chapter runs in."
weight: 1
---

Loops, functions and types work in Python much as they do in any language you already know. ML code adds a handful of Python habits it uses on every page, plus one piece of setup: a {{< term "virtual-environment" >}}virtual environment{{< /term >}} per project. This chapter covers both, fast, by contrast with other languages.

A {{< term "list" >}}list{{< /term >}} is like a Go slice or a JavaScript array: ordered, growable, repeats allowed. A {{< term "dict" >}}dict{{< /term >}} maps keys to values, like a map or hash table elsewhere, and a {{< term "set" >}}set{{< /term >}} keeps each value once. A {{< term "comprehension" >}}comprehension{{< /term >}} builds any of the three in one expression, with the loop, the filter and the append folded together.

{{< py-example "ch01/containers" >}}

Here is the chapter in one small job: reading a CSV of training runs by hand. {{< term "pathlib-path" >}}pathlib.Path{{< /term >}} names the file, {{< term "unpacking" >}}unpacking{{< /term >}} splits the header from the other lines, and a {{< term "comprehension" >}}comprehension{{< /term >}} turns each line into a {{< term "dict" >}}dict{{< /term >}}.

{{< code-stepper "ch01/read-csv" >}}

Every value came back a string, which is why step six joins two losses as text instead of adding them, with no error. pandas, in Chapter 4, reads a file like it into typed columns in one call.

An {{< term "f-string" >}}f-string{{< /term >}} puts expressions inside a string, with an optional format after a colon: `{loss:.2f}` prints two decimals. In a function's parameters, {{< term "args-kwargs" >}}*args{{< /term >}} collects extra positional arguments into a tuple and {{< term "args-kwargs" >}}**kwargs{{< /term >}} collects extra keyword arguments into a {{< term "dict" >}}dict{{< /term >}}. At a call the stars work the other way round, so `train(**config)` feeds a config {{< term "dict" >}}dict{{< /term >}} straight into a function.

{{< py-example "ch01/functions" >}}

A {{< term "dataclass" >}}dataclass{{< /term >}} is a struct, as in Go or C, with its constructor, printing and equality written for you. Its fields carry {{< term "type-hints" >}}type hints{{< /term >}}, and here Python parts ways with statically typed languages: no compiler checks them, and Python doesn't either when the code runs. This is the easy one to get wrong. `Run('b', '0.05')` builds without complaint, and the string shows up later: as a `TypeError` if you're lucky, or, as below, as a wrong answer with no error.

{{< py-example "ch01/dataclass" >}}

A {{< term "context-manager" >}}context manager{{< /term >}} works like Go's `defer` or Java's try-with-resources, in block form: `with path.open() as f:` closes the file when the block ends, even if it raises. A {{< term "generator" >}}generator{{< /term >}} makes its values one at a time, only when asked, so a file bigger than memory can be read line by line. Once it has run out it stays empty, and a second loop over it quietly gets nothing.

{{< py-example "ch01/lazy" >}}

Last, the setup every later chapter runs in. A {{< term "virtual-environment" >}}virtual environment{{< /term >}} is a folder of packages for one project, like `node_modules` with its own `python`. {{< term "pip" >}}pip{{< /term >}} installs the pinned versions into it. {{< term "uv" >}}uv{{< /term >}}, from Astral, can do the same job, and its docs describe it as extremely fast.

```bash
python3 -m venv ~/.venvs/python-for-ml     # or: uv venv ~/.venvs/python-for-ml
source ~/.venvs/python-for-ml/bin/activate
pip install -r requirements.txt            # or: uv pip install -r requirements.txt
```

You will also meet the {{< term "jupyter-notebook" >}}Jupyter notebook{{< /term >}}, a document of code cells you run one at a time. This course uses plain `.py` files and `pytest` instead, because they diff cleanly and run anywhere.

The habit to keep: convert what comes from a file or a caller to the type you mean before you use it. {{< term "type-hints" >}}Type hints{{< /term >}} only say what you meant; `float()` and `int()` make it so.

## Homework

The packet first checks that your {{< term "virtual-environment" >}}virtual environment{{< /term >}} has Python 3.12 or newer and every pinned version. Then you read a CSV of training runs into {{< term "list" >}}lists{{< /term >}}, {{< term "dict" >}}dicts{{< /term >}} and {{< term "set" >}}sets{{< /term >}} with {{< term "comprehension" >}}comprehensions{{< /term >}}, fill in a {{< term "dataclass" >}}dataclass{{< /term >}} and an {{< term "f-string" >}}f-string{{< /term >}}, and finish with a {{< term "generator" >}}generator{{< /term >}}, {{< term "unpacking" >}}unpacking{{< /term >}}, {{< term "args-kwargs" >}}*args{{< /term >}} and {{< term "args-kwargs" >}}**kwargs{{< /term >}}.

{{< workbook "ch01" >}}
