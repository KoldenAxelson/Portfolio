// The PyTorch families (Chapter 8), each one drawing whose parts a state shows,
// hides or tones:
//
// graph-backward: y = w * x + b as a tiny compute graph. The forward edges
// build y; the backward edges carry the gradients to the leaves that require
// grad, filling their .grad. The numbers are the scalar case of Chapter 8's
// stepper: w = 2, x = 3, b = 1 give y = 7, ∂y/∂w = x = 3 and ∂y/∂b = 1.
//
// device-move: a tensor copied from the CPU to a GPU with .to(), and the
// CPU memory a NumPy array and a tensor share through from_numpy and .numpy().
// The values match examples/ch08/numpy-bridge.py.
//
// partsFigure and its drawing helpers are shared with train.ts (Chapter 9).
import type { Figure } from '../def-figures';
import { attrs, centredLabel, cycleForever, figureCanvas, reduceMotion, svg } from '../figure-kit';

const WIDTH = 260;
const STEP_MS = 2400;
const TONES = ['lit', 'alt', 'bad', 'dim'] as const;

export interface PartState<P extends string> {
  show: P[];
  lit?: P[];
  alt?: P[];
  bad?: P[];
  dim?: P[];
  caption: string;
}

export interface Sequence<P extends string> { label: string; still: number; states: PartState<P>[] }

export const text = (x: number, y: number, content: string, modifier = ''): SVGTextElement =>
  centredLabel(x, y, `fig-tensor__text${modifier ? ` is-${modifier}` : ''}`, content);

export function rect(x: number, y: number, w: number, h: number, className: string, radius = 3): SVGRectElement {
  const box = svg('rect');
  attrs(box, { x, y, width: w, height: h, rx: radius });
  box.setAttribute('class', className);
  return box;
}

/** A straight line from (x1, y1) to (x2, y2) with an open arrowhead at the end. */
export function arrow(x1: number, y1: number, x2: number, y2: number, className: string): SVGElement[] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const back = (side: number): string => {
    const x = x2 - 5 * Math.cos(angle) + side * 3 * Math.sin(angle);
    const y = y2 - 5 * Math.sin(angle) - side * 3 * Math.cos(angle);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  return [`M ${x1} ${y1} L ${x2} ${y2}`, `M ${back(1)} L ${x2} ${y2} L ${back(-1)}`].map((d) => {
    const path = svg('path');
    attrs(path, { d, fill: 'none' });
    path.setAttribute('class', className);
    return path;
  });
}

/** Draws every part once, then steps through the sequence by toggling classes. */
export function partsFigure<P extends string>(
  order: readonly P[], parts: Record<P, SVGElement[]>, sequence: Sequence<P>, height: number,
): HTMLElement {
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig fig-py';
  const canvas = figureCanvas(WIDTH, height, 'fig-py__canvas fig-tensor', sequence.label);
  const caption = document.createElement('figcaption');
  caption.className = 'fig-py__caption';
  const captionCode = document.createElement('code');
  caption.appendChild(captionCode);

  const used = new Set(sequence.states.flatMap((state) => state.show));
  const groups = new Map<P, SVGGElement>();
  for (const name of order) {
    if (!used.has(name)) continue;
    const group = svg('g');
    group.setAttribute('class', 'fig-tensor__part');
    group.append(...parts[name]);
    canvas.appendChild(group);
    groups.set(name, group);
  }

  const paint = (index: number): void => {
    const state = sequence.states[index % sequence.states.length];
    if (!state) return;
    for (const [name, group] of groups) {
      group.classList.toggle('is-hidden', !state.show.includes(name));
      for (const tone of TONES) group.classList.toggle(`is-${tone}`, state[tone]?.includes(name) ?? false);
    }
    captionCode.textContent = state.caption;
    canvas.setAttribute('aria-label', `${sequence.label} ${state.caption}`);
  };

  paint(reduceMotion() ? sequence.still : 0);
  wrap.append(canvas, caption);
  if (!reduceMotion() && sequence.states.length > 1) cycleForever(canvas, STEP_MS, paint);
  return wrap;
}

/* ── graph-backward ─────────────────────────────────────────────────────── */

const GRAPH_H = 126;
const LEAF = { x: 8, w: 62, h: 28 };
const LEAF_Y = { w: 8, x: 48, b: 88 };
const MUL = { x: 116, y: 36 };
const ADD = { x: 170, y: 70 };
const OP_R = 10;
const OUT = { x: 198, y: 56, w: 56, h: 28 };
const DETACHED = { x: 150, y: 4, w: 104, h: 26 };
const BACK_OFFSET = 5;

