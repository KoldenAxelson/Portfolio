---
title: "Cool Web Dev Sites"
description: "A small showcase of web development sites worth studying — sharp writing, beautiful craft, and interfaces that teach by example."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "A small showcase of web dev sites worth studying — sharp writing and beautiful craft."
blurb: "A small showcase of web dev sites worth studying — craft, writing, and interfaces that teach by example."
icon: "globe"
container: "wide"
---

<p class="wds-intro">A few web dev sites I keep coming back to — for the writing, the craft, or just to see how they built the thing.</p>

<style>
  .wds-root{margin-top:1.5rem;}
  .wds-root a{text-decoration:none !important;color:inherit;}
  .wds-grid{display:grid;gap:1rem;}
  @media (min-width:768px){.wds-grid{grid-template-columns:1fr 1fr;}}
  .wds-card{position:relative;border:1px solid rgb(var(--c-border));border-radius:.9rem;overflow:hidden;background:rgb(var(--c-bg));transition:border-color .2s ease,transform .12s ease;display:flex;flex-direction:column;}
  .wds-card:hover{border-color:rgb(var(--c-accent) / .5);}
  .wds-card:active{transform:scale(.985);}
  .wds-feature{grid-column:1 / -1;}
  @media (min-width:768px){.wds-feature{flex-direction:row;}.wds-feature .wds-preview{width:44%;min-height:250px;}.wds-feature .wds-body{flex:1;}}
  .wds-preview{position:relative;min-height:200px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-bottom:1px solid rgb(var(--c-border) / .6);}
  @media (min-width:768px){.wds-feature .wds-preview{border-bottom:none;border-right:1px solid rgb(var(--c-border) / .6);}}
  .wds-body{padding:1.1rem 1.25rem 1.25rem;display:flex;flex-direction:column;gap:.4rem;justify-content:center;}
  .wds-title{font-weight:600;font-size:1.02rem;color:rgb(var(--c-fg));line-height:1.3;transition:color .15s ease;}
  .wds-card:hover .wds-title{color:rgb(var(--c-accent));}
  .wds-arrow{display:inline-block;transition:transform .15s ease;will-change:transform;}
  .wds-card:hover .wds-arrow{transform:translate(2px,-2px);}
  .wds-desc{font-size:.86rem;color:rgb(var(--c-muted));line-height:1.55;margin:0;max-width:65ch;}
  .wds-domain{font-family:var(--font-mono);font-size:.7rem;color:rgb(var(--c-muted));letter-spacing:.02em;margin-top:.15rem;}
  .wds-cover{position:absolute;inset:0;z-index:3;}
  .wds-logowrap{background:radial-gradient(120% 120% at 50% 28%,rgb(var(--c-border) / .35),rgb(var(--c-bg)));}
  .wds-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;}
  .wds-src{display:none;}
  .wds-cloud{background:linear-gradient(#cbd6e6,#4b6791);}
  /* The buffer is a fraction of the element's size and the browser blows it
     back up. Nearest-neighbour is the whole point — smooth it and the dither
     pattern turns to mush. */
  .wds-cloudcanvas{position:absolute;inset:0;width:100%;height:100%;display:block;
    image-rendering:-moz-crisp-edges;image-rendering:crisp-edges;image-rendering:pixelated;}
  .wds-chip{position:absolute;left:.6rem;bottom:.5rem;z-index:1;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.08em;color:#fff;background:rgba(0,0,0,.38);padding:.28rem .55rem;border-radius:999px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
  .wds-plum{background:rgb(var(--c-border) / .12);}
  .wds-plumcanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  /* The gradient is the fallback: it's what shows if WebGL2 or float render
     targets aren't there, and the canvas paints over it otherwise. */
  .wds-smoke{background:linear-gradient(#10131a,#252b38);}
  .wds-smokecanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;}
  /* ASCII Object — a terminal panel. Glyphs are drawn, so the only thing the
     stylesheet owns is the ground they sit on. */
  .wds-ascii{background:#0a0d12;}
  .wds-asciicanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}

  /* Impeccable — one mock component, two states. Every property that moves is
     an anti-pattern the real tool checks for: gradient fill, bloom shadow,
     over-rounding, centred body copy, decorative emoji. The transition is the
     point, so it is slow enough to read. */
  .wds-imp{background:rgb(var(--c-border) / .14);padding:1.4rem;}
  .imp-mock{width:100%;max-width:19rem;padding:1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem;
    transition:background .6s ease,border-color .6s ease,border-radius .6s ease,box-shadow .6s ease,color .6s ease,text-align .6s ease;}
  .imp-h{margin:0;font-size:.95rem;line-height:1.25;}
  .imp-p{margin:0;font-size:.72rem;line-height:1.5;opacity:.85;}
  .imp-btn{align-self:flex-start;font-size:.7rem;padding:.35rem .8rem;transition:all .6s ease;}
  .imp-badge{font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;align-self:center;
    padding:.2rem .55rem;border-radius:999px;background:rgba(255,255,255,.25);
    transition:opacity .4s ease,max-height .6s ease;overflow:hidden;}
  .imp-after{display:none;}
  /* Slop */
  [data-state="slop"] .imp-mock{background:linear-gradient(135deg,#7c3aed,#db2777 55%,#f59e0b);
    border:0 solid transparent;border-radius:1.5rem;box-shadow:0 16px 34px -8px rgba(124,58,237,.65);color:#fff;text-align:center;}
  [data-state="slop"] .imp-btn{align-self:center;border-radius:999px;background:rgba(255,255,255,.92);color:#7c3aed;font-weight:700;box-shadow:0 6px 16px rgba(0,0,0,.25);}
  /* Polished */
  [data-state="clean"] .imp-mock{background:rgb(var(--c-bg));border:1px solid rgb(var(--c-border));
    border-radius:.5rem;box-shadow:none;color:rgb(var(--c-fg));text-align:left;}
  [data-state="clean"] .imp-badge{opacity:0;max-height:0;padding:0;}
  [data-state="clean"] .imp-before{display:none;}
  [data-state="clean"] .imp-after{display:inline;}
  [data-state="clean"] .imp-btn{border-radius:.3rem;background:transparent;border:1px solid rgb(var(--c-border));color:rgb(var(--c-fg));font-weight:500;box-shadow:none;}
  .imp-cmd{position:absolute;top:.55rem;right:.6rem;font-family:var(--font-mono);font-size:.6rem;
    color:rgb(var(--c-accent));opacity:0;transition:opacity .3s ease;}
  .imp-cmd.is-on{opacity:1;}

  /* Taste Skill — the same words under three design directions. Nothing about
     the content changes between them; only type, spacing and colour do, which
     is the argument the site is making. */
  .wds-taste{padding:1.4rem;transition:background .5s ease;}
  .taste-card{width:100%;max-width:17rem;padding:1.05rem 1.15rem;display:flex;flex-direction:column;gap:.5rem;
    transition:background .5s ease,border .5s ease,border-radius .5s ease,box-shadow .5s ease;}
  .taste-kicker,.taste-meta{font-family:var(--font-mono);font-size:.58rem;transition:all .5s ease;}
  .taste-word{margin:0;transition:all .5s ease;}
  .taste-dir{position:absolute;top:.55rem;right:.7rem;font-family:var(--font-mono);font-size:.6rem;
    letter-spacing:.1em;text-transform:uppercase;opacity:.75;transition:color .5s ease;}
  [data-dir="brutalist"]{background:#111;}
  [data-dir="brutalist"] .taste-card{background:#111;border:3px solid #fff;border-radius:0;}
  [data-dir="brutalist"] .taste-word{font-size:1.5rem;font-weight:800;line-height:.95;letter-spacing:-.02em;text-transform:uppercase;color:#fff;}
  [data-dir="brutalist"] .taste-kicker,[data-dir="brutalist"] .taste-meta{color:#fff;letter-spacing:.18em;}
  [data-dir="minimal"]{background:#fbfbf9;}
  [data-dir="minimal"] .taste-card{background:#fbfbf9;border:1px solid #e6e5e0;border-radius:.15rem;}
  [data-dir="minimal"] .taste-word{font-size:1.15rem;font-weight:300;line-height:1.5;letter-spacing:.04em;color:#1c1c1a;}
  [data-dir="minimal"] .taste-kicker,[data-dir="minimal"] .taste-meta{color:#9a998f;letter-spacing:.05em;}
  [data-dir="soft"]{background:#f4ece4;}
  [data-dir="soft"] .taste-card{background:#fffaf5;border:1px solid #e8d9c9;border-radius:1.15rem;box-shadow:0 6px 18px -10px rgba(120,80,50,.4);}
  [data-dir="soft"] .taste-word{font-size:1.25rem;font-weight:500;line-height:1.35;letter-spacing:0;color:#5a4636;}
  [data-dir="soft"] .taste-kicker,[data-dir="soft"] .taste-meta{color:#b09277;letter-spacing:.06em;}
  [data-dir="brutalist"] .taste-dir{color:#fff;}
  [data-dir="minimal"] .taste-dir{color:#9a998f;}
  [data-dir="soft"] .taste-dir{color:#b09277;}

  .wds-intro{max-width:58ch;}
  .wds-cover:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:2px;border-radius:.9rem;}
  .wds-title:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:2px;border-radius:.3rem;}
  @keyframes wdsIn{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion:no-preference){
    .wds-card{animation:wdsIn .3s cubic-bezier(.16,1,.3,1) backwards;}
    .wds-card:nth-child(1){animation-delay:.02s;}
    .wds-card:nth-child(2){animation-delay:.10s;}
    .wds-card:nth-child(3){animation-delay:.18s;}
    .wds-card:nth-child(4){animation-delay:.26s;}
    .wds-card:nth-child(5){animation-delay:.34s;}
    .wds-card:nth-child(6){animation-delay:.42s;}
    .wds-card:nth-child(7){animation-delay:.50s;}
  }
</style>

<div class="wds-root">
<div class="wds-grid">
<article class="wds-card wds-feature">
<div class="wds-preview wds-logowrap"><canvas class="wds-canvas" id="wdsCanvas"></canvas><svg class="wds-src" id="wdsSrc" viewBox="0 0 2000 2000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wdsGrad" x1="-146.12" y1="406.6" x2="1328.05" y2="1196.71" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eee393"/><stop offset="1" stop-color="#94672b"/></linearGradient></defs><path fill="#037737" d="m382.16,365.18c-47.3,5.1-87.63,27.17-116.64,63.84-28.58,36.12-44.21,80.02-47.8,134.2-2.26,34.17-2.75,68.58-3.23,102-.17,12.35-.35,24.7-.62,37.05l-.32,16.26c-.81,42.37-1.57,82.39-8.28,121.95-6.52,38.38-29.41,63.72-64.44,71.36-5.01,1.1-10.84,1.78-17,2.52-3.44.41-6.9.82-10.36,1.3l-30.19,4.21v163.82l36.37,3.99c3.2.35,6.19.66,9.15,1.02,36.74,4.3,58.43,21.34,70.34,55.25,6.98,19.88,9.12,41.48,10.18,67.82,1.06,26.15,1.65,52.92,2.21,78.95.37,17.06.75,34.13,1.25,51.19.16,5.39.3,10.78.44,16.17,1.11,41.95,2.26,85.34,10.94,128.91,15.5,77.81,71.59,134.51,146.36,147.96,19.43,3.49,38.43,4.28,56.86,5.04,5.67.23,11.33.47,16.96.78,4.52.26,9.24.37,14.85.37,3.52,0,6.98-.05,10.4-.1h.7c3.44-.06,6.89-.11,10.38-.11h35.03v-165.91l-32.64-2.24c-6.58-.45-13.11-.83-19.82-1.22-14.07-.83-27.36-1.61-40.39-3.07-19.68-2.23-22.09-8.74-23.53-12.64-3.07-8.29-7.19-20.53-7.53-31.01-1.32-40.29-1.46-81.56-1.6-121.49l-.08-21.31c-.24-53.8-3.94-97.83-11.64-138.56-11.44-60.48-40.31-108.38-85.86-142.53,40.3-29.81,67.52-70.36,80.98-120.67,11.62-43.41,13.93-86.41,14.65-119.02.6-27.4.88-55.79,1.14-80.84.23-22.32.46-44.65.87-66.97.34-18.48,1.49-40.17,7.46-60.82,2.59-8.92,6.34-12.89,14.36-15.19,9.25-2.65,17.88-4.38,25.64-5.14,9.71-.95,19.66-1.27,30.19-1.61,4.81-.16,9.64-.31,14.48-.53l33.47-1.49v-162.85s-110.71-3.13-133.69-.65Z"/><path fill="#037737" d="m1880.83,912.05c-3.18-.36-6.09-.68-9-.97h0c-39.37-3.79-65.23-25.99-74.77-64.2-7.55-30.26-8.52-62.87-9.46-94.41-.58-19.49-.92-39.45-1.25-58.74v-.78c-.5-29-1.01-58.99-2.36-88.68-1.15-25.42-3.34-58.89-10.05-92.43-13.59-67.9-54.4-116.3-118.02-139.97-29.14-10.83-57.71-11.78-85.34-12.7-12.56-.42-24.87-.32-36.77-.21-5.22.05-10.45.09-15.71.09h-35.03v165.65l32.62,2.24c6.71.47,13.37.86,20.13,1.26,14.28.85,27.77,1.65,41.05,3.1,20.2,2.2,23.95,10.41,26.26,19.37,1.87,7.23,3.81,15.59,4.04,22.84,1.03,32.69,1.26,66.17,1.35,94.61l.03,18.32c.03,49.35.06,100.38,8.27,151.56,4.73,29.46,12.13,63.84,31.24,95.53,14.93,24.76,34.34,45.94,59.15,64.51-39.11,29.48-66.24,69.89-80.69,120.27-9.38,32.68-14.08,68.02-14.76,111.22-.4,25.01-.65,50.02-.9,75.03l-.02,1.98c-.27,26.41-.54,52.81-.99,79.22-.31,18.75-1.46,40.71-7.55,61.37-3.2,10.84-8.4,13.2-13.45,14.68-9.71,2.85-19.07,4.76-27.83,5.66-9.45.98-19.31,1.28-30.03,1.61-4.78.15-9.57.29-14.36.5l-33.5,1.47v170.13l36.63-1.67c9.43-.43,18.81-.69,28.43-.95,21.57-.6,43.88-1.21,66.25-3.87,59.25-7.01,106.16-37.18,135.64-87.26,18.99-32.27,29.58-68.81,32.37-111.69,2.22-34.28,2.77-68.8,3.3-102.19.12-7.91.25-15.82.4-23.72.13-7.12.24-14.24.35-21.37.67-44.63,1.3-86.78,8.28-128.54,6.47-38.69,29.49-64.27,64.81-72.01,5.05-1.11,10.84-1.81,16.98-2.55,3.37-.42,6.74-.83,10.09-1.3l30.1-4.28v-163.75l-35.92-3.93Z"/><polygon fill="url(#wdsGrad)" points="1456.53 748.15 1326.54 673.1 1326.54 762.57 1243.43 762.57 1103.93 762.57 1024.46 1172.86 926.51 768.41 778.79 768.41 680.84 1172.86 608.95 768.41 462.03 768.41 595.53 1326.9 762.99 1326.9 853.04 953.26 942.31 1326.9 1109.77 1326.9 1213.19 890.22 1326.54 890.22 1326.54 973.28 1456.53 898.24 1586.51 823.19 1456.53 748.15"/></svg></div>
<div class="wds-body">
<a class="wds-title" href="https://emilkowal.ski/ui/agents-with-taste" rel="noopener">Emil Kowalski — Agents with Taste <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Design engineer behind Sonner and Vaul, on encoding your taste into skill files so agents animate better. His post has an interactive Linear logo; this is that effect wearing <em>my</em> logo. Move your cursor through it — the dots flee, then settle.</p>
<span class="wds-domain">emilkowal.ski</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://blog.maximeheckel.com" rel="noopener" aria-label="The Blog of Maxime Heckel"></a>
<div class="wds-preview wds-cloud"><canvas class="wds-cloudcanvas" id="wdsCloud"></canvas><span class="wds-chip">bayer dither · crt</span></div>
<div class="wds-body">
<a class="wds-title" href="https://blog.maximeheckel.com" rel="noopener">The Blog of Maxime Heckel <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Deep, interactive essays on shaders and real-time 3D, each with a playground. Two of them at once here: volumetric raymarched clouds, then his retro-shading pass — tiny buffer, six levels a channel, 4×4 Bayer dither, scanlines. The octahedron is an SDF, lit in four steps.</p>
<span class="wds-domain">blog.maximeheckel.com</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://antfu.me" rel="noopener" aria-label="Anthony Fu"></a>
<div class="wds-preview wds-plum"><canvas class="wds-plumcanvas" id="wdsPlum"></canvas><span class="wds-chip">generative · plum</span></div>
<div class="wds-body">
<a class="wds-title" href="https://antfu.me" rel="noopener">Anthony Fu <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Personal site of one of open source's most prolific design engineers — Vitest, Slidev, VueUse, UnoCSS, core team on Vue, Nuxt and Vite. The branches recreate the generative "plum" from his background: vines seeded at the edges, creeping inward and forking.</p>
<span class="wds-domain">antfu.me</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://www.cssscript.com/demo/smoke-fluid-motion/" rel="noopener" aria-label="Interactive Smoke/Fluid Motion Effect"></a>
<div class="wds-preview wds-smoke"><canvas class="wds-smokecanvas" id="wdsSmoke"></canvas><span class="wds-chip">webgl · navier–stokes</span></div>
<div class="wds-body">
<a class="wds-title" href="https://www.cssscript.com/demo/smoke-fluid-motion/" rel="noopener">Interactive Smoke/Fluid Motion <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">A WebGL fluid sim dressed as smoke — the demo that sent me off to build a Navier–Stokes solver for my <a href="/quotes/">quotes page</a>. Faking it never convinces: smoke reads through advection, not texture. That solver, shrunk to a card. Move your cursor through it.</p>
<span class="wds-domain">cssscript.com</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://canvasui.dev" rel="noopener" aria-label="Canvas UI"></a>
<div class="wds-preview wds-ascii"><canvas class="wds-asciicanvas" id="wdsAscii"></canvas><span class="wds-chip">ascii · lit 3d</span></div>
<div class="wds-body">
<a class="wds-title" href="https://canvasui.dev" rel="noopener">Canvas UI <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Thirty-odd creative components — real HTML drawn inside a canvas, WebGL running over it. The html-in-canvas half needs a Chrome flag; elsewhere, Safari included, it degrades to plain HTML plus the effects. Shown: <em>ASCII Object</em>. Mine is the cheap version, no library.</p>
<span class="wds-domain">canvasui.dev</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://impeccable.style" rel="noopener" aria-label="Impeccable"></a>
<div class="wds-preview wds-imp" id="wdsImp" data-state="slop"><div class="imp-mock"><span class="imp-badge">✨ Limited Time ✨</span><h4 class="imp-h"><span class="imp-before">Supercharge Your Workflow 🚀</span><span class="imp-after">Ship faster</span></h4><p class="imp-p"><span class="imp-before">Unlock the power of next-generation productivity, today!</span><span class="imp-after">Cut the build step. Deploy from the branch you are on.</span></p><span class="imp-btn"><span class="imp-before">Get Started Now →</span><span class="imp-after">Get started</span></span></div><span class="imp-cmd" id="wdsImpCmd">/polish</span><span class="wds-chip">before → after</span></div>
<div class="wds-body">
<a class="wds-title" href="https://impeccable.style" rel="noopener">Impeccable <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Paul Bakaus's design skill for coding agents — 23 commands, 58 anti-pattern checks, pointed at AI slop. The mock runs <code>/polish</code> both ways on a loop. Gradient fill, bloom shadow, over-rounding, centred copy, emoji, a shouting CTA: all on the list.</p>
<span class="wds-domain">impeccable.style</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://www.tasteskill.dev" rel="noopener" aria-label="Taste Skill"></a>
<div class="wds-preview wds-taste" id="wdsTaste" data-dir="brutalist"><div class="taste-card"><span class="taste-kicker">SKILL.md</span><p class="taste-word">Taste is a constraint.</p><span class="taste-meta">Aa · 01</span></div><span class="taste-dir" id="wdsTasteDir">brutalist</span><span class="wds-chip">design direction</span></div>
<div class="wds-body">
<a class="wds-title" href="https://www.tasteskill.dev" rel="noopener">Taste Skill <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Leon Lin's answer from the other end: <code>SKILL.md</code> files that hand an agent a design direction — brutalist, minimal, soft — before it writes a line, instead of auditing the mess after. The card cycles three. Words never change; type and colour do.</p>
<span class="wds-domain">tasteskill.dev</span>
</div>
</article>
</div>
</div>

<script>
  (function () {
    var canvas = document.getElementById("wdsCanvas");
    var src = document.getElementById("wdsSrc");
    if (!canvas || !src) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var dots = [];
    var mouse = { x: -9999, y: -9999 };
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var R = 64, STRENGTH = 1.5, SPRING = 0.05, FRICTION = 0.85, DOTR = 1.5;

    function buildDots(cb) {
      var S = 280, gap = 5;
      var svg = src.cloneNode(true);
      svg.setAttribute("width", S);
      svg.setAttribute("height", S);
      var xml = new XMLSerializer().serializeToString(svg);
      var img = new Image();
      img.onload = function () {
        var off = document.createElement("canvas");
        off.width = S; off.height = S;
        var octx = off.getContext("2d");
        octx.drawImage(img, 0, 0, S, S);
        var data;
        try { data = octx.getImageData(0, 0, S, S).data; }
        catch (e) { cb([]); return; }
        var pts = [];
        for (var y = 0; y < S; y += gap) {
          for (var x = 0; x < S; x += gap) {
            var i = (y * S + x) * 4;
            if (data[i + 3] > 128) {
              pts.push({ nx: x / S, ny: y / S, c: "rgb(" + data[i] + "," + data[i + 1] + "," + data[i + 2] + ")" });
            }
          }
        }
        cb(pts);
      };
      img.onerror = function () { cb([]); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      if (w < 2 || h < 2) { requestAnimationFrame(layout); return; }
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var scale = Math.min(w, h) * 0.88;
      var ox = (w - scale) / 2, oy = (h - scale) / 2;
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        d.hx = ox + d.nx * scale; d.hy = oy + d.ny * scale;
        if (d.x === undefined) { d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0; }
      }
    }

    function frame() {
      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        var dx = d.x - mouse.x, dy = d.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < R) {
          var f = (R - dist) / R * STRENGTH;
          d.vx += (dx / dist) * f; d.vy += (dy / dist) * f;
        }
        d.vx += (d.hx - d.x) * SPRING; d.vy += (d.hy - d.y) * SPRING;
        d.vx *= FRICTION; d.vy *= FRICTION;
        d.x += d.vx; d.y += d.vy;
        ctx.beginPath();
        ctx.arc(d.x, d.y, DOTR, 0, 6.2832);
        ctx.fillStyle = d.c;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    function staticDraw() {
      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        ctx.beginPath();
        ctx.arc(d.hx, d.hy, DOTR, 0, 6.2832);
        ctx.fillStyle = d.c;
        ctx.fill();
      }
    }

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      mouse.x = p.clientX - rect.left;
      mouse.y = p.clientY - rect.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }

    buildDots(function (pts) {
      dots = pts;
      layout();
      if (reduce || !dots.length) { staticDraw(); return; }
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      requestAnimationFrame(frame);
    });
    window.addEventListener("resize", layout);
  })();
</script>

<script>
  (function () {
    var canvas = document.getElementById("wdsCloud");
    if (!canvas) return;
    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var vsrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
    var fsrc = [
      "precision highp float;",
      "uniform vec2 uRes;uniform float uTime;",
      "#define STEPS 36",
      "#define LSTEPS 5",
      "#define ABSORP 0.9",
      "float hash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
      "float vn(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);",
      "float a=hash(i);float b=hash(i+vec3(1.0,0.0,0.0));float c=hash(i+vec3(0.0,1.0,0.0));float d=hash(i+vec3(1.0,1.0,0.0));",
      "float e=hash(i+vec3(0.0,0.0,1.0));float g=hash(i+vec3(1.0,0.0,1.0));float h=hash(i+vec3(0.0,1.0,1.0));float k=hash(i+vec3(1.0,1.0,1.0));",
      "return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);}",
      "float fbm(vec3 p){vec3 q=p+uTime*vec3(0.12,-0.02,-0.05);float f=0.0;float a=0.5;float fc=2.02;",
      "for(int i=0;i<4;i++){f+=a*vn(q);q*=fc;fc+=0.15;a*=0.5;}return f;}",
      "float clouds(vec3 p){float base=fbm(p*0.6);float cov=smoothstep(0.5,0.95,base);float hh=p.y;",
      "float win=smoothstep(0.6,1.8,hh)*(1.0-smoothstep(4.2,6.5,hh));return cov*win;}",
      "float beers(float d){return exp(-d*ABSORP);}",
      "float hg(float g,float mu){float gg=g*g;return (1.0/(4.0*3.14159265))*((1.0-gg)/pow(1.0+gg-2.0*g*mu,1.5));}",
      "float lmarch(vec3 pos,vec3 ld){float dens=0.0;float ms=0.3;for(int s=0;s<LSTEPS;s++){pos+=ld*ms;dens+=clouds(pos)*ms;}return beers(dens);}",

      // ---- the thing floating in the weather -------------------------------
      // A signed-distance octahedron rather than a loaded mesh: this page ships
      // no bundler and no asset pipeline, and an exact SDF is four lines.
      "mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.0,s,0.0,1.0,0.0,-s,0.0,c);}",
      "mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.0,0.0,0.0,0.0,c,-s,0.0,s,c);}",
      "float mapObj(vec3 p){vec3 q=p-vec3(1.15,1.36+sin(uTime*0.55)*0.15,4.9);",
      "q=rotX(0.34)*rotY(uTime*0.4)*q;q=abs(q);return (q.x+q.y+q.z-0.85)*0.5773503-0.06;}",
      "vec3 nrmObj(vec3 p){vec2 e=vec2(0.0015,0.0);return normalize(vec3(",
      "mapObj(p+e.xyy)-mapObj(p-e.xyy),mapObj(p+e.yxy)-mapObj(p-e.yxy),mapObj(p+e.yyx)-mapObj(p-e.yyx)));}",

      // ---- ordered dithering ----------------------------------------------
      // The 4x4 Bayer index matrix, generated rather than tabulated: GLSL ES 1.0
      // will not let you index a const array with a computed index, and the
      // recursion that builds the matrix is cheaper than the branch tree anyway.
      "float bayer2(vec2 a){a=floor(a);return fract(a.x*0.5+a.y*a.y*0.75);}",
      "float bayer4(vec2 a){return bayer2(a*0.5)*0.25+bayer2(a);}",

      "void main(){",
      // Barrel the sampling coordinates, not the finished image — one pass, and
      // the geometry bends with the screen the way a real tube's would.
      //
      // Curve in real proportions rather than in the squashed -1..1 box. This
      // panel is three times wider than it is tall; bending x and y by the same
      // amount in normalised space applies roughly triple the distortion
      // horizontally and smears the right-hand third into a visible seam.
      "vec2 sc=gl_FragCoord.xy/uRes*2.0-1.0;",
      "float asp=uRes.x/uRes.y;",
      "vec2 q=vec2(sc.x*asp,sc.y);",
      "q+=q*(q.yx*q.yx)*0.012;",
      "vec2 cv=vec2(q.x/asp,q.y);",
      "float inside=1.0-step(1.0,max(abs(cv.x),abs(cv.y)));",
      "vec2 uv=q*0.5;",
      "vec3 ro=vec3(0.0,0.6,0.0);vec3 rd=normalize(vec3(uv.x,uv.y*0.6+0.06,1.0));vec3 sun=normalize(vec3(0.65,0.28,0.5));",
      "float syt=clamp(rd.y*1.5+0.25,0.0,1.0);vec3 sky=mix(vec3(0.80,0.85,0.92),vec3(0.26,0.44,0.80),syt);",
      "float sd=max(dot(rd,sun),0.0);sky+=vec3(1.0,0.86,0.62)*pow(sd,80.0);sky+=vec3(1.0,0.8,0.6)*pow(sd,4.0)*0.15;",

      // March the solid first: it is opaque, so wherever it is hit it becomes
      // the backdrop and the cloud march stops there. Clouds nearer than the
      // octahedron still layer over it; clouds behind it are simply not visible.
      "float tObj=1e9;float td=0.6;",
      "for(int i=0;i<40;i++){float d=mapObj(ro+rd*td);if(d<0.003){tObj=td;break;}td+=d;if(td>9.0){break;}}",
      "vec3 base=sky;",
      "if(tObj<1e8){vec3 hp=ro+rd*tObj;vec3 n=nrmObj(hp);",
      // Wrap the lambert into 0..1 rather than clamping at the terminator. The
      // sun sits behind and to the right for the clouds' sake, so a straight
      // dot() leaves every face we can actually see at zero and the solid reads
      // as a hole punched in the sky.
      "float lam=clamp(dot(n,sun)*0.5+0.5,0.0,1.0);",
      // Retro shading: light arrives in four steps, not a ramp. Same round-to-
      // nearest quantiser used on the frame below, so the two agree.
      "float band=floor(lam*3.0+0.5)/3.0;",
      "float rim=pow(1.0-clamp(dot(n,-rd),0.0,1.0),2.0);",
      "base=mix(vec3(0.24,0.20,0.31),vec3(1.0,0.72,0.30),band)+vec3(1.0,0.86,0.62)*rim*0.35;",
      "base=mix(base,vec3(0.55,0.62,0.78),clamp((tObj-2.6)/7.0,0.0,1.0)*0.32);}",

      "float phase=hg(0.4,sd);float march=0.34;float off=hash(vec3(gl_FragCoord.xy,uTime))*march;",
      "float tmax=min(tObj,20.0);",
      "float t=1.0+off;float trans=1.0;vec3 cc=vec3(0.0);",
      "for(int i=0;i<STEPS;i++){if(t>tmax){break;}vec3 p=ro+rd*t;if(p.y>7.0){break;}float d=clouds(p);",
      "if(d>0.01){float lt=lmarch(p,sun);float lum=0.03+d*phase;vec3 lit=vec3(1.0,0.93,0.80);vec3 sha=vec3(0.34,0.41,0.55);",
      "vec3 scl=mix(sha,lit,lt);float dt=d*march;cc+=trans*dt*scl*(lum*6.0);trans*=beers(dt);if(trans<0.02){break;}}t+=march;}",
      "vec3 col=base*trans+cc;col=pow(clamp(col,0.0,1.0),vec3(0.92));",

      // ---- post: quantise, dither, then the tube ---------------------------
      // Nudge by the Bayer threshold before rounding, so which side of a step a
      // pixel lands on depends on where it sits in the 4x4 cell. That trade —
      // spatial pattern for tonal range — is the whole trick.
      "float lv=6.0;",
      "col+=(bayer4(gl_FragCoord.xy)-0.5)*0.85/(lv-1.0);",
      "col=floor(clamp(col,0.0,1.0)*(lv-1.0)+0.5)/(lv-1.0);",
      "float scan=0.87+0.13*sin(gl_FragCoord.y*3.14159265);",
      "float vig=1.0-0.30*dot(cv,cv);",
      "col*=scan*vig*inside;",
      "gl_FragColor=vec4(col,1.0);}"
    ].join("\n");

    function compile(type, s) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
      return sh;
    }
    var vs = compile(gl.VERTEX_SHADER, vsrc), fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "uRes");
    var uTime = gl.getUniformLocation(prog, "uTime");
    // Resolution is a design decision here, not a performance one: the buffer is
    // small because the pixels are supposed to be visible. It happens to make the
    // raymarch nearly free, which is a pleasant coincidence rather than the point.
    var scale = 0.34;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var w = Math.max(2, (r.width * scale) | 0), h = Math.max(2, (r.height * scale) | 0);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    }
    var start = performance.now();
    function draw(now) {
      resize();
      if (visible) {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(draw);
    }
    if (reduce) {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, 2.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      requestAnimationFrame(draw);
    }
  })();
</script>

<script>
  (function () {
    var canvas = document.getElementById("wdsPlum");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var W = 0, H = 0;
    var R15 = Math.PI / 12, LEN = 6, MAX = 1000, PER_FRAME = 4, drawn = 0;
    var queue = [];
    var raf = null, holdT = null;
    var stroke = "rgba(136,136,136,0.16)";

    function readColor() {
      try {
        var fg = getComputedStyle(document.documentElement).getPropertyValue("--c-fg").trim();
        if (fg) stroke = "rgba(" + fg.replace(/\s+/g, ",") + ",0.16)";
      } catch (e) {}
    }
    function size() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 1;
      ctx.strokeStyle = stroke;
    }
    function cart(x, y, r, t) { return [x + r * Math.cos(t), y + r * Math.sin(t)]; }
    function branch(b) {
      var e = cart(b.x, b.y, b.length, b.theta);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(e[0], e[1]);
      ctx.stroke();
      drawn++;
      if (drawn >= MAX) return;
      var rate = 0.62;
      if (Math.random() < rate)
        queue.push({ x: e[0], y: e[1], length: b.length + (Math.random() - 0.5), theta: b.theta - Math.random() * R15, depth: b.depth + 1 });
      if (Math.random() < rate)
        queue.push({ x: e[0], y: e[1], length: b.length + (Math.random() - 0.5), theta: b.theta + Math.random() * R15, depth: b.depth + 1 });
    }
    function seed() {
      var rm = function () { return Math.random() * 0.6 + 0.2; };
      queue = [
        { x: W * rm(), y: -5, length: LEN, theta: Math.PI / 2, depth: 0 },
        { x: W * rm(), y: H + 5, length: LEN, theta: -Math.PI / 2, depth: 0 },
        { x: -5, y: H * rm(), length: LEN, theta: 0, depth: 0 },
        { x: W + 5, y: H * rm(), length: LEN, theta: Math.PI, depth: 0 }
      ];
    }
    function growAll() {
      ctx.clearRect(0, 0, W, H);
      drawn = 0;
      seed();
      var g = 0;
      while (queue.length && drawn < MAX && g < 60000) {
        branch(queue.shift());
        g++;
      }
    }
    function restart() {
      ctx.clearRect(0, 0, W, H);
      drawn = 0;
      seed();
      raf = requestAnimationFrame(frame);
    }
    function frame() {
      var budget = Math.max(1, Math.round(PER_FRAME * (1 - drawn / MAX)));
      while (budget-- > 0 && queue.length && drawn < MAX) {
        branch(queue.shift());
      }
      if (queue.length && drawn < MAX) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = null;
        holdT = setTimeout(function () { holdT = null; restart(); }, 3000);
      }
    }

    readColor();
    size();
    if (reduce) {
      growAll();
    } else {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          var vis = es[0].isIntersecting;
          if (!vis) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
          else if (!raf && !holdT) { restart(); }
        }).observe(canvas);
      }
      restart();
    }
    window.addEventListener("resize", function () {
      readColor(); size();
      if (reduce) { growAll(); }
      else { if (raf) { cancelAnimationFrame(raf); raf = null; } if (holdT) { clearTimeout(holdT); holdT = null; } restart(); }
    });
  })();
</script>

<script>
  (function () {
    var canvas = document.getElementById("wdsSmoke");
    if (!canvas) return;
    var gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
    // No WebGL2, or no float targets: the CSS gradient behind is the fallback.
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var SIM = 64, DYE = 160, ITER = 14, DT = 0.016;
    var VEL_FADE = 0.22, DYE_FADE = 0.62, CURL = 22, PRESS_FADE = 0.8;

    var VERT = "#version 300 es\nprecision highp float;layout(location=0) in vec2 a;out vec2 vUv;out vec2 vL;out vec2 vR;out vec2 vT;out vec2 vB;uniform vec2 texel;void main(){vUv=a*0.5+0.5;vL=vUv-vec2(texel.x,0.0);vR=vUv+vec2(texel.x,0.0);vT=vUv+vec2(0.0,texel.y);vB=vUv-vec2(0.0,texel.y);gl_Position=vec4(a,0.0,1.0);}";
    var HEAD = "#version 300 es\nprecision highp float;in vec2 vUv;in vec2 vL;in vec2 vR;in vec2 vT;in vec2 vB;out vec4 o;";

    var FRAGS = {
      splat: HEAD + "uniform sampler2D uT;uniform float aspect;uniform vec3 col;uniform vec2 pt;uniform float rad;void main(){vec2 p=vUv-pt;p.x*=aspect;o=vec4(texture(uT,vUv).xyz+exp(-dot(p,p)/rad)*col,1.0);}",
      advect: HEAD + "uniform sampler2D uV;uniform sampler2D uS;uniform vec2 texel;uniform float dt;uniform float fade;void main(){vec2 c=vUv-dt*texture(uV,vUv).xy*texel;o=texture(uS,c)/(1.0+fade*dt);}",
      // Mirroring the normal component at the wall is the whole boundary
      // condition: the pressure solve answers the negative divergence with
      // outflow, which is what keeps the fog inside the card.
      diverge: HEAD + "uniform sampler2D uV;void main(){float L=texture(uV,vL).x;float R=texture(uV,vR).x;float T=texture(uV,vT).y;float B=texture(uV,vB).y;vec2 C=texture(uV,vUv).xy;if(vL.x<0.0){L=-C.x;}if(vR.x>1.0){R=-C.x;}if(vT.y>1.0){T=-C.y;}if(vB.y<0.0){B=-C.y;}o=vec4(0.5*(R-L+T-B),0.0,0.0,1.0);}",
      curl: HEAD + "uniform sampler2D uV;void main(){o=vec4(0.5*(texture(uV,vR).y-texture(uV,vL).y-texture(uV,vT).x+texture(uV,vB).x),0.0,0.0,1.0);}",
      // Push along the gradient of |curl|, which sharpens the eddies instead of
      // letting numerical diffusion flatten them into a wash.
      vort: HEAD + "uniform sampler2D uV;uniform sampler2D uC;uniform float curl;uniform float dt;void main(){float L=texture(uC,vL).x;float R=texture(uC,vR).x;float T=texture(uC,vT).x;float B=texture(uC,vB).x;float C=texture(uC,vUv).x;vec2 f=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+0.0001;f*=curl*C;f.y*=-1.0;o=vec4(clamp(texture(uV,vUv).xy+f*dt,-800.0,800.0),0.0,1.0);}",
      press: HEAD + "uniform sampler2D uP;uniform sampler2D uD;void main(){o=vec4((texture(uP,vL).x+texture(uP,vR).x+texture(uP,vB).x+texture(uP,vT).x-texture(uD,vUv).x)*0.25,0.0,0.0,1.0);}",
      grad: HEAD + "uniform sampler2D uP;uniform sampler2D uV;void main(){o=vec4(texture(uV,vUv).xy-vec2(texture(uP,vR).x-texture(uP,vL).x,texture(uP,vT).x-texture(uP,vB).x),0.0,1.0);}",
      fade: HEAD + "uniform sampler2D uT;uniform float v;void main(){o=v*texture(uT,vUv);}",
      // Opaque: the canvas paints its own night behind the fog, so there's no
      // alpha to blend and the CSS gradient underneath is only ever a fallback.
      show: HEAD + "uniform sampler2D uD;uniform vec2 texel;void main(){float d=texture(uD,vUv).r;float l=texture(uD,vUv-vec2(texel.x,0.0)).r;float r=texture(uD,vUv+vec2(texel.x,0.0)).r;float b=texture(uD,vUv-vec2(0.0,texel.y)).r;float t=texture(uD,vUv+vec2(0.0,texel.y)).r;vec3 n=normalize(vec3((l-r)*16.0,(b-t)*16.0,1.0));float lam=clamp(dot(n,normalize(vec3(-0.4,0.8,0.6))),0.0,1.0);vec3 night=mix(vec3(0.063,0.075,0.102),vec3(0.145,0.169,0.220),vUv.y);vec3 fog=mix(vec3(0.42,0.47,0.56),vec3(0.93,0.95,0.98),lam);float a=pow(clamp(d,0.0,1.0),1.6);o=vec4(mix(night,fog,a),1.0);}"
    };

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    function link(frag) {
      var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, frag);
      if (!vs || !fs) return null;
      var p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
      return { p: p, u: u };
    }
    var prog = {}, ok = true;
    for (var key in FRAGS) { prog[key] = link(FRAGS[key]); if (!prog[key]) ok = false; }
    if (!ok) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    function fbo(w, h, internal, format) {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex: tex, f: f, w: w, h: h, tx: 1 / w, ty: 1 / h,
        bind: function (unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; },
        free: function () { gl.deleteFramebuffer(f); gl.deleteTexture(tex); } };
    }
    function pair(w, h, internal, format) {
      var a = fbo(w, h, internal, format), b = fbo(w, h, internal, format);
      return { get read() { return a; }, get write() { return b; },
        swap: function () { var t = a; a = b; b = t; },
        free: function () { a.free(); b.free(); } };
    }
    function blit(target) {
      if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); }
      else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    function use(prg, texelFrom) {
      gl.useProgram(prg.p);
      if (texelFrom) gl.uniform2f(prg.u.texel, texelFrom.tx, texelFrom.ty);
      return prg;
    }

    var vel = null, dye = null, press = null, div = null, crl = null;
    function size() {
      var r = canvas.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      // Half resolution: the fog is a soft, low-frequency image and nobody has
      // ever spotted a sharp edge in it.
      var dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      var aspect = r.width / r.height;
      var sw = Math.round(SIM * Math.max(1, aspect)), sh = Math.round(SIM * Math.max(1, 1 / aspect));
      var dw = Math.round(DYE * Math.max(1, aspect)), dh = Math.round(DYE * Math.max(1, 1 / aspect));
      if (vel && vel.read.w === sw && dye.read.w === dw) return true;
      // Everything here is a texture and a framebuffer; dropping the old set on
      // the floor leaks a whole simulation's worth of GPU memory per resize.
      if (vel) { vel.free(); dye.free(); press.free(); div.free(); crl.free(); }
      vel = pair(sw, sh, gl.RG16F, gl.RG);
      dye = pair(dw, dh, gl.R16F, gl.RED);
      press = pair(sw, sh, gl.R16F, gl.RED);
      div = fbo(sw, sh, gl.R16F, gl.RED);
      crl = fbo(sw, sh, gl.R16F, gl.RED);
      return true;
    }

    function splat(target, x, y, r, g, b, rad) {
      var p = use(prog.splat);
      gl.uniform1i(p.u.uT, target.read.bind(0));
      gl.uniform1f(p.u.aspect, target.read.w / target.read.h);
      gl.uniform2f(p.u.pt, x, y);
      gl.uniform3f(p.u.col, r, g, b);
      gl.uniform1f(p.u.rad, rad);
      blit(target.write); target.swap();
    }

    var pointer = { x: 0, y: 0, dx: 0, dy: 0, on: false, moved: false };
    var tick = 0;

    function step() {
      // Two vents wandering along the floor. A fixed source reads as a jet; a
      // drifting one reads as fog, because the column never has time to organise.
      var t = tick * DT;
      var a = 0.5 + Math.sin(t * 0.31) * 0.26 + Math.sin(t * 0.13) * 0.1;
      var b = 0.5 + Math.sin(t * 0.23 + 2.1) * 0.3;
      splat(dye, a, 0.06, 0.55, 0, 0, 0.0016);
      splat(vel, a, 0.06, Math.sin(t * 0.7) * 40, 190, 0, 0.0016);
      splat(dye, b, 0.03, 0.32, 0, 0, 0.0022);
      splat(vel, b, 0.03, Math.sin(t * 0.5 + 1.0) * 30, 130, 0, 0.0022);
      tick++;

      if (pointer.moved) {
        pointer.moved = false;
        splat(vel, pointer.x, pointer.y, pointer.dx, pointer.dy, 0, 0.006);
      }

      var p = use(prog.curl, vel.read);
      gl.uniform1i(p.u.uV, vel.read.bind(0)); blit(crl);

      p = use(prog.vort, vel.read);
      gl.uniform1i(p.u.uV, vel.read.bind(0));
      gl.uniform1i(p.u.uC, crl.bind(1));
      gl.uniform1f(p.u.curl, CURL); gl.uniform1f(p.u.dt, DT);
      blit(vel.write); vel.swap();

      p = use(prog.diverge, vel.read);
      gl.uniform1i(p.u.uV, vel.read.bind(0)); blit(div);

      // Warm-started from a faded copy of the last solve, which converges in far
      // fewer iterations than starting from zero every frame.
      p = use(prog.fade);
      gl.uniform1i(p.u.uT, press.read.bind(0));
      gl.uniform1f(p.u.v, PRESS_FADE);
      blit(press.write); press.swap();

      p = use(prog.press, vel.read);
      gl.uniform1i(p.u.uD, div.bind(0));
      for (var i = 0; i < ITER; i++) {
        gl.uniform1i(p.u.uP, press.read.bind(1));
        blit(press.write); press.swap();
      }

      p = use(prog.grad, vel.read);
      gl.uniform1i(p.u.uP, press.read.bind(0));
      gl.uniform1i(p.u.uV, vel.read.bind(1));
      blit(vel.write); vel.swap();

      p = use(prog.advect, vel.read);
      gl.uniform1i(p.u.uV, vel.read.bind(0));
      gl.uniform1i(p.u.uS, vel.read.bind(0));
      gl.uniform1f(p.u.dt, DT); gl.uniform1f(p.u.fade, VEL_FADE);
      blit(vel.write); vel.swap();

      p = use(prog.advect, dye.read);
      gl.uniform1i(p.u.uV, vel.read.bind(0));
      gl.uniform1i(p.u.uS, dye.read.bind(1));
      gl.uniform1f(p.u.dt, DT); gl.uniform1f(p.u.fade, DYE_FADE);
      blit(dye.write); dye.swap();
    }

    function show() {
      var p = use(prog.show, dye.read);
      gl.uniform1i(p.u.uD, dye.read.bind(0));
      blit(null);
    }

    var visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    }

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || !size()) return;
      step(); show();
    }

    canvas.addEventListener("pointermove", function (e) {
      // Mouse only: on a phone the only reason a finger crosses this is to
      // scroll past it.
      if (e.pointerType !== "mouse") return;
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      pointer.dx = (x - pointer.x) * r.width * 6;
      pointer.dy = (y - pointer.y) * r.height * 6;
      pointer.x = x; pointer.y = y;
      if (pointer.on) pointer.moved = true;
      pointer.on = true;
    });
    canvas.addEventListener("pointerleave", function () { pointer.on = false; pointer.moved = false; });

    if (reduce) {
      // A still frame with some fog already in the air, rather than motion
      // nobody asked for.
      if (size()) { for (var i = 0; i < 220; i++) step(); show(); }
    } else {
      requestAnimationFrame(frame);
    }
  })();
</script>

<script>
  (function () {
    // ASCII Object. The real component rasterises a lit three.js scene and then
    // scores each cell against a glyph atlas by shape. This is the older trick
    // it descends from: a torus rotated in software, one directional lamp, and
    // surface luminance mapped straight onto a ramp of characters.
    var canvas = document.getElementById("wdsAscii");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    var RAMP = ".,-~:;=!*#$@";     // darkest to brightest
    var MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
    var FONT = 8;                  // px
    var CW = FONT * 0.6;           // monospace advance, measured once the font is set
    var CH = FONT + 1;             // line box
    var R1 = 1, R2 = 2, K2 = 5;    // tube radius, ring radius, viewer distance
    var A = 0, B = 0, T = 0, bob = 0;
    var cols = 0, rows = 0, K1 = 0;
    var visible = true, raf = null;

    function size() {
      var rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT + "px " + MONO;
      ctx.textBaseline = "top";
      CW = ctx.measureText("M").width || FONT * 0.6;
      cols = Math.floor(rect.width / CW);
      rows = Math.floor(rect.height / CH);
      // Fit to whichever axis binds. The panel is far wider than a torus is, so
      // in practice height wins and the object sits centred in open terminal.
      var yScale = CW / CH;
      // Half-extent at unit K1. Not (R1+R2)/(K2-R1-R2) — that pairs the widest
      // point of the ring with the nearest point of the tube, which never happens
      // at once, and fitting to it leaves the object at half the size it could be.
      var reach = (R1 + R2) / (K2 - R1);
      K1 = 0.82 * Math.min(cols / 2, (rows / 2) / yScale) / reach;
      return true;
    }

    function render() {
      var zbuf = new Float32Array(cols * rows);
      var cbuf = new Uint8Array(cols * rows);   // 0 = empty, else ramp index + 1
      var cosA = Math.cos(A), sinA = Math.sin(A);
      var cosB = Math.cos(B), sinB = Math.sin(B);
      // Squash y by the character cell's aspect so the torus reads round rather
      // than stretched — a text cell is much taller than it is wide.
      var yScale = CW / CH;

      for (var th = 0; th < 6.2832; th += 0.07) {
        var ct = Math.cos(th), st = Math.sin(th);
        for (var ph = 0; ph < 6.2832; ph += 0.02) {
          var cp = Math.cos(ph), sp = Math.sin(ph);
          var circleX = R2 + R1 * ct, circleY = R1 * st;
          var x = circleX * (cosB * cp + sinA * sinB * sp) - circleY * cosA * sinB;
          var y = circleX * (sinB * cp - sinA * cosB * sp) + circleY * cosA * cosB;
          var z = K2 + cosA * circleX * sp + circleY * sinA;
          var ooz = 1 / z;
          var xp = (cols / 2 + K1 * ooz * x) | 0;
          var yp = (rows / 2 + bob - K1 * ooz * y * yScale) | 0;
          if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;
          var lum = cp * ct * sinB - cosA * ct * sp - sinA * st + cosB * (cosA * st - ct * sinA * sp);
          if (lum <= 0) continue;
          var idx = yp * cols + xp;
          if (ooz <= zbuf[idx]) continue;
          zbuf[idx] = ooz;
          var l = (lum * 8) | 0;
          cbuf[idx] = Math.min(RAMP.length - 1, l) + 1;
        }
      }

      var rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      // Two passes so the lit side reads brighter than the terminator, without
      // a fillStyle change per character.
      for (var pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? "rgba(126,226,168,0.95)" : "rgba(126,226,168,0.38)";
        for (var r = 0; r < rows; r++) {
          var line = "", any = false;
          for (var c = 0; c < cols; c++) {
            var v = cbuf[r * cols + c];
            var bright = v > 5;
            if (v && bright === !!pass) { line += RAMP.charAt(v - 1); any = true; }
            else line += " ";
          }
          if (any) ctx.fillText(line, 0, r * CH);
        }
      }
    }

    function frame() {
      if (visible) {
        T += 1 / 60;
        // The component's own idle: a steady turntable on one axis, a slow rock
        // on the other, and a floating bob. The rock is centred near face-on so
        // the object keeps filling the panel instead of thinning to a line every
        // few seconds, which a free tumble does.
        B += 0.012;
        A = 1.05 + 0.5 * Math.sin(T * 0.55);
        bob = Math.sin(T * 0.9) * 0.7;
        render();
      }
      raf = requestAnimationFrame(frame);
    }

    if (!size()) { requestAnimationFrame(function () { if (size()) start(); }); }
    else start();

    function start() {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
      }
      if (reduce) { A = 1.4; B = 0.4; render(); return; }
      raf = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", function () { if (size()) render(); });
  })();
</script>

<script>
  (function () {
    // Impeccable. Flip the mock between the two states on a timer; every visual
    // difference between them is CSS, so the transition is the browser's job.
    var stage = document.getElementById("wdsImp");
    var cmd = document.getElementById("wdsImpCmd");
    if (!stage) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { stage.setAttribute("data-state", "clean"); return; }

    var visible = true, timer = null;
    function flip() {
      var next = stage.getAttribute("data-state") === "slop" ? "clean" : "slop";
      // The command only makes sense on the way in; going back is the undo.
      if (cmd) {
        cmd.textContent = next === "clean" ? "/polish" : "undo";
        cmd.classList.add("is-on");
        setTimeout(function () { cmd.classList.remove("is-on"); }, 1100);
      }
      stage.setAttribute("data-state", next);
    }
    function tick() { if (visible) flip(); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
    }
    timer = setInterval(tick, 2800);
    setTimeout(tick, 900);
  })();
</script>

<script>
  (function () {
    // Taste Skill. One attribute drives the whole look; the stylesheet holds the
    // three directions so there is exactly one place to argue with them.
    var stage = document.getElementById("wdsTaste");
    var label = document.getElementById("wdsTasteDir");
    if (!stage) return;
    var DIRS = ["brutalist", "minimal", "soft"];
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      stage.setAttribute("data-dir", "minimal");
      if (label) label.textContent = "minimal";
      return;
    }

    var i = 0, visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
    }
    setInterval(function () {
      if (!visible) return;
      i = (i + 1) % DIRS.length;
      stage.setAttribute("data-dir", DIRS[i]);
      if (label) label.textContent = DIRS[i];
    }, 2400);
  })();
</script>
