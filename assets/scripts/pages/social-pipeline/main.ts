// /misc/social-pipeline/: draws data/social-pipeline.yaml as an SVG and plays
// its steps on a loop. Packets travel the step's edges, then the step's nodes
// light. Two layouts of the same graph: `wide`, and `tall` under 600px of
// figure width. "Not live yet" plays the held branch instead of the sends.
// Reduced motion: no autoplay and no travel; the arrows still step.
// Below the drawing, the real queue from /social/queue.json.
export {};

type Pt = [number, number];
type Layout = "wide" | "tall";
interface Zone { id: string; label: string; sub: string; wide: number[]; tall: number[] }
interface Node { id: string; label: string; sub: string; wide: Pt; tall: Pt }
interface Edge { from: string; to: string; label?: string; held?: boolean; loop?: Record<Layout, string> }
interface Step { go: string[]; light: string[]; text: string; held?: boolean; live?: boolean }
interface Graph { zones: Zone[]; nodes: Node[]; edges: Edge[]; steps: Step[] }
interface QItem { id: string; date: string; title: string; url: string }

const NS = "http://www.w3.org/2000/svg";
const VIEW: Record<Layout, [number, number]> = { wide: [1000, 480], tall: [360, 960] };
const BOX: Record<Layout, [number, number]> = { wide: [144, 56], tall: [136, 54] };
const TRAVEL_MS = 1100;
const STEP_MS = 2900;
// Read now: document.currentScript is gone once the queue fetch awaits.
const QUEUE_SRC = (document.currentScript as HTMLScriptElement | null)?.dataset.queue || "/social/queue.json";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
};

// Path between two node boxes: leave and enter on the facing sides, as a
// smooth S. A loop edge leaves and re-enters on the same named side.
function edgePath(a: Pt, b: Pt, box: [number, number], loop?: string): string {
  const [hw, hh] = [box[0] / 2, box[1] / 2];
  if (loop === "top") {
    const y = a[1] - hh, lift = 70;
    return `M${a[0]} ${y} C${a[0]} ${y - lift}, ${b[0]} ${y - lift}, ${b[0]} ${y}`;
  }
  if (loop === "left") {
    const x = a[0] - hw, push = 22;
    return `M${x} ${a[1] - 8} C${x - push} ${a[1] - 8}, ${x - push} ${b[1] + 8}, ${x} ${b[1] + 8}`;
  }
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    const x1 = a[0] + s * hw, x2 = b[0] - s * hw, mid = (x2 - x1) / 2;
    return `M${x1} ${a[1]} C${x1 + mid} ${a[1]}, ${x2 - mid} ${b[1]}, ${x2} ${b[1]}`;
  }
  const s = Math.sign(dy) || 1;
  const y1 = a[1] + s * hh, y2 = b[1] - s * hh, mid = (y2 - y1) / 2;
  return `M${a[0]} ${y1} C${a[0]} ${y1 + mid}, ${b[0]} ${y2 - mid}, ${b[0]} ${y2}`;
}

