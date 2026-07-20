// main.ts — Verdant web entry point (portfolio embed).
//
// Verdant is an Odin module compiled to js_wasm32 that renders a stylized-grass
// diorama with WebGL2. Odin's own runtime glue (assets/vendor/odin.js) is loaded
// first as a classic script and exposes `window.odin`; here we replicate its
// runWasm driver so we can capture the wasm exports and drive the in-page
// control panel via set_param().
//
// Ported from the standalone web/index.html in the Verdant repo. Differences:
//   • the wasm + sprite URLs arrive fingerprinted via data-attributes,
//   • the control panel lives inside the project page's stage (not fixed to the
//     viewport), and
//   • keyboard input is only captured while the pointer is over the stage, so the
//     scene never hijacks page scrolling.

// ── Ambient types for Odin's runtime glue (window.odin) ──────────────────────
interface OdinWmi {
  memory: WebAssembly.Memory;
  setIntSize(n: number): void;
  setExports(ex: WebAssembly.Exports): void;
  setMemory(mem: WebAssembly.Memory): void;
}

interface VerdantExports {
  memory?: WebAssembly.Memory;
  _start(): void;
  default_context_ptr(): number;
  step(dt: number, ctx: number): number;
  set_param(id: number, v: number): void;
  set_input(dx: number, dz: number): void;
  trigger(which: number): void;
}

declare global {
  interface Window {
    odin: {
      WasmMemoryInterface: new () => OdinWmi;
      setupDefaultImports: (
        wmi: OdinWmi,
        consoleEl: HTMLElement | null,
        memory: WebAssembly.Memory,
      ) => Record<string, unknown>;
    };
    VERDANT?: VerdantExports;
  }
}

// ── Control-panel layout ─────────────────────────────────────────────────────
// [id, label, min, max, step, default, format, scrub?] — ids match set_param()
// in src/game/game.odin. Scrubbing a `scrub` control auto-pauses the cycle.
type Ctl = [number, string, number, number, number, number, (v: number) => string, boolean?];
interface Group {
  name: string;
  open?: boolean;
  items: Ctl[];
}

