// {{< ml/poincare-tree >}}: a complete tree laid out flat (level k on a circle
// of radius k, each subtree in its own slice of angle) and in the Poincaré disk
// (each child at hyperbolic distance `edge` from its parent: move the parent to
// the centre with a Möbius map, spread the children over the angles away from
// the grandparent, move back). Readouts: worst multiplicative distortion over
// all pairs, and how close the deepest node comes to the rim. partials/ml/poincare-node.html draws the first
// settings the same way for JS off. Config: data/ml/poincare-tree.yaml.

import { svgElement } from './plot';

type C = [number, number];
interface Node {
  path: number[];
  parent: number; // index, −1 for the root
  disk: C;
  flat: C;
}

const add = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const conj = (a: C): C => [a[0], -a[1]];
const div = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const abs2 = (a: C): number => a[0] * a[0] + a[1] * a[1];
const toCentre = (z: C, p: C): C => div(sub(z, p), sub([1, 0], mul(conj(p), z)));
const fromCentre = (z: C, p: C): C => div(add(z, p), add([1, 0], mul(conj(p), z)));

export function hyperbolicDistance(u: C, v: C): number {
  return Math.acosh(1 + (2 * abs2(sub(u, v))) / ((1 - abs2(u)) * (1 - abs2(v))));
}

export function buildTree(b: number, depth: number, edge: number): Node[] {
  const r = Math.tanh(edge / 2);
  const leaves = b ** depth;
  const turn = b ** (depth - 1) / 2 - 0.5; // rotates the flat layout so the root's child k sits at angle 2πk/b, as in the disk
  const nodes: Node[] = [{ path: [], parent: -1, disk: [0, 0], flat: [0, 0] }];
  const grow = (i: number): void => {
    const node = nodes[i];
    const level = node.path.length;
    if (level === depth) return;
    let base = 0;
    let slots = b;
    let offset = 0;
    if (node.parent >= 0) {
      const q = toCentre(nodes[node.parent].disk, node.disk);
      base = Math.atan2(q[1], q[0]);
      slots = b + 1;
      offset = 1;
    }
    for (let k = 0; k < b; k++) {
      const a = base + (2 * Math.PI * (k + offset)) / slots;
      const disk = fromCentre([r * Math.cos(a), r * Math.sin(a)], node.disk);
      const path = [...node.path, k];
      let idx = 0;
      path.forEach((c, j) => (idx += c * b ** (depth - 1 - j)));
      const span = b ** (depth - path.length);
      const ang = (2 * Math.PI * (idx + span / 2 - 0.5 - turn)) / leaves;
      const rad = path.length / depth;
      nodes.push({ path, parent: i, disk, flat: [rad * Math.cos(ang), rad * Math.sin(ang)] });
      grow(nodes.length - 1);
    }
  };
  grow(0);
  return nodes;
}