const GRAPH_PARTS = [
  'leafW', 'leafX', 'leafB', 'gradWNone', 'gradW3', 'gradW6', 'gradBNone', 'gradB1', 'gradB2', 'gradX',
  'fwdW', 'fwdX', 'mul', 'mulValue', 'fwdMul', 'fwdB', 'add', 'fwdOut', 'out', 'gradFn', 'noGradFn',
  'backOut', 'backMul', 'backW', 'backB', 'detached',
] as const;
type GraphPart = (typeof GRAPH_PARTS)[number];

/** The point on a circle round (cx, cy) that faces (x, y). */
function rim(cx: number, cy: number, x: number, y: number): [number, number] {
  const angle = Math.atan2(y - cy, x - cx);
  return [cx + OP_R * Math.cos(angle), cy + OP_R * Math.sin(angle)];
}

/** A forward edge and its backward twin, drawn a few pixels to one side and pointing the other way. */
function edgePair(from: [number, number], to: [number, number]): { forward: SVGElement[]; backward: SVGElement[] } {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const nx = ((y2 - y1) / length) * BACK_OFFSET;
  const ny = (-(x2 - x1) / length) * BACK_OFFSET;
  return {
    forward: arrow(x1, y1, x2, y2, 'fig-tensor__edge'),
    backward: arrow(x2 + nx, y2 + ny, x1 + nx, y1 + ny, 'fig-tensor__edge is-back'),
  };
}

function leaf(name: string, value: string, y: number): SVGElement[] {
  return [rect(LEAF.x, y, LEAF.w, LEAF.h, 'fig-tensor__box'), text(LEAF.x + LEAF.w / 2, y + 9, `${name} = ${value}`, 'code')];
}

const gradText = (y: number, content: string): SVGElement[] => [text(LEAF.x + LEAF.w / 2, y + 20, content, 'grad')];

function drawGraph(): Record<GraphPart, SVGElement[]> {
  const leafRight = LEAF.x + LEAF.w;
  const middle = (y: number): number => y + LEAF.h / 2;
  const w = edgePair([leafRight, middle(LEAF_Y.w)], rim(MUL.x, MUL.y, leafRight, middle(LEAF_Y.w)));
  const x = edgePair([leafRight, middle(LEAF_Y.x)], rim(MUL.x, MUL.y, leafRight, middle(LEAF_Y.x)));
  const mul = edgePair(rim(MUL.x, MUL.y, ADD.x, ADD.y), rim(ADD.x, ADD.y, MUL.x, MUL.y));
  const b = edgePair([leafRight, middle(LEAF_Y.b)], rim(ADD.x, ADD.y, leafRight, middle(LEAF_Y.b)));
  const out = edgePair(rim(ADD.x, ADD.y, OUT.x, ADD.y), [OUT.x, ADD.y]);
  const op = (cx: number, cy: number, sign: string): SVGElement[] => {
    const circle = svg('circle');
    attrs(circle, { cx, cy, r: OP_R });
    circle.setAttribute('class', 'fig-tensor__op');
    return [circle, text(cx, cy, sign, 'op')];
  };
  const outX = OUT.x + OUT.w / 2;
  return {
    leafW: leaf('w', '2.', LEAF_Y.w),
    leafX: leaf('x', '3.', LEAF_Y.x),
    leafB: leaf('b', '1.', LEAF_Y.b),
    gradWNone: gradText(LEAF_Y.w, 'grad None'),
    gradW3: gradText(LEAF_Y.w, 'grad 3.'),
    gradW6: gradText(LEAF_Y.w, 'grad 6.'),
    gradBNone: gradText(LEAF_Y.b, 'grad None'),
    gradB1: gradText(LEAF_Y.b, 'grad 1.'),
    gradB2: gradText(LEAF_Y.b, 'grad 2.'),
    gradX: gradText(LEAF_Y.x, 'grad None'),
    fwdW: w.forward,
    fwdX: x.forward,
    mul: op(MUL.x, MUL.y, '×'),
    mulValue: [text(MUL.x, MUL.y - OP_R - 7, '6.', 'code')],
    fwdMul: mul.forward,
    fwdB: b.forward,
    add: op(ADD.x, ADD.y, '+'),
    fwdOut: out.forward,
    out: [rect(OUT.x, OUT.y, OUT.w, OUT.h, 'fig-tensor__box'), text(outX, OUT.y + 9, 'y = 7.', 'code')],
    gradFn: [text(outX, OUT.y + 20, 'AddBackward0', 'grad')],
    noGradFn: [text(outX, OUT.y + 20, 'no grad_fn', 'grad')],
    backOut: out.backward,
    backMul: mul.backward,
    backW: w.backward,
    backB: b.backward,
    detached: [
      rect(DETACHED.x, DETACHED.y, DETACHED.w, DETACHED.h, 'fig-tensor__box'),
      text(DETACHED.x + DETACHED.w / 2, DETACHED.y + 8, 'w.detach() = 2.', 'code'),
      text(DETACHED.x + DETACHED.w / 2, DETACHED.y + 19, 'requires_grad False', 'grad'),
    ],
  };
}

