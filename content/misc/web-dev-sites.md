---
title: "Cool Web Dev Sites"
description: "A small showcase of web development sites worth studying — sharp writing, beautiful craft, and interfaces that teach by example."
lead: "A small showcase of web dev sites worth studying — sharp writing and beautiful craft."
blurb: "A small showcase of web dev sites worth studying — craft, writing, and interfaces that teach by example."
icon: "globe"
container: "wide"
updated: 2026-07-15
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
  .wds-hint{position:absolute;bottom:.5rem;right:.6rem;font-family:var(--font-mono);font-size:.58rem;text-transform:uppercase;letter-spacing:.12em;color:rgb(var(--c-muted));opacity:.7;pointer-events:none;}
  .wds-cloud{background:linear-gradient(#cbd6e6,#4b6791);}
  .wds-cloudcanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  .wds-chip{position:absolute;left:.6rem;bottom:.5rem;z-index:1;font-family:var(--font-mono);font-size:.6rem;letter-spacing:.08em;color:#fff;background:rgba(0,0,0,.38);padding:.28rem .55rem;border-radius:999px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
  .wds-plum{background:rgb(var(--c-border) / .12);}
  .wds-plumcanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  .wds-intro{max-width:58ch;}
  .wds-cover:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:2px;border-radius:.9rem;}
  .wds-title:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:2px;border-radius:.3rem;}
  @keyframes wdsIn{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion:no-preference){
    .wds-card{animation:wdsIn .3s cubic-bezier(.16,1,.3,1) backwards;}
    .wds-card:nth-child(1){animation-delay:.02s;}
    .wds-card:nth-child(2){animation-delay:.10s;}
    .wds-card:nth-child(3){animation-delay:.18s;}
  }
</style>

<div class="wds-root">
<div class="wds-grid">
<article class="wds-card wds-feature">
<div class="wds-preview wds-logowrap"><canvas class="wds-canvas" id="wdsCanvas"></canvas><svg class="wds-src" id="wdsSrc" viewBox="0 0 2000 2000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wdsGrad" x1="-146.12" y1="406.6" x2="1328.05" y2="1196.71" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eee393"/><stop offset="1" stop-color="#94672b"/></linearGradient></defs><path fill="#037737" d="m382.16,365.18c-47.3,5.1-87.63,27.17-116.64,63.84-28.58,36.12-44.21,80.02-47.8,134.2-2.26,34.17-2.75,68.58-3.23,102-.17,12.35-.35,24.7-.62,37.05l-.32,16.26c-.81,42.37-1.57,82.39-8.28,121.95-6.52,38.38-29.41,63.72-64.44,71.36-5.01,1.1-10.84,1.78-17,2.52-3.44.41-6.9.82-10.36,1.3l-30.19,4.21v163.82l36.37,3.99c3.2.35,6.19.66,9.15,1.02,36.74,4.3,58.43,21.34,70.34,55.25,6.98,19.88,9.12,41.48,10.18,67.82,1.06,26.15,1.65,52.92,2.21,78.95.37,17.06.75,34.13,1.25,51.19.16,5.39.3,10.78.44,16.17,1.11,41.95,2.26,85.34,10.94,128.91,15.5,77.81,71.59,134.51,146.36,147.96,19.43,3.49,38.43,4.28,56.86,5.04,5.67.23,11.33.47,16.96.78,4.52.26,9.24.37,14.85.37,3.52,0,6.98-.05,10.4-.1h.7c3.44-.06,6.89-.11,10.38-.11h35.03v-165.91l-32.64-2.24c-6.58-.45-13.11-.83-19.82-1.22-14.07-.83-27.36-1.61-40.39-3.07-19.68-2.23-22.09-8.74-23.53-12.64-3.07-8.29-7.19-20.53-7.53-31.01-1.32-40.29-1.46-81.56-1.6-121.49l-.08-21.31c-.24-53.8-3.94-97.83-11.64-138.56-11.44-60.48-40.31-108.38-85.86-142.53,40.3-29.81,67.52-70.36,80.98-120.67,11.62-43.41,13.93-86.41,14.65-119.02.6-27.4.88-55.79,1.14-80.84.23-22.32.46-44.65.87-66.97.34-18.48,1.49-40.17,7.46-60.82,2.59-8.92,6.34-12.89,14.36-15.19,9.25-2.65,17.88-4.38,25.64-5.14,9.71-.95,19.66-1.27,30.19-1.61,4.81-.16,9.64-.31,14.48-.53l33.47-1.49v-162.85s-110.71-3.13-133.69-.65Z"/><path fill="#037737" d="m1880.83,912.05c-3.18-.36-6.09-.68-9-.97h0c-39.37-3.79-65.23-25.99-74.77-64.2-7.55-30.26-8.52-62.87-9.46-94.41-.58-19.49-.92-39.45-1.25-58.74v-.78c-.5-29-1.01-58.99-2.36-88.68-1.15-25.42-3.34-58.89-10.05-92.43-13.59-67.9-54.4-116.3-118.02-139.97-29.14-10.83-57.71-11.78-85.34-12.7-12.56-.42-24.87-.32-36.77-.21-5.22.05-10.45.09-15.71.09h-35.03v165.65l32.62,2.24c6.71.47,13.37.86,20.13,1.26,14.28.85,27.77,1.65,41.05,3.1,20.2,2.2,23.95,10.41,26.26,19.37,1.87,7.23,3.81,15.59,4.04,22.84,1.03,32.69,1.26,66.17,1.35,94.61l.03,18.32c.03,49.35.06,100.38,8.27,151.56,4.73,29.46,12.13,63.84,31.24,95.53,14.93,24.76,34.34,45.94,59.15,64.51-39.11,29.48-66.24,69.89-80.69,120.27-9.38,32.68-14.08,68.02-14.76,111.22-.4,25.01-.65,50.02-.9,75.03l-.02,1.98c-.27,26.41-.54,52.81-.99,79.22-.31,18.75-1.46,40.71-7.55,61.37-3.2,10.84-8.4,13.2-13.45,14.68-9.71,2.85-19.07,4.76-27.83,5.66-9.45.98-19.31,1.28-30.03,1.61-4.78.15-9.57.29-14.36.5l-33.5,1.47v170.13l36.63-1.67c9.43-.43,18.81-.69,28.43-.95,21.57-.6,43.88-1.21,66.25-3.87,59.25-7.01,106.16-37.18,135.64-87.26,18.99-32.27,29.58-68.81,32.37-111.69,2.22-34.28,2.77-68.8,3.3-102.19.12-7.91.25-15.82.4-23.72.13-7.12.24-14.24.35-21.37.67-44.63,1.3-86.78,8.28-128.54,6.47-38.69,29.49-64.27,64.81-72.01,5.05-1.11,10.84-1.81,16.98-2.55,3.37-.42,6.74-.83,10.09-1.3l30.1-4.28v-163.75l-35.92-3.93Z"/><polygon fill="url(#wdsGrad)" points="1456.53 748.15 1326.54 673.1 1326.54 762.57 1243.43 762.57 1103.93 762.57 1024.46 1172.86 926.51 768.41 778.79 768.41 680.84 1172.86 608.95 768.41 462.03 768.41 595.53 1326.9 762.99 1326.9 853.04 953.26 942.31 1326.9 1109.77 1326.9 1213.19 890.22 1326.54 890.22 1326.54 973.28 1456.53 898.24 1586.51 823.19 1456.53 748.15"/></svg><span class="wds-hint">move your cursor through it</span></div>
<div class="wds-body">
<a class="wds-title" href="https://emilkowal.ski/ui/agents-with-taste" rel="noopener">Emil Kowalski — Agents with Taste <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">A design engineer (creator of Sonner and Vaul) on encoding your design taste into skill files so coding agents produce genuinely better animations. His article features an interactive Linear logo — a field of dots that scatter from your cursor. This is that effect, rebuilt with <em>my</em> logo: move your cursor through it and the dots flee, then settle back.</p>
<span class="wds-domain">emilkowal.ski</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://blog.maximeheckel.com" rel="noopener" aria-label="The Blog of Maxime Heckel"></a>
<div class="wds-preview wds-cloud"><canvas class="wds-cloudcanvas" id="wdsCloud"></canvas><span class="wds-chip">volumetric raymarching</span></div>
<div class="wds-body">
<a class="wds-title" href="https://blog.maximeheckel.com" rel="noopener">The Blog of Maxime Heckel <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Deep, interactive essays on shaders, WebGL/WebGPU, and real-time 3D — each with live playgrounds you can poke at. This cloudscape is built from his volumetric-raymarching write-up: FBM density, Beer's law, a light-march for self-shadowing, and a Henyey–Greenstein phase function.</p>
<span class="wds-domain">blog.maximeheckel.com</span>
</div>
</article>
<article class="wds-card">
<a class="wds-cover" href="https://antfu.me" rel="noopener" aria-label="Anthony Fu"></a>
<div class="wds-preview wds-plum"><canvas class="wds-plumcanvas" id="wdsPlum"></canvas><span class="wds-chip">generative · plum</span></div>
<div class="wds-body">
<a class="wds-title" href="https://antfu.me" rel="noopener">Anthony Fu <span class="wds-arrow" aria-hidden="true">↗</span></a>
<p class="wds-desc">Personal site of one of open source's most prolific design engineers (Vitest, Slidev, VueUse, UnoCSS; core team on Vue, Nuxt, and Vite). The growing branches here recreate the generative "plum" animation from his site's background — vines seeded at the edges that creep inward and fork.</p>
<span class="wds-domain">antfu.me</span>
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
      "void main(){vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;",
      "vec3 ro=vec3(0.0,0.6,0.0);vec3 rd=normalize(vec3(uv.x,uv.y*0.6+0.06,1.0));vec3 sun=normalize(vec3(0.65,0.28,0.5));",
      "float syt=clamp(rd.y*1.5+0.25,0.0,1.0);vec3 sky=mix(vec3(0.80,0.85,0.92),vec3(0.26,0.44,0.80),syt);",
      "float sd=max(dot(rd,sun),0.0);sky+=vec3(1.0,0.86,0.62)*pow(sd,80.0);sky+=vec3(1.0,0.8,0.6)*pow(sd,4.0)*0.15;",
      "float phase=hg(0.4,sd);float march=0.34;float off=hash(vec3(gl_FragCoord.xy,uTime))*march;",
      "float t=1.0+off;float trans=1.0;vec3 cc=vec3(0.0);",
      "for(int i=0;i<STEPS;i++){vec3 p=ro+rd*t;if(p.y>7.0){break;}float d=clouds(p);",
      "if(d>0.01){float lt=lmarch(p,sun);float lum=0.03+d*phase;vec3 lit=vec3(1.0,0.93,0.80);vec3 sha=vec3(0.34,0.41,0.55);",
      "vec3 sc=mix(sha,lit,lt);float dt=d*march;cc+=trans*dt*sc*(lum*6.0);trans*=beers(dt);if(trans<0.02){break;}}t+=march;}",
      "vec3 col=sky*trans+cc;col=pow(clamp(col,0.0,1.0),vec3(0.92));gl_FragColor=vec4(col,1.0);}"
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
    var scale = 0.5;

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
