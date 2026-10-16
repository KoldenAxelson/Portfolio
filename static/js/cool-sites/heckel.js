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