const LEAVES: GraphPart[] = ['leafW', 'leafX', 'leafB', 'gradX'];
const FORWARD: GraphPart[] = [...LEAVES, 'fwdW', 'fwdX', 'mul', 'mulValue', 'fwdMul', 'fwdB', 'add', 'fwdOut', 'out'];
const FORWARD_EDGES: GraphPart[] = ['fwdW', 'fwdX', 'fwdMul', 'fwdB', 'fwdOut'];
const BACKWARD: GraphPart[] = ['backOut', 'backMul', 'backW', 'backB'];
const NO_GRADS: GraphPart[] = ['gradWNone', 'gradBNone'];
const FIRST_GRADS: GraphPart[] = ['gradW3', 'gradB1'];
const BUILT: GraphPart[] = [...FORWARD, 'gradFn', ...NO_GRADS];
const BACKED: GraphPart[] = [...FORWARD, 'gradFn', ...BACKWARD, ...FIRST_GRADS];

type GraphSequence = Sequence<GraphPart>;

const backwardSequence = (label: string): GraphSequence => ({ label, still: 1, states: [
  { show: BUILT, caption: 'y = w * x + b → 7.' },
  { show: BACKED, lit: [...BACKWARD, ...FIRST_GRADS], caption: 'y.backward(): w.grad → 3., b.grad → 1.' },
  { show: BACKED, lit: ['gradX'], dim: BACKWARD, caption: 'x.grad stays None: x doesn’t require grad' },
] });

const GRAPH_SEQUENCES: Record<string, () => GraphSequence> = {
  tensor: () => ({ label: 'Tensors in a compute graph.', still: 1, states: [
    { show: [...LEAVES, ...NO_GRADS], lit: ['leafW', 'leafX', 'leafB'], caption: 'w, x and b: tensors of shape ()' },
    { show: BUILT, lit: ['out'], caption: 'y = w * x + b is a tensor too: 7.' },
  ] }),
  'requires-grad': () => ({ label: 'requires_grad: the tensors autograd tracks.', still: 1, states: [
    { show: [...LEAVES, ...NO_GRADS], alt: ['leafW', 'leafB'], caption: 'requires_grad=True on w and b; x is plain data' },
    { show: BUILT, alt: ['leafW', 'leafB'], lit: ['gradFn'], caption: 'y records how it was made: grad_fn' },
  ] }),
  autograd: () => ({ label: 'Autograd: the graph recorded forward, the gradients sent back.', still: 3, states: [
    { show: [...LEAVES, ...NO_GRADS], alt: ['leafW', 'leafB'], caption: 'w and b require grad' },
    { show: [...LEAVES, ...NO_GRADS, 'fwdW', 'fwdX', 'mul', 'mulValue'], lit: ['fwdW', 'fwdX', 'mul', 'mulValue'],
      caption: 'w * x → 6., recorded' },
    { show: BUILT, lit: ['fwdMul', 'fwdB', 'add', 'fwdOut', 'out', 'gradFn'], caption: '+ b → y = 7., grad_fn AddBackward0' },
    { show: BACKED, lit: [...BACKWARD, ...FIRST_GRADS], caption: 'y.backward(): gradients flow back to w and b' },
  ] }),
  backward: () => backwardSequence('backward: gradients flow from y back to its leaves.'),
  backpropagation: () => backwardSequence('Backpropagation: from the output back to every weight.'),
  grad: () => ({ label: '.grad: where backward leaves a gradient.', still: 2, states: [
    { show: BUILT, lit: ['gradWNone'], caption: 'w.grad → None before backward' },
    { show: BACKED, lit: ['gradW3'], caption: 'y.backward(): w.grad → 3.' },
    { show: [...FORWARD, 'gradFn', ...BACKWARD, 'gradW6', 'gradB2'], bad: ['gradW6', 'gradB2'],
      caption: 'a new y, backward again: .grad adds up → 6.' },
    { show: BUILT, lit: NO_GRADS, caption: 'w.grad = None clears it for the next step' },
  ] }),
  gradient: () => ({ label: 'A gradient: how fast the output changes with each input.', still: 1, states: [
    { show: BUILT, caption: 'y = w * x + b, with w = 2. and x = 3.' },
    { show: BACKED, lit: ['backOut', 'backMul', 'backW', 'gradW3'], dim: ['backB', 'gradB1'],
      caption: '∂y/∂w = x = 3.: y grows 3 for each unit of w' },
  ] }),
  'no-grad': () => ({ label: 'torch.no_grad: compute without recording a graph.', still: 1, states: [
    { show: BUILT, lit: ['gradFn'], caption: 'y = w * x + b records a graph: grad_fn' },
    { show: [...FORWARD, ...NO_GRADS, 'noGradFn'], dim: FORWARD_EDGES, lit: ['noGradFn'],
      caption: 'inside with torch.no_grad(): the same 7., no graph' },
  ] }),
  detach: () => ({ label: 'detach: the same values, cut off from the graph.', still: 1, states: [
    { show: BUILT, lit: ['leafW', 'fwdW'], caption: 'w is part of y’s graph' },
    { show: [...BUILT, 'detached'], lit: ['detached'], dim: FORWARD_EDGES,
      caption: 'w.detach(): the same 2., outside the graph' },
  ] }),
};

