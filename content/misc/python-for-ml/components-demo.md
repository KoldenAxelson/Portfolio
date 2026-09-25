---
title: "Components demo"
lead: "A test page for the course's code components. Not part of the course."
description: "Test page for the Python for ML code example and code stepper components."
noindex: true
# Built so the components can be checked in a browser, but never listed: not on
# the course index, not in the chapter menu.
build:
  list: never
---

An {{< term "ndarray" >}}ndarray{{< /term >}} has a {{< term "shape" >}}shape{{< /term >}} and a {{< term "dtype" >}}dtype{{< /term >}}.

{{< py-example "ch00/basics" >}}

{{< code-stepper "ch00/array-tour" >}}

A plain fenced block, highlighted by Hugo:

```python
import numpy as np
x = np.linspace(0, 1, 5)  # five points
print(f"{x.mean():.2f}")
```

Every term in the course glossary, to check each definition window and figure:

{{< all-terms.inline >}}
<p class="flex flex-wrap gap-x-3 gap-y-1">
{{- range $key, $entry := site.Data.glossary.python }}
{{ partial "func/term-button.html" (dict "key" $key "set" "python" "label" $entry.term) }}
{{- end }}
</p>
{{< /all-terms.inline >}}
