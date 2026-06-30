---
title: 'SpinMasters'
tier: 1
summary: "A spinning-top battle arena written from scratch in Rust — physics, AI, and a software rasteriser, no game engine. The same core runs natively (wgpu) and in the browser, compiled to WebAssembly and blitting its CPU framebuffer straight onto a 2D canvas."
tags: ['game', 'rust', 'wasm', 'webgpu', 'physics']
types: ['game', 'web']
stack: ['Rust', 'WebAssembly', 'wgpu', 'winit', 'Canvas 2D', 'Alpine.js']
role: 'Solo build'
year: '2026'
status: 'shipped'
featured: false
layout: 'spinmasters'
container: 'wide'
# Full page load (not an hx-boost AJAX swap) so the page's <head> Alpine + the
# wasm runtime actually execute — same reason /agar-clone is boost:false.
boost: false
thoughts:
  - "The renderer is a hand-written software rasteriser into a u32 pixel buffer — the GPU (or the browser canvas) only ever blits the finished frame."
  - "Because gameplay never touches the GPU, the web port skipped WebGPU entirely: compile the core to wasm, hand JS the pixel buffer, done."
  - "Tops 'feel like tops' via low drag plus an orbital drive — they glide and circle, then spiral in as spin bleeds off."
---