function treeDistance(a: number[], b: number[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.length + b.length - 2 * i;
}

export function initPoincareTree(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as { branching: number; depth: number; edge: number } | null;
  const flatSvg = root.querySelector<SVGSVGElement>('#mli-pt-flat');
  const diskSvg = root.querySelector<SVGSVGElement>('#mli-pt-disk');
  const depthIn = root.querySelector<HTMLInputElement>('#mli-pt-depth');
  const edgeIn = root.querySelector<HTMLInputElement>('#mli-pt-edge');
  const say = root.querySelector<HTMLElement>('#mli-pt-say');
  if (!config || !flatSvg || !diskSvg || !depthIn || !edgeIn || !say) return;
  const el = { flatSvg, diskSvg, depthIn, edgeIn, say };
  const S = 140;
  const O = 150;
  const px = ([x, y]: C): C => [O + S * x, O - S * y];
  const state = { b: config.branching, depth: config.depth, edge: config.edge, nodes: [] as Node[] };
  const out = (id: string, text: string): void => {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.textContent = text;
  };

  function arc(p: C, c: C): string {
    const [x1, y1] = px(p);
    const [x2, y2] = px(c);
    const det = p[0] * c[1] - p[1] * c[0];
    if (Math.abs(det) < 1e-9) return `M${x1} ${y1}L${x2} ${y2}`;
    const kP = (abs2(p) + 1) / 2;
    const kC = (abs2(c) + 1) / 2;
    const u: C = [(kP * c[1] - kC * p[1]) / det, (p[0] * kC - c[0] * kP) / det];
    const R = Math.sqrt(Math.max(0, abs2(u) - 1));
    const cross = (p[0] - u[0]) * (c[1] - u[1]) - (p[1] - u[1]) * (c[0] - u[0]);
    return `M${x1} ${y1}A${S * R} ${S * R} 0 0 ${cross > 0 ? 0 : 1} ${x2} ${y2}`;
  }

  function draw(svg: SVGSVGElement, which: 'flat' | 'disk'): void {
    const edges = svg.querySelector('.mli-pt-edges');
    const dots = svg.querySelector('.mli-pt-dots');
    if (!edges || !dots) return;
    const { nodes, depth } = state;
    edges.replaceChildren(
      ...nodes.slice(1).map((n) => {
        const p = nodes[n.parent][which];
        if (which === 'disk') return svgElement('path', { d: arc(p, n.disk) });
        const [x1, y1] = px(p);
        const [x2, y2] = px(n.flat);
        return svgElement('line', { x1, y1, x2, y2 });
      }),
    );
    dots.replaceChildren(
      ...nodes.map((n, i) => {
        const [cx, cy] = px(n[which]);
        const dot = svgElement('circle', { cx, cy, r: i === 0 ? 4 : n.path.length === depth ? 2.2 : 3 });
        if (i === 0) dot.classList.add('is-root');
        return dot;
      }),
    );
  }

  function measure(): void {
    const { nodes, edge } = state;
    let fMin = Infinity;
    let fMax = 0;
    let dMin = Infinity;
    let dMax = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const t = treeDistance(nodes[i].path, nodes[j].path);
        const f = Math.hypot(...sub(nodes[i].flat, nodes[j].flat)) / t;
        const h = hyperbolicDistance(nodes[i].disk, nodes[j].disk) / (edge * t);
        if (f < fMin) fMin = f;
        if (f > fMax) fMax = f;
        if (h < dMin) dMin = h;
        if (h > dMax) dMax = h;
      }
    }
    const gap = Math.min(...nodes.map((n) => 1 - Math.sqrt(abs2(n.disk))));
    out('mli-pt-flat-d', `${(fMax / fMin).toFixed(fMax / fMin < 10 ? 2 : 1)}×`);
    out('mli-pt-disk-d', `${(dMax / dMin).toFixed(2)}×`);
    const [mant, exp] = gap.toExponential(1).split('e');
    out('mli-pt-gap', Number(exp) >= -2 ? gap.toFixed(3) : `${mant} × 10${superscript(exp.replace('-', '−'))}`);
  }

  function superscript(s: string): string {
    const map: Record<string, string> = { '−': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return Array.from(s, (ch) => map[ch] ?? ch).join('');
  }

  function describe(): void {
    el.say.textContent = `${state.nodes.length} nodes: ${state.b} children per node, ${state.depth} level${state.depth === 1 ? '' : 's'} below the root, edges ${state.edge.toFixed(1)} long in the disk.`;
  }

  function rebuild(): void {
    state.nodes = buildTree(state.b, state.depth, state.edge);
    draw(el.flatSvg, 'flat');
    draw(el.diskSvg, 'disk');
    measure();
    describe();
  }

  const bButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-b]'));
  bButtons.forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.b = Number(button.dataset.b);
      el.depthIn.max = state.b === 3 ? '5' : '6';
      if (state.depth > Number(el.depthIn.max)) state.depth = Number(el.depthIn.max);
      el.depthIn.value = String(state.depth);
      out('mli-pt-depth-out', String(state.depth));
      bButtons.forEach((b) => {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      });
      rebuild();
    });
  });
  el.depthIn.disabled = false;
  el.depthIn.addEventListener('input', () => {
    state.depth = Number(el.depthIn.value);
    out('mli-pt-depth-out', el.depthIn.value);
    rebuild();
  });
  el.edgeIn.disabled = false;
  el.edgeIn.addEventListener('input', () => {
    state.edge = Number(el.edgeIn.value);
    out('mli-pt-edge-out', state.edge.toFixed(1));
    rebuild();
  });
  for (const id of ['mli-pt-controls', 'mli-pt-read']) {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.hidden = false;
  }
  rebuild();
}
