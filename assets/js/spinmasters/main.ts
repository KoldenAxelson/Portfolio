// main.ts — Spinmasters web entry point.
//
// The game itself is a Rust crate compiled to wasm (see the spinmasters repo).
// It simulates and software-rasterises into a CPU pixel buffer; here we just
// drive it: one `sm_tick` per animation frame with the current analog input,
// then present its RGBA buffer.
//
// Presentation mirrors the native build: the frame is uploaded to a GPU texture
// and drawn on a fullscreen quad with WebGL2 (cheap, hardware-scaled). A 2D
// `putImageData` path is kept as a fallback for browsers without WebGL2.
//
// This file also owns the UI state that lives *outside* the canvas (touch
// joystick, Dash/Power buttons, fullscreen) as an Alpine component
// (x-data="spinGame").

declare global {
  interface Window {
    // Alpine is a vendor global, not an ES module (matches the agar-clone build).
    Alpine: { data: (name: string, factory: () => unknown) => void };
  }
}

// The raw C ABI exported by the wasm module (see src/web.rs).
interface SpinExports {
  memory: WebAssembly.Memory;
  sm_init(): void;
  sm_width(): number;
  sm_height(): number;
  sm_in_fight(): number;
  sm_frame_ptr(): number;
  sm_tick(
    moveX: number,
    moveY: number,
    mouseX: number,
    mouseY: number,
    mouseDown: number,
    dash: number,
    power: number,
    ret: number,
    cam: number,
    dt: number,
  ): void;
}

async function loadWasm(url: string): Promise<SpinExports> {
  const imports: WebAssembly.Imports = {};
  // Prefer streaming; fall back to arrayBuffer if the server mislabels the MIME.
  try {
    const res = await WebAssembly.instantiateStreaming(fetch(url), imports);
    return res.instance.exports as unknown as SpinExports;
  } catch {
    const bytes = await fetch(url).then((r) => r.arrayBuffer());
    const res = await WebAssembly.instantiate(bytes, imports);
    return res.instance.exports as unknown as SpinExports;
  }
}

// ── WebGL2 blitter ───────────────────────────────────────────────────────────
// Uploads the W×H RGBA frame to a texture and draws it on a fullscreen quad,
// letterboxed to preserve the 1280×800 aspect. This is the GPU equivalent of
// the native wgpu present path — far cheaper than a per-frame putImageData.

interface Blitter {
  upload(view: Uint8Array): void;
  draw(cw: number, ch: number): void;
}

