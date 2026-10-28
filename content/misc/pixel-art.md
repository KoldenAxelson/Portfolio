---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The page
# for pixel art and stylized rendering: shaders, lighting, foliage, sprites.
# New videos on any of that fold in here. /projects/verdant is the house
# reference for the look.
#
# youtube : the foliage video, as the flag. Its presence marks the card at
#           /misc/ (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# Widgets are shortcodes in layouts/shortcodes/pixel-art/, styled by
# css/pages/pixel-art/pixel-art.css on top of the shared video-notes box, with
# behaviour lazy-loaded from static/js/pixel-art/.
# ─────────────────────────────────────────────────────────────────────────────
title: "Pixel Art"
description: "Notes on stylized 3D pixel art: billboarded grass and trees, flat and cel-shaded lighting, rim light, and wind driven by a shared noise texture, from a Godot and Blender foliage tutorial, with live demos of the shading and the wind."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Low resolution, high intent."
blurb: "Stylized 3D pixel-art foliage: billboarded grass and trees, cel shading, rim light, and wind from a scrolling noise texture, with live demos."
icon: "photo"
group: "make"
prose: true
youtube: "https://youtu.be/iPbYzFWECz4"
---

I already have one stylized grass scene. [Verdant](/projects/verdant) is an
island of instanced, billboarded grass with banded lighting, written from
scratch in Odin and WebGL2. So when a tutorial on 3D pixel-art foliage came
along, I watched it the way you'd watch someone else cook your favorite dish:
for the tricks I hadn't thought of. These are my notes on it, organized by
idea instead of by click.

The tutorial uses Godot 4.5 and Blender 4.5. The engine details matter less
than the ideas, which carry over to any shader.

## 1 · Grass is a card that lies about its normals

Each grass clump is a single flat plane, turned to face the camera on the
vertical axis only (a Y billboard). Godot's standard material can already do
that, and the tutorial's shortcut is to convert that material to a shader and
copy out the billboard code it generates.

The clever part is the normals. A card's normals point sideways, so it lights
differently from the ground it stands on. The tutorial copies the normals of a
flat, upward-facing plane onto the grass in Blender, so grass and ground light
identically. The ground has to use the same lighting math and the same color
too, or the seam shows.

The rest is about the look and the cost:

- Alpha scissor instead of blending, so the grass renders as opaque, which is
  much cheaper.
- Specular at zero, for flat pixel-art lighting.
- Roughness at zero too, because the scene's outline pass uses roughness as a
  mask and grass shouldn't get outlines.
- Origin at the base of the blade, so instancing tools plant it correctly.

An optional touch I like: make each grass card take its shadow all at once
instead of per pixel, by lighting it from the object's position. Shadows then
fall on whole clumps, which reads much more like pixel art.

## 2 · Trees are spheres made of billboards

The trunk is a cylinder with a deliberately plain texture. At low resolution,
detailed textures flicker as the camera moves, so simple wins. Its lighting is
cel-shaded: compute the usual diffuse value, then snap it to a few bands by
multiplying by the number of steps, rounding up, and dividing back.

The canopy is a sphere roughened with a cloud-noise displacement and remeshed
for even faces. Every face is then UV-mapped to cover the whole texture, which
is what lets the shader turn each face into its own small billboard: remap the
face's UVs from 0…1 to −1…1, scale them by a leaf size, turn them toward the
camera, and add them to the vertex. A rim light (one minus the angle between
surface and view, times the light, stepped and squared) gives the lit edge a
glow.

{{< pixel-art/cel >}}

The leaves borrow the grass's shadow trick with a twist. They're all one mesh,
so there's no per-leaf pivot; instead the shader remembers each vertex's
position before the billboard moves it and lights from there, so shadows follow
the tree's real shape.

## 3 · Wind is one noise texture, shared

All the movement comes from a single seamless noise texture and a handful of
shader globals (direction, scale, speed, strength) that every vegetation shader
reads. Change one value and the grass and the trees respond together.

{{< pixel-art/wind >}}

Each blade samples the noise at its position in the world, so gusts roll across
the field instead of every blade moving in lockstep. The value gets remapped to
−1…1 so blades bend both ways, and it's masked by height so the roots stay
put. Thin cards bend sideways relative to the camera, so they don't vanish
edge-on when the wind blows toward you.

Leaves can't rotate without pivots, so they fake it: push a leaf's top and
bottom in opposite directions, and its two sides likewise, and a small move
reads as a turn. It has to happen before the billboard step. The last fix is
for flickering shadows under moving leaves: hide the animated canopy from the
shadow pass and add a still, invisible copy that only casts shadows.

## What I'd take back to Verdant

- Shadows per clump instead of per pixel, for a flatter, more deliberate look.
- One shared noise field and a few global wind values that every plant reads.
- The canopy-of-billboards trick, for trees that match the grass.
- A still shadow caster under anything that sways.

## Source

One video, watched in October 2026. Everything above is my synthesis of the
tutorial; the settings named (Godot 4.5, Blender 4.5, a noise frequency of
0.0185) are its own. The narrator isn't named in the transcript, and the leaf
billboard technique is credited to another creator whose name the captions
garble, so I've left both out. The grass instancing in its village scene uses
the Spatial Gardener plugin.

- [Stylized 3D pixel-art grass and trees](https://youtu.be/iPbYzFWECz4): billboarded grass and trees, cel and rim lighting, global noise-driven wind, the shadow-flicker fix.
