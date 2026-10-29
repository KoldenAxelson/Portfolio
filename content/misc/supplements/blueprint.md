---
# ── Page front matter ────────────────────────────────────────────────────────
# One stack on /misc/supplements/. Everything it shows comes from its entry in
# data/supplements/stacks.yaml (`stack` below names it); its sources are
# data/ml/references/supplements-blueprint.yaml, cited there by number. Recheck
# the sources when you bump `updated`.
# ─────────────────────────────────────────────────────────────────────────────
title: "The Blueprint Stack"
description: "Bryan Johnson's daily Blueprint supplements, with his doses and what independent research says about the claims made for them."
lead: "Bryan Johnson's daily supplements"
stack: "blueprint"
weight: 2
updated: 2026-10-28
prose: true
sections:
  - { id: "stack",   label: "The stack",  icon: "beaker" }
  - { id: "claims",  label: "The claims", icon: "magnifying-glass" }
  - { id: "safety",  label: "Safety",     icon: "shield-check" }
  - { id: "sources", label: "References", icon: "link" }
toolsIcon: "beaker"
---

I'm not a doctor and none of this is advice: talk to yours before you take any
of it, especially if you take other medication.

## The stack {#stack}

{{< supplements/stack >}}

## The claims {#claims}

{{< supplements/claims >}}

## Safety {#safety}

{{< supplements/safety >}}

## References {#sources}

{{< ml/references set="supplements-blueprint" >}}