const VERT_SRC = `#version 300 es
in vec2 aPos;
in vec2 aUv;
out vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uTex;
out vec4 o;
void main() {
  o = texture(uTex, vUv);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function makeBlitter(gl: WebGL2RenderingContext, W: number, H: number): Blitter {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }
  const aPos = gl.getAttribLocation(prog, 'aPos');
  const aUv = gl.getAttribLocation(prog, 'aUv');
  const uTex = gl.getUniformLocation(prog, 'uTex');

  // Triangle strip: screen corner → image corner. uv.y=0 is the image's top
  // row (the first row the rasteriser wrote), so no vertical flip is needed.
  // interleaved [clipX, clipY, u, v]
  const quad = new Float32Array([
    -1, -1, 0, 1,
    1, -1, 1, 1,
    -1, 1, 0, 0,
    1, 1, 1, 0,
  ]);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
  gl.bindVertexArray(null);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  return {
    upload(view: Uint8Array): void {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, view);
    },
    draw(cw: number, ch: number): void {
      // Letterbox the 1280×800 image within the drawing buffer.
      const scale = Math.min(cw / W, ch / H);
      const dw = W * scale;
      const dh = H * scale;
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;
      // Clear the whole buffer to the arena background, then draw into the box.
      gl.viewport(0, 0, cw, ch);
      gl.clearColor(16 / 255, 18 / 255, 26 / 255, 1); // 0x10121A
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.viewport(ox, oy, dw, dh);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(uTex, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
  };
}

function spinGame() {
  let ex: SpinExports | null = null;
  let W = 1280;
  let H = 800;
  let last = 0;

  // Presentation: WebGL2 if available, else a 2D putImageData fallback.
  let gl: WebGL2RenderingContext | null = null;
  let blitter: Blitter | null = null;
  let ctx2d: CanvasRenderingContext2D | null = null;
  let canvasEl: HTMLCanvasElement | null = null;

  // Held analog movement from the keyboard (WASD / arrows).
  const keyMove = { x: 0, y: 0 };
  const held = { up: false, down: false, left: false, right: false };
  // One-shot action edges, consumed on the next tick.
  let edgeDash = false;
  let edgePower = false;
  let edgeRet = false;
  let edgeCam = false;

  // Pointer/tap state in canvas space (drives the in-canvas loadout menu).
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  // Joystick tracking (non-reactive).
  let joyCx = 0;
  let joyCy = 0;
  let joyR = 1;
  let joyId = -1;
  const joyVec = { x: 0, y: 0 };

  function recomputeKeyMove(): void {
    keyMove.x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    keyMove.y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
  }

  // Match the GL drawing buffer to the displayed size × DPR so the GPU upscale
  // is crisp (no double CSS scaling). Capped at 2× to bound cost on dense phones.
  function resizeGl(): void {
    if (!gl || !canvasEl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(canvasEl.clientWidth * dpr));
    const ch = Math.max(1, Math.round(canvasEl.clientHeight * dpr));
    if (canvasEl.width !== cw || canvasEl.height !== ch) {
      canvasEl.width = cw;
      canvasEl.height = ch;
    }
  }

  return {
    isTouch: false,
    isFullscreen: false,
    fsSupported: false,
    pseudoFs: false,
    inFight: false,
    ready: false,
    joyActive: false,
    thumbX: 0,
    thumbY: 0,

    init(this: any): void {
      const root = this.$root as HTMLElement;
      const url = root.dataset.wasmUrl || '';
      const canvas = this.$refs.canvas as HTMLCanvasElement;
      canvasEl = canvas;

      // Prefer WebGL2; fall back to a 2D context if it's unavailable.
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
      });
      if (!gl) ctx2d = canvas.getContext('2d', { alpha: false });

      this.isTouch =
        'ontouchstart' in window || (window.matchMedia?.('(pointer: coarse)').matches ?? false);

      const doc = document as any;
      this.fsSupported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
      const onFsChange = (): void => {
        this.isFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);

      // Pointer → canvas-space coordinates (for the loadout menu & aim taps).
      // The displayed image is letterboxed to the 1280×800 aspect either way
      // (CSS object-fit in the 2D path, GL viewport in the WebGL path), so the
      // same letterbox math maps clicks back to texture space.
      const toCanvas = (clientX: number, clientY: number): void => {
        const r = canvas.getBoundingClientRect();
        const scale = Math.min(r.width / W, r.height / H);
        const dw = W * scale;
        const dh = H * scale;
        const ox = (r.width - dw) / 2;
        const oy = (r.height - dh) / 2;
        mouseX = Math.max(0, Math.min(W, (clientX - r.left - ox) / scale));
        mouseY = Math.max(0, Math.min(H, (clientY - r.top - oy) / scale));
      };
      canvas.addEventListener('pointerdown', (e) => {
        toCanvas(e.clientX, e.clientY);
        mouseDown = true;
      });
      canvas.addEventListener('pointermove', (e) => toCanvas(e.clientX, e.clientY));
      window.addEventListener('pointerup', () => {
        mouseDown = false;
      });

      // Keyboard — only when the pointer is over the stage (or fullscreen), so
      // we never hijack page scrolling (Space / arrows) elsewhere.
      let active = false;
      const stage = this.$refs.stage as HTMLElement;
      stage.addEventListener('pointerenter', () => {
        active = true;
      });
      stage.addEventListener('pointerleave', () => {
        active = false;
      });
      const GAME_KEYS = new Set([
        'KeyW', 'KeyA', 'KeyS', 'KeyD',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Space', 'ShiftLeft', 'ShiftRight', 'KeyR', 'Enter', 'KeyC', 'KeyF',
      ]);
      window.addEventListener('keydown', (e) => {
        if (!active && !this.isFullscreen) return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': held.up = true; break;
          case 'KeyS': case 'ArrowDown': held.down = true; break;
          case 'KeyA': case 'ArrowLeft': held.left = true; break;
          case 'KeyD': case 'ArrowRight': held.right = true; break;
          case 'Space': if (!e.repeat) edgeDash = true; break;
          case 'ShiftLeft': case 'ShiftRight': if (!e.repeat) edgePower = true; break;
          case 'KeyR': case 'Enter': if (!e.repeat) edgeRet = true; break;
          case 'KeyC': if (!e.repeat) edgeCam = true; break;
          case 'KeyF': if (!e.repeat) this.toggleFullscreen(); break;
        }
        recomputeKeyMove();
      });
      window.addEventListener('keyup', (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': held.up = false; break;
          case 'KeyS': case 'ArrowDown': held.down = false; break;
          case 'KeyA': case 'ArrowLeft': held.left = false; break;
          case 'KeyD': case 'ArrowRight': held.right = false; break;
        }
        recomputeKeyMove();
      });

      void loadWasm(url).then((exports) => {
        ex = exports;
        ex.sm_init();
        W = ex.sm_width();
        H = ex.sm_height();
        if (gl) {
          blitter = makeBlitter(gl, W, H);
          resizeGl();
        } else {
          // 2D fallback: the backing store is the native frame size; CSS scales.
          canvas.width = W;
          canvas.height = H;
        }
        this.ready = true;
        last = performance.now();
        requestAnimationFrame((t) => this.frame(t));
      });
    },

    frame(this: any, t: number): void {
      requestAnimationFrame((nt) => this.frame(nt));
      if (!ex) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;

      // Movement: the joystick wins while engaged, else the keyboard vector.
      const mx = this.joyActive ? joyVec.x : keyMove.x;
      const my = this.joyActive ? joyVec.y : keyMove.y;

      ex.sm_tick(
        mx, my,
        mouseX, mouseY, mouseDown ? 1 : 0,
        edgeDash ? 1 : 0, edgePower ? 1 : 0, edgeRet ? 1 : 0, edgeCam ? 1 : 0,
        dt,
      );
      edgeDash = edgePower = edgeRet = edgeCam = false;

      const fight = ex.sm_in_fight() !== 0;
      if (fight !== this.inFight) this.inFight = fight;

      // Present. Re-wrap the buffer each frame in case wasm memory grew.
      const ptr = ex.sm_frame_ptr();
      if (gl && blitter && canvasEl) {
        resizeGl();
        blitter.upload(new Uint8Array(ex.memory.buffer, ptr, W * H * 4));
        blitter.draw(canvasEl.width, canvasEl.height);
      } else if (ctx2d) {
        const view = new Uint8ClampedArray(ex.memory.buffer, ptr, W * H * 4);
        ctx2d.putImageData(new ImageData(view, W, H), 0, 0);
      }
    },

    toggleFullscreen(this: any): void {
      const el = this.$refs.stage as any;
      const doc = document as any;
      if (!el) return;
      if (this.fsSupported) {
        if (!(document.fullscreenElement || doc.webkitFullscreenElement)) {
          if (el.requestFullscreen) void el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } else if (document.exitFullscreen) {
          void document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      } else {
        // iOS Safari has no element Fullscreen API — fall back to a CSS cover.
        this.pseudoFs = !this.pseudoFs;
        this.isFullscreen = this.pseudoFs;
        document.body.style.overflow = this.pseudoFs ? 'hidden' : '';
      }
    },

    // ── Virtual joystick ──────────────────────────────────────────────────────
    joyStart(this: any, e: TouchEvent): void {
      e.preventDefault();
      const base = this.$refs.joyBase as HTMLElement;
      const rect = base.getBoundingClientRect();
      joyCx = rect.left + rect.width / 2;
      joyCy = rect.top + rect.height / 2;
      joyR = rect.width / 2;
      const tch = e.changedTouches[0];
      joyId = tch.identifier;
      this.joyActive = true;
      this.joyTo(tch.clientX, tch.clientY);
    },
    joyMove(this: any, e: TouchEvent): void {
      e.preventDefault();
      for (const tch of Array.from(e.changedTouches)) {
        if (tch.identifier === joyId) {
          this.joyTo(tch.clientX, tch.clientY);
          return;
        }
      }
    },
    joyEnd(this: any): void {
      this.joyActive = false;
      this.thumbX = 0;
      this.thumbY = 0;
      joyId = -1;
      joyVec.x = 0;
      joyVec.y = 0;
    },
    joyTo(this: any, cx: number, cy: number): void {
      let dx = cx - joyCx;
      let dy = cy - joyCy;
      const dist = Math.hypot(dx, dy);
      if (dist > joyR) {
        dx = (dx / dist) * joyR;
        dy = (dy / dist) * joyR;
      }
      this.thumbX = dx;
      this.thumbY = dy;
      joyVec.x = dx / joyR;
      joyVec.y = dy / joyR;
    },

    // ── Action buttons ────────────────────────────────────────────────────────
    dashBtn(this: any, e?: Event): void {
      e?.preventDefault();
      edgeDash = true;
    },
    powerBtn(this: any, e?: Event): void {
      e?.preventDefault();
      edgePower = true;
    },
    // Return to the loadout from a finished round (mobile equivalent of R).
    menuBtn(this: any, e?: Event): void {
      e?.preventDefault();
      edgeRet = true;
    },
  };
}

document.addEventListener('alpine:init', () => {
  window.Alpine?.data('spinGame', spinGame);
});

export {};
