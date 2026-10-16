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
