---
title: 'SpaceScape'
tier: 1
summary: "A RuneScape-style skilling loop in a wireframe solar system: mine asteroids, extract biomass from comets, bank at ports, craft better lasers, race, thieve, and talk your way through quests. Odin on raylib 6, compiled to WebAssembly. Every visual is code: low-poly, tron-lit, no art assets."
tags: ['game', 'odin', 'raylib', 'wasm', 'shaders']
types: ['game', 'web']
stack: ['Odin', 'raylib 6', 'WebAssembly', 'GLSL']
role: 'Solo build'
year: '2026'
status: 'in progress'
featured: false
layout: 'spacescape'
container: 'wide'
# Card thumbnail + click-to-play poster. Add assets/covers/spacescape.webp and
# static/covers/spacescape.webp (a 1280x720 screenshot) — see func/cover.html.
cover: '/covers/spacescape.webp'
thoughts:
  - "Flight runs on a fixed 60 Hz simulation step with interpolated rendering, so the ship feels identical at 30 or 240 fps and a recorded input stream replays exactly."
  - "Systems never call each other. They publish typed events onto a bus that is drained once per frame, so ordering is deterministic and every interaction shows up in one log."
  - "Two keys carry the whole grammar: SHIFT scans for whatever is ahead — a rock, a moon, a freighter, a race host — and SPACE does the one thing that target allows. No target, and SPACE is the boost."
  - "There is no art pipeline: the grid is a distance-field shader, the hull is a handful of lines, and every ore tier is a color. The whole game is a few hundred kilobytes of wasm."
  - "The save is a versioned blob in localStorage; the desktop build writes the same bytes to disk. One serializer, two backends."
---