const GROUPS: Group[] = [
  {
    name: "Time & Cycle",
    open: true,
    items: [
      [7, "Time of day", 0, 1, 0.005, 0.3, (v) => v.toFixed(2), true],
      [6, "Cycle length (s)", 20, 480, 10, 240, (v) => v.toFixed(0)],
    ],
  },
  {
    name: "Grass & Wind",
    items: [
      [9, "Grass length", 0.2, 2.0, 0.01, 0.85, (v) => v.toFixed(2)],
      [0, "Wind sway", 0, 1.0, 0.01, 0.35, (v) => v.toFixed(2)],
      [1, "Wind speed", 0, 0.5, 0.01, 0.13, (v) => v.toFixed(2)],
    ],
  },
  {
    name: "Water",
    items: [
      [11, "Wave height", 0, 0.2, 0.005, 0.055, (v) => v.toFixed(3)],
      [12, "Wave speed", 0, 3.0, 0.05, 1.1, (v) => v.toFixed(2)],
      [13, "Surface foam", 0, 1.0, 0.01, 0.75, (v) => v.toFixed(2)],
      [14, "Shore foam width", 0, 3.0, 0.05, 1.3, (v) => v.toFixed(2)],
      [15, "Water glint", 0, 3.0, 0.05, 0.85, (v) => v.toFixed(2)],
      [16, "Refraction", 0, 1.0, 0.01, 0.6, (v) => v.toFixed(2)],
    ],
  },
  {
    name: "Fireflies & Look",
    items: [
      [2, "Firefly glow", 0, 1.5, 0.01, 0.55, (v) => v.toFixed(2)],
      [3, "Firefly radius", 0.5, 4.0, 0.05, 1.7, (v) => v.toFixed(2)],
      [4, "Bloom strength", 0, 2.0, 0.01, 0.85, (v) => v.toFixed(2)],
      [5, "Toon bands", 1, 6, 1, 3, (v) => v.toFixed(0)],
    ],
  },
  {
    name: "Character",
    items: [[10, "Sword depth", 0, 20, 0.05, 1.2, (v) => v.toFixed(2)]],
  },
  {
    name: "Debug",
    items: [[17, "Tile debug", 0, 1, 1, 1, (v) => v.toFixed(0)]],
  },
];

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot(root: HTMLElement): Promise<void> {
  const canvas = document.getElementById("verdant-canvas") as HTMLCanvasElement | null;
  const stage = root.querySelector<HTMLElement>("[data-stage]");
  const panel = root.querySelector<HTMLElement>("[data-panel]");
  const panelBody = root.querySelector<HTMLElement>("[data-panel-body]");
  const panelToggle = root.querySelector<HTMLElement>("[data-panel-toggle]");
  const logEl = root.querySelector<HTMLElement>("[data-log]");
  const loadingEl = root.querySelector<HTMLElement>("[data-loading]");
  const fsBtn = root.querySelector<HTMLElement>("[data-fs]");
  if (!canvas || !stage || !panelBody || !logEl) {
    throw new Error("Verdant: required stage elements missing");
  }

  const wasmUrl = root.dataset.wasmUrl;
  if (!wasmUrl) throw new Error("Verdant: data-wasm-url missing");
  const spriteUrls = JSON.parse(root.dataset.sprites ?? "[]") as string[];

  // Size the WebGL backing store to the element (devicePixelRatio-aware).
  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", () => window.requestAnimationFrame(resize));
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Preload the sprite sheets (index order matches world/character.odin).
  const sprites = await Promise.all(
    spriteUrls.map(
      (u) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => rej(new Error("failed to load " + u));
          img.src = u;
        }),
    ),
  );

  // Custom loader (mirrors odin.js runWasm) so we can capture the wasm exports.
  const wmi = new window.odin.WasmMemoryInterface();
  wmi.setIntSize(4);
  const imports = window.odin.setupDefaultImports(wmi, logEl, wmi.memory);
  // env_sprites: upload a preloaded image into the currently-bound GL texture
  // (same webgl2 context the wasm module uses).
  imports["env_sprites"] = {
    sprite_upload: (index: number): void => {
      const g = canvas.getContext("webgl2");
      if (!g) return;
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, sprites[index]);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
    },
  };

  const resp = await fetch(wasmUrl);
  const { instance } = await WebAssembly.instantiate(
    await resp.arrayBuffer(),
    imports as unknown as WebAssembly.Imports,
  );
  const ex = instance.exports as unknown as VerdantExports;
  wmi.setExports(instance.exports);
  if (ex.memory) wmi.setMemory(ex.memory);
  ex._start();
  window.VERDANT = ex;

  // ── Input: keyboard → character, only while the pointer is over the stage so
  // the page can still scroll normally elsewhere. ──
  const keys = { up: false, down: false, left: false, right: false };
  const KMAP: Record<string, keyof typeof keys> = {
    KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  };
  const pushInput = (): void =>
    ex.set_input((keys.right ? 1 : 0) - (keys.left ? 1 : 0), (keys.up ? 1 : 0) - (keys.down ? 1 : 0));

  let active = false;
  let spaceDown = false;
  let shiftDown = false;
  const releaseAll = (): void => {
    keys.up = keys.down = keys.left = keys.right = false;
    spaceDown = shiftDown = false;
    pushInput();
  };
  stage.addEventListener("pointerenter", () => (active = true));
  stage.addEventListener("pointerleave", () => {
    active = false;
    releaseAll();
  });

  window.addEventListener("keydown", (e) => {
    if (!active) return;
    const k = KMAP[e.code];
    if (k) {
      keys[k] = true;
      pushInput();
      if (e.code.startsWith("Arrow")) e.preventDefault();
    } else if (e.code === "Space") {
      if (!spaceDown) {
        spaceDown = true;
        ex.trigger(0);
      }
      e.preventDefault();
    } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (!shiftDown) {
        shiftDown = true;
        ex.trigger(1);
      }
    } else if (e.code === "KeyF") {
      toggleFullscreen();
    }
  });
  window.addEventListener("keyup", (e) => {
    const k = KMAP[e.code];
    if (k) {
      keys[k] = false;
      pushInput();
    } else if (e.code === "Space") {
      spaceDown = false;
    } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      shiftDown = false;
    }
  });

  // ── Control panel ──
  const setParam = (id: number, v: number): void => ex.set_param(id, v);
  let pauseBox: HTMLInputElement | null = null;

  const makeRow = ([id, label, min, max, step, def, fmt, scrub]: Ctl): HTMLElement => {
    const row = document.createElement("div");
    row.className = "row";
    const lab = document.createElement("label");
    const name = document.createElement("span");
    name.textContent = label;
    const val = document.createElement("span");
    val.className = "val";
    val.textContent = fmt(def);
    lab.append(name, val);
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(def);
    inp.addEventListener("input", () => {
      const v = parseFloat(inp.value);
      val.textContent = fmt(v);
      setParam(id, v);
      if (scrub && pauseBox) {
        pauseBox.checked = true;
        setParam(8, 1);
      }
    });
    row.append(lab, inp);
    return row;
  };

  let firstBody: HTMLElement | null = null;
  for (const g of GROUPS) {
    const grp = document.createElement("div");
    grp.className = "group" + (g.open ? "" : " collapsed");
    const h = document.createElement("div");
    h.className = "group-h";
    const gname = document.createElement("span");
    gname.textContent = g.name;
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "▾";
    h.append(gname, caret);
    h.addEventListener("click", () => grp.classList.toggle("collapsed"));
    const gb = document.createElement("div");
    gb.className = "group-b";
    for (const item of g.items) gb.appendChild(makeRow(item));
    grp.append(h, gb);
    panelBody.appendChild(grp);
    if (!firstBody) firstBody = gb;
  }
  if (firstBody) {
    const chk = document.createElement("label");
    chk.className = "chk";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.addEventListener("change", () => setParam(8, box.checked ? 1 : 0));
    const ptxt = document.createElement("span");
    ptxt.textContent = "Pause time";
    chk.append(box, ptxt);
    firstBody.appendChild(chk);
    pauseBox = box;
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent =
      "Drag “Time of day” to jump to dawn/noon/dusk/night (auto-pauses). Uncheck Pause to resume the cycle.";
    firstBody.appendChild(hint);
  }

  if (panelToggle && panel) {
    panelToggle.addEventListener("click", () => panel.classList.toggle("collapsed"));
  }

  // ── Fullscreen ──
  function toggleFullscreen(): void {
    const el = stage as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
    const isFs = document.fullscreenElement === el || doc.webkitFullscreenElement === el;
    if (isFs) {
      if (document.exitFullscreen) void document.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } else if (el.requestFullscreen) {
      void el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  }
  if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);

  // ── Frame loop ──
  const ctx = ex.default_context_ptr();
  let prev: number | undefined;
  const frame = (ts: number): void => {
    if (prev === undefined) prev = ts;
    const dt = (ts - prev) * 0.001;
    prev = ts;
    if (ex.step(dt, ctx)) window.requestAnimationFrame(frame);
  };

  if (loadingEl) loadingEl.style.display = "none";
  window.requestAnimationFrame(frame);
}

// ── Entry ──
const root = document.querySelector<HTMLElement>("[data-verdant]");
if (root) {
  window.addEventListener("load", () => {
    boot(root).catch((e: unknown) => {
      console.error(e);
      const logEl = root.querySelector<HTMLElement>("[data-log]");
      const loadingEl = root.querySelector<HTMLElement>("[data-loading]");
      const fallback = root.querySelector<HTMLElement>("[data-fallback]");
      if (logEl) logEl.textContent = "Failed to start: " + String(e);
      if (loadingEl) loadingEl.style.display = "none";
      if (fallback) {
        fallback.classList.remove("hidden");
        fallback.style.display = "grid";
      }
    });
  });
}

export {};