export function graphBackward(figure: Figure): HTMLElement {
  const sequence = (GRAPH_SEQUENCES[figure.highlight ?? 'autograd'] ?? GRAPH_SEQUENCES.autograd!)();
  return partsFigure(GRAPH_PARTS, drawGraph(), sequence, GRAPH_H);
}

/* ── device-move ─────────────────────────────────────────────────────────── */

const DEVICE_H = 118;
const ZONE = { y: 6, w: 118, h: 106 };
const CPU_X = 6;
const GPU_X = 136;
const CHIP = { y: 56, cell: 20, h: 18 };
const CHIP_W = 3 * CHIP.cell;
const CPU_CX = CPU_X + ZONE.w / 2;
const GPU_CX = GPU_X + ZONE.w / 2;

const DEVICE_PARTS = [
  'cpuZone', 'gpuZone', 'cpuChip', 'cpuOnes', 'cpuZeros', 'cpuSeven', 'gpuChip', 'gpuOnes',
  'tagT', 'tagG', 'shareA', 'shareT', 'devCpu', 'devGpu', 'toGpu',
] as const;
type DevicePart = (typeof DEVICE_PARTS)[number];

function chip(cx: number): SVGElement[] {
  const left = cx - CHIP_W / 2;
  return [0, 1, 2].map((k) => rect(left + k * CHIP.cell, CHIP.y, CHIP.cell, CHIP.h, 'fig-tensor__cell'));
}

function chipValues(cx: number, values: string[]): SVGElement[] {
  const left = cx - CHIP_W / 2;
  return values.map((value, k) => text(left + (k + 0.5) * CHIP.cell, CHIP.y + CHIP.h / 2, value, 'code'));
}

/** A name above a chip, with a short line down to it. */
function nameTag(x: number, name: string): SVGElement[] {
  const line = svg('path');
  attrs(line, { d: `M ${x} ${CHIP.y - 12} L ${x} ${CHIP.y - 2}`, fill: 'none' });
  line.setAttribute('class', 'fig-tensor__edge');
  return [text(x, CHIP.y - 18, name, 'name'), line];
}

