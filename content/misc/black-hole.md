---
# ── Page front matter ────────────────────────────────────────────────────────
# DRAFT. The black-hole half of Dwarfstar's renderer (dwarfstar.online/play),
# rebuilt in WebGPU with its bugs fixed. The Cool Sites card
# (static/js/cool-sites/dwarfstar.js) is a one-preset cut of the same lens.
#
# The stage is layouts/shortcodes/black-hole/sim.html; its assets ship from
# layouts/misc/single.html via partials/black-hole/assets.html. The renderer is
# assets/scripts/pages/black-hole/: presets.ts holds the four holes, shaders.ts
# the WGSL, sim.ts the pipeline and controls.
# prose : Tailwind Typography. The widget root carries `not-prose`.
# ─────────────────────────────────────────────────────────────────────────────
title: "Black Hole"
description: "A ray-traced Kerr black hole in the browser: four presets from Gargantua to an X-ray binary, the disk lensed over its own shadow, in visible light, UV or soft X-ray. A WebGPU rebuild of Dwarfstar's renderer with its bugs fixed."
blurb: "A spinning black hole, ray-traced live in WebGPU: the disk lensed over its own shadow."
icon: "sparkles"
container: "wide"
prose: true
draft: true
---

A spinning black hole with its accretion disk, ray-traced live. Drag to tilt it, scroll to zoom.

{{< black-hole/sim >}}

The shadow is flat on one side on purpose. A hole spinning this fast drags space around with it, so light skimming past on the side that turns toward you gets closer before it's caught, and the shadow pulls in there and bulges on the other side. The frame is centred on the shadow; the hole itself sits about 2 M off to the left. Switch off *Spin-accurate* to see it the way the original page drew it: round and centred, as if the hole weren't spinning.

## Where this came from

[Dwarfstar](https://dwarfstar.online/)'s landing page hides a properly physical renderer: Kerr shadows from Bardeen's equations, photon orbits in closed form, a disk with a real vertical structure and an Eddington atmosphere. It also re-solves every light ray on every frame and has a pile of bugs. This is its black-hole half, ported to WebGPU and fixed.

## What I fixed

- **The Doppler boost was on the wrong side.** The photon's angular momentum had its sign flipped, so the receding side of the disk lit up instead of the approaching one (the side where the shadow is flattened).
- **The shadow and the disk disagreed about spin.** The disk was traced as if the hole didn't spin, so its dark middle was a neat centred circle while the actual shadow outline the page computed was lopsided: black where light should get through on one side, disk painted inside the shadow on the other. The rays are now shifted so the disk and the shadow agree.
- **Half the shadow could come out mirrored.** `atan2(-0, x)` returns +π on some GPUs instead of −π, which flips the bisection for the lower half of the shadow edge. A float32 edge case also left a one-pixel line along one axis.
- **The disk's speed depended on your monitor.** Time stepped per frame with a cap, so the disk ran 2.4× faster at 144 Hz, the time menu did nothing above 10 min/s, and the inner disk strobed. It now runs on the wall clock at speeds picked so the inner orbit reads as motion.
- **The disk started to judder after an hour.** The clock lived in float32 and grew forever. Each ring's phase is now reduced in double precision first.
- **Stepped rings in the lensed stars.** The bending angle came from a table read without interpolation, and the far-field formula was 1.9 % short at 24 M, leaving a seam. Both are closed form now.
- **Opening a black-hole link directly left the camera angle undefined** (NaN), because the setup it depended on only ran for stars.
- **Switching presets leaked settings** from one hole into the next. Each preset is now a complete set of values.
- **Bloom barely did anything.** It thresholded the tone-mapped image, which never gets near white, so only bleached pixels glowed. It now blooms from the linear light.

## What got faster

- The lens (where every ray lands, the shadow, the bent starfield) depends only on the view, so it's traced once per tilt, zoom or resize. A frame just moves the gas and re-lights the crossings: a few texture reads a pixel instead of a 64-step march.
- Exposure metering moved onto the GPU. The original stalled it with a `readPixels` every 20 frames.
- The blackbody and shadow tables are built once, not re-rendered through the full shader every frame.
- Paused and untouched, it draws nothing at all.
- Left out: the geodesic-map lens and simulated-gas data, which the original only used in its own comparison harness.