function init(root: HTMLElement): void {
  const data = root.querySelector<HTMLScriptElement>("[data-sp-graph]");
  const stage = root.querySelector<HTMLElement>("[data-sp-stage]");
  const caption = root.querySelector<HTMLElement>("[data-sp-caption]");
  const list = root.querySelector<HTMLElement>("[data-sp-steps]");
  if (!data || !stage || !caption || !list) return;
  const g: Graph = JSON.parse(data.textContent || "{}");
  const nodeById = new Map(g.nodes.map((n) => [n.id, n]));
  const key = (e: Edge) => `${e.from}>${e.to}`;

  root.classList.add("is-js");
  root.querySelector<HTMLElement>(".sp-bar")!.hidden = false;
  caption.hidden = false;

  let layout: Layout = "wide";
  let svg: SVGSVGElement | null = null;
  const nodeEls = new Map<string, SVGGElement>();
  const edgeEls = new Map<string, SVGPathElement>();
  let packets: SVGGElement | null = null;

  let mode: "live" | "held" = "live";
  let playing = !reduce.matches;
  let at = 0;                     // index into the current mode's step list
  let timer = 0, raf = 0;

  const steps = () => g.steps.map((s, i) => ({ s, i })).filter(({ s }) => (mode === "held" ? !s.live : !s.held));

  function draw(): void {
    stage!.textContent = "";
    nodeEls.clear(); edgeEls.clear();
    const [vw, vh] = VIEW[layout];
    const box = BOX[layout];
    svg = el("svg", { viewBox: `0 0 ${vw} ${vh}`, class: `sp-svg sp-${layout}`, role: "img",
      "aria-label": "The posting pipeline: article, queue, build, site, Worker, live check, then dev.to and an email that becomes a LinkedIn post." });
    const defs = el("defs", {}, svg);
    for (const [id, cls] of [["sp-arrow", "sp-head"], ["sp-arrow-on", "sp-head is-on"], ["sp-arrow-held", "sp-head is-held"]]) {
      const m = el("marker", { id: `${id}-${layout}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0 1 L9 5 L0 9 z", class: cls }, m);
    }
    for (const z of g.zones) {
      const [x, y, w, h] = z[layout];
      const gz = el("g", { class: `sp-zone sp-zone-${z.id}` }, svg);
      el("rect", { x, y, width: w, height: h, rx: 16 }, gz);
      // Tall: label and note share one line, since the boxes start close under it.
      const tall = layout === "tall";
      el("text", { x: x + 16, y: y + (tall ? 22 : 24), class: "sp-zone-label" }, gz).textContent = z.label;
      el("text", tall ? { x: x + w - 16, y: y + 22, "text-anchor": "end", class: "sp-zone-sub" } : { x: x + 16, y: y + 39, class: "sp-zone-sub" }, gz).textContent = z.sub;
    }
    const edgeLayer = el("g", { class: "sp-edges" }, svg);
    for (const e of g.edges) {
      const a = nodeById.get(e.from)![layout], b = nodeById.get(e.to)![layout];
      const p = el("path", { d: edgePath(a, b, box, e.loop?.[layout]), class: `sp-edge${e.held ? " is-held-edge" : ""}`,
        "marker-end": `url(#sp-arrow-${layout})` }, edgeLayer);
      edgeEls.set(key(e), p);
      if (e.label) {
        const len = p.getTotalLength();
        const m = p.getPointAtLength(len / 2);
        const t = el("text", { x: m.x, y: m.y - 7, class: `sp-edge-label${e.held ? " is-held-edge" : ""}`, "text-anchor": "middle" }, edgeLayer);
        t.textContent = e.label;
        if (layout === "tall" && !e.loop && Math.abs(a[0] - b[0]) < 1) { t.setAttribute("x", String(m.x + 8)); t.setAttribute("y", String(m.y + 4)); t.setAttribute("text-anchor", "start"); }
        if (e.loop?.[layout] === "left") { t.setAttribute("x", String(m.x + 6)); t.setAttribute("text-anchor", "start"); }
      }
    }
    for (const n of g.nodes) {
      const [cx, cy] = n[layout];
      const gn = el("g", { class: "sp-node", "data-id": n.id }, svg);
      el("rect", { x: cx - box[0] / 2, y: cy - box[1] / 2, width: box[0], height: box[1], rx: 12 }, gn);
      el("text", { x: cx, y: cy - 3, class: "sp-node-label", "text-anchor": "middle" }, gn).textContent = n.label;
      el("text", { x: cx, y: cy + 14, class: "sp-node-sub", "text-anchor": "middle" }, gn).textContent = n.sub;
      nodeEls.set(n.id, gn);
    }
    packets = el("g", { class: "sp-packets" }, svg);
    stage!.appendChild(svg);
  }

  function show(animate: boolean): void {
    cancelAnimationFrame(raf);
    const list_ = steps();
    at = ((at % list_.length) + list_.length) % list_.length;
    const { s, i } = list_[at];
    const held = !!s.held;
    // Everything already passed in this run stays faintly lit, so the path so far reads.
    const done = new Set<string>(), doneEdges = new Set<string>();
    list_.slice(0, at).forEach(({ s: p }) => { p.light.forEach((n) => done.add(n)); p.go.forEach((e) => doneEdges.add(e)); });
    for (const [id, n] of nodeEls) {
      n.classList.toggle("is-done", done.has(id));
      n.classList.remove("is-on", "is-held");
    }
    for (const [k, p] of edgeEls) {
      const on = s.go.includes(k);
      p.classList.toggle("is-on", on && !held);
      p.classList.toggle("is-held", on && held);
      p.classList.toggle("is-done", doneEdges.has(k) && !on);
      p.setAttribute("marker-end", `url(#${on ? (held ? "sp-arrow-held" : "sp-arrow-on") : "sp-arrow"}-${layout})`);
    }
    caption!.textContent = s.text;
    caption!.classList.toggle("is-held", held);
    list!.querySelectorAll<HTMLElement>(".sp-step").forEach((li) => {
      const n = Number(li.dataset.i);
      const pos = list_.findIndex((x) => x.i === n);
      li.classList.toggle("is-current", n === i);
      li.classList.toggle("is-skipped", pos < 0);
      // Number the dots within this run, so neither run shows a gap.
      const num = li.querySelector(".sp-num");
      if (num && pos >= 0) num.textContent = String(pos + 1);
    });
    const light = () => s.light.forEach((id) => nodeEls.get(id)?.classList.add(held ? "is-held" : "is-on"));
    packets!.textContent = "";
    if (!animate || reduce.matches) { light(); return; }
    const runs = s.go.map((k) => edgeEls.get(k)).filter((p): p is SVGPathElement => !!p).map((p) => {
      const dot = el("g", { class: `sp-packet${held ? " is-held" : ""}` }, packets!);
      el("circle", { r: 11, class: "sp-packet-halo" }, dot);
      el("circle", { r: 5.5 }, dot);
      return { p, dot, len: p.getTotalLength() };
    });
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / TRAVEL_MS);
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      for (const r of runs) {
        const pt = r.p.getPointAtLength(r.len * e);
        r.dot.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        r.dot.style.opacity = String(t > .9 ? (1 - t) * 10 : 1);
      }
      if (t < 1) raf = requestAnimationFrame(tick); else light();
    };
    raf = requestAnimationFrame(tick);
  }

  function schedule(): void {
    clearTimeout(timer);
    if (!playing) return;
    timer = window.setTimeout(() => { at += 1; show(true); schedule(); }, at === steps().length - 1 ? STEP_MS + 1400 : STEP_MS);
  }

  const playBtn = root.querySelector<HTMLButtonElement>("[data-sp-play]")!;
  const setPlaying = (p: boolean) => {
    playing = p;
    playBtn.textContent = p ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", p ? "Pause" : "Play");
    schedule();
  };
  playBtn.addEventListener("click", () => { setPlaying(!playing); if (playing) { at += 1; show(true); } });
  root.querySelector("[data-sp-prev]")!.addEventListener("click", () => { setPlaying(false); at -= 1; show(true); });
  root.querySelector("[data-sp-next]")!.addEventListener("click", () => { setPlaying(false); at += 1; show(true); });
  root.querySelectorAll<HTMLButtonElement>("[data-sp-mode]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.spMode === "held" ? "held" : "live";
    root.querySelectorAll<HTMLButtonElement>("[data-sp-mode]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    root.classList.toggle("is-held-mode", mode === "held");
    at = 0; show(true); schedule();
  }));
  list.querySelectorAll<HTMLElement>(".sp-step").forEach((li) => {
    const btn = li.querySelector("button")!;
    btn.tabIndex = 0;
    btn.setAttribute("aria-label", `Step ${Number(li.dataset.i) + 1}: ${li.querySelector(".sp-text")?.textContent ?? ""}`);
    btn.addEventListener("click", () => {
      const idx = steps().findIndex((x) => x.i === Number(li.dataset.i));
      if (idx < 0) return;
      setPlaying(false); at = idx; show(true);
    });
  });

  const pick = (): Layout => (root.clientWidth < 600 ? "tall" : "wide");
  layout = pick(); draw(); show(true); schedule();
  new ResizeObserver(() => { const l = pick(); if (l !== layout) { layout = l; draw(); show(false); } }).observe(root);

  // Off screen, stop; back on screen, carry on (if it was playing).
  let wanted = playing;
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { wanted = playing; clearTimeout(timer); cancelAnimationFrame(raf); }
    else if (wanted) schedule();
  }).observe(root);

  loadQueue(root);
}