function drawDevices(): Record<DevicePart, SVGElement[]> {
  const zone = (x: number, name: string): SVGElement[] => [
    rect(x, ZONE.y, ZONE.w, ZONE.h, 'fig-tensor__zone'), text(x + ZONE.w / 2, ZONE.y + 12, name, 'zone'),
  ];
  const chipRight = CPU_CX + CHIP_W / 2 + 4;
  const chipLeft = GPU_CX - CHIP_W / 2 - 4;
  return {
    cpuZone: zone(CPU_X, 'CPU'),
    gpuZone: zone(GPU_X, 'GPU (cuda)'),
    cpuChip: chip(CPU_CX),
    cpuOnes: chipValues(CPU_CX, ['1.', '1.', '1.']),
    cpuZeros: chipValues(CPU_CX, ['0.', '0.', '0.']),
    cpuSeven: chipValues(CPU_CX, ['7.', '0.', '0.']),
    gpuChip: chip(GPU_CX),
    gpuOnes: chipValues(GPU_CX, ['1.', '1.', '1.']),
    tagT: nameTag(CPU_CX, 't'),
    tagG: nameTag(GPU_CX, 'g'),
    shareA: nameTag(CPU_CX - 16, 'a'),
    shareT: nameTag(CPU_CX + 16, 't'),
    devCpu: [text(CPU_CX, CHIP.y + CHIP.h + 12, 'device cpu', 'code')],
    devGpu: [text(GPU_CX, CHIP.y + CHIP.h + 12, 'device cuda:0', 'code')],
    toGpu: [...arrow(chipRight, CHIP.y + 4, chipLeft, CHIP.y + 4, 'fig-tensor__edge is-move'),
      text((chipRight + chipLeft) / 2, CHIP.y - 18, ".to('cuda')", 'code')],
  };
}

const ZONES: DevicePart[] = ['cpuZone', 'gpuZone'];
const ON_CPU: DevicePart[] = [...ZONES, 'cpuChip', 'cpuOnes', 'tagT', 'devCpu'];
const ON_BOTH: DevicePart[] = [...ON_CPU, 'toGpu', 'gpuChip', 'gpuOnes', 'tagG', 'devGpu'];
const SHARED: DevicePart[] = [...ZONES, 'cpuChip', 'shareA', 'shareT'];

type DeviceSequence = Sequence<DevicePart>;

const deviceSequence = (label: string): DeviceSequence => ({ label, still: 1, states: [
  { show: ON_CPU, lit: ['devCpu'], caption: 't = torch.ones(3): t.device is the CPU' },
  { show: ON_BOTH, lit: ['toGpu', 'gpuChip', 'devGpu'], caption: "g = t.to('cuda'): a copy on the GPU; t stays" },
] });

const DEVICE_SEQUENCES: Record<string, () => DeviceSequence> = {
  device: () => deviceSequence('device: where a tensor’s values live.'),
  gpu: () => deviceSequence('A GPU: a second place a tensor can live.'),
  to: () => ({ label: '.to(): a copy on another device, or in another dtype.', still: 1, states: [
    { show: ON_CPU, caption: 't = torch.ones(3), on the CPU' },
    { show: ON_BOTH, lit: ['toGpu', 'gpuChip'], caption: "g = t.to('cuda'): copied to the GPU" },
    { show: ON_CPU, lit: ['cpuChip'], caption: "t.to('cpu') is t → True: already there" },
  ] }),
  'from-numpy': () => ({ label: 'torch.from_numpy: a tensor on a NumPy array’s memory.', still: 2, states: [
    { show: [...ZONES, 'cpuChip', 'cpuZeros', 'shareA'], dim: ['gpuZone'], caption: 'a = np.zeros(3)' },
    { show: [...SHARED, 'cpuZeros'], dim: ['gpuZone'], lit: ['shareT'], caption: 't = torch.from_numpy(a): the same memory' },
    { show: [...SHARED, 'cpuSeven'], dim: ['gpuZone'], lit: ['cpuSeven'],
      caption: 'a[0] = 7 → t is tensor([7., 0., 0.], dtype=torch.float64)' },
  ] }),
  numpy: () => ({ label: '.numpy(): a NumPy array on a CPU tensor’s memory.', still: 2, states: [
    { show: [...ZONES, 'cpuChip', 'cpuZeros', 'shareT'], dim: ['gpuZone'], caption: 't = torch.zeros(3)' },
    { show: [...SHARED, 'cpuZeros'], dim: ['gpuZone'], lit: ['shareA'], caption: 'a = t.numpy(): the same memory' },
    { show: [...SHARED, 'cpuSeven'], dim: ['gpuZone'], lit: ['cpuSeven'],
      caption: 't[0] = 7 → a is array([7., 0., 0.], dtype=float32)' },
    { show: [...SHARED, 'cpuZeros'], dim: ['gpuZone', 'shareA'], bad: ['cpuChip'],
      caption: 'if t requires grad, t.numpy() raises: use t.detach().numpy()' },
  ] }),
};

export function deviceMove(figure: Figure): HTMLElement {
  const sequence = (DEVICE_SEQUENCES[figure.highlight ?? 'device'] ?? DEVICE_SEQUENCES.device!)();
  return partsFigure(DEVICE_PARTS, drawDevices(), sequence, DEVICE_H);
}
