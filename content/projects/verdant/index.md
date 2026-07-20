---
title: 'Verdant'
tier: 1
summary: "A stylized-grass diorama for the browser — an island of instanced, wind-swept grass in an open sea under a four-minute day/night cycle. Written from scratch in Odin, compiled to WebAssembly, and rendered with WebGL2: no engine, no emscripten. Fireflies, Gerstner-wave water, half-res bloom, and a controllable pixel-art character."
tags: ['graphics', 'odin', 'wasm', 'webgl', 'shaders']
types: ['game', 'web']
stack: ['Odin', 'WebAssembly', 'WebGL2', 'GLSL']
role: 'Solo build'
year: '2026'
status: 'shipped'
featured: false
layout: 'verdant'
container: 'wide'
# Full page load (not an hx-boost AJAX swap) so the page's <head> wasm runtime
# (odin.js) and loader actually execute — same reason /spinmasters is boost:false.
boost: false
thoughts:
  - "The renderer is all hand-written GLSL — instanced billboarded grass, toon/banded lighting, and a separable-blur bloom pass — blitted through WebGL2 with no engine underneath."
  - "Odin whole-program-compiles to js_wasm32, so splitting the scene into grass/water/fireflies/character packages costs nothing at runtime and keeps each system honest."
  - "The water is the part I keep staring at: Gerstner waves, Fresnel toward the sky, toon specular, and shoreline foam riding a distance-to-coast field."
---