// The real queue, so the page shows what's actually lined up.
async function loadQueue(root: HTMLElement): Promise<void> {
  const box = root.querySelector<HTMLElement>("[data-sp-queue]");
  const ol = root.querySelector<HTMLElement>("[data-sp-q]");
  const src = QUEUE_SRC;
  if (!box || !ol) return;
  try {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) return;
    const items: QItem[] = (await res.json()).items || [];
    if (!items.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const nextIdx = items.findIndex((it) => it.date >= today);
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    items.forEach((it, i) => {
      const li = document.createElement("li");
      const state = it.date < today ? "is-past" : i === nextIdx ? "is-next" : "";
      li.className = `sp-q-item ${state}`;
      const a = document.createElement("a");
      a.href = it.url;
      const d = document.createElement("span");
      d.className = "sp-q-date";
      d.textContent = (it.date === today ? "Today · " : i === nextIdx ? "Next · " : "") + fmt.format(new Date(`${it.date}T12:00:00Z`));
      const t = document.createElement("span");
      t.className = "sp-q-title";
      t.textContent = it.title;
      a.append(d, t);
      li.appendChild(a);
      ol.appendChild(li);
    });
    box.hidden = false;
    const next = ol.children[Math.max(0, nextIdx)] as HTMLElement | undefined;
    if (next) ol.scrollLeft = Math.max(0, next.offsetLeft - ol.offsetLeft - 8);
  } catch { /* the drawing stands on its own */ }
}

document.querySelectorAll<HTMLElement>("[data-sp]").forEach(init);
