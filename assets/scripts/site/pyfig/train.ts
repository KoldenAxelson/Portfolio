// train-loop (Chapter 9): the five steps of one training step as a ring,
// zero_grad → forward → loss → backward → step, round a model of three layers.
// A DataLoader (`loader`) beside it feeds the ring one batch per lap, and a model.pt file
// below it takes the model's state_dict. The shapes match Chapter 9's stepper
// (examples/ch09/train-loop.stepper.py): Linear(2, 4) → ReLU → Linear(4, 2),
// 16 rows in two batches of 8.
import type { Figure } from '../def-figures';
import type { Sequence } from './tensor';
import { arrow, partsFigure, rect, text } from './tensor';

const HEIGHT = 146;
const RING = { cx: 78, cy: 80, r: 52 };
const PILL = { w: 54, h: 16 };
const MODEL = { x: 57, y: 44, w: 42, h: 62 };
const LAYER = { x: 61, w: 34, h: 11 };
const LOADER = { x: 186, y: 24, w: 50, h: 72, gap: 4 };
const FILE = { x: 186, y: 116, w: 50, h: 24 };

const NODES = ['zeroGrad', 'forward', 'loss', 'backward', 'step'] as const;
type Node = (typeof NODES)[number];
const NODE_TEXT: Record<Node, string> = {
  zeroGrad: 'zero_grad', forward: 'forward', loss: 'loss', backward: 'backward', step: 'step',
};

const PARTS = [
  ...NODES, 'toForward', 'toLoss', 'toBackward', 'toStep', 'toZeroGrad',
  'model', 'layer1', 'relu', 'layer2', 'rows', 'loaderName', 'batch1', 'batch2', 'feed1', 'feed2',
  'epoch1', 'epoch2', 'file', 'save', 'load',
] as const;
type Part = (typeof PARTS)[number];

/** Where each step sits on the ring: zero_grad at the top, then clockwise. */
function nodeCentre(index: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / NODES.length;
  return [RING.cx + RING.r * Math.cos(angle), RING.cy + RING.r * Math.sin(angle)];
}

/** The point where the line from a pill's centre towards (x, y) leaves the pill. */
function pillEdge([cx, cy]: [number, number], [x, y]: [number, number]): [number, number] {
  const dx = x - cx;
  const dy = y - cy;
  const scale = Math.min((PILL.w / 2 + 2) / Math.abs(dx || 1e-9), (PILL.h / 2 + 2) / Math.abs(dy || 1e-9));
  return [cx + dx * scale, cy + dy * scale];
}

function ringArrow(from: number, to: number): SVGElement[] {
  const a = nodeCentre(from);
  const b = nodeCentre(to);
  const [x1, y1] = pillEdge(a, b);
  const [x2, y2] = pillEdge(b, a);
  return arrow(x1, y1, x2, y2, 'fig-tensor__edge');
}

function pill(index: number): SVGElement[] {
  const [cx, cy] = nodeCentre(index);
  const name = NODES[index] ?? 'step';
  return [rect(cx - PILL.w / 2, cy - PILL.h / 2, PILL.w, PILL.h, 'fig-tensor__box', PILL.h / 2), text(cx, cy, NODE_TEXT[name], 'code')];
}

const layer = (y: number, name: string): SVGElement[] =>
  [rect(LAYER.x, y, LAYER.w, LAYER.h, 'fig-tensor__cell'), text(LAYER.x + LAYER.w / 2, y + LAYER.h / 2, name)];

function drawLoop(): Record<Part, SVGElement[]> {
  const loaderMid = LOADER.x + LOADER.w / 2;
  const half = (LOADER.h - LOADER.gap) / 2;
  const batchY = [LOADER.y, LOADER.y + half + LOADER.gap];
  const [forwardX, forwardY] = nodeCentre(1);
  const forwardRight = forwardX + PILL.w / 2 + 2;
  const batch = (k: number): SVGElement[] => {
    const y = batchY[k] ?? LOADER.y;
    return [rect(LOADER.x, y, LOADER.w, half, 'fig-tensor__cell'), text(loaderMid, y + half / 2, `batch ${k + 1}`, 'code')];
  };
  const feed = (k: number): SVGElement[] =>
    arrow(LOADER.x - 2, (batchY[k] ?? LOADER.y) + half / 2, forwardRight, forwardY + (k === 0 ? -3 : 3), 'fig-tensor__edge is-move');
  const modelRight: [number, number] = [MODEL.x + MODEL.w + 2, MODEL.y + MODEL.h - 14];
  const fileLeft: [number, number] = [FILE.x - 2, FILE.y + FILE.h / 2];
  return {
    zeroGrad: pill(0), forward: pill(1), loss: pill(2), backward: pill(3), step: pill(4),
    toForward: ringArrow(0, 1), toLoss: ringArrow(1, 2), toBackward: ringArrow(2, 3),
    toStep: ringArrow(3, 4), toZeroGrad: ringArrow(4, 0),
    model: [rect(MODEL.x, MODEL.y, MODEL.w, MODEL.h, 'fig-tensor__box'), text(MODEL.x + MODEL.w / 2, MODEL.y + 8, 'model', 'name')],
    layer1: layer(MODEL.y + 17, 'Linear'),
    relu: layer(MODEL.y + 31, 'ReLU'),
    layer2: layer(MODEL.y + 45, 'Linear'),
    rows: [rect(LOADER.x, LOADER.y, LOADER.w, LOADER.h, 'fig-tensor__cell'), text(loaderMid, LOADER.y + LOADER.h / 2, '16 rows', 'code')],
    loaderName: [text(loaderMid, LOADER.y - 8, 'loader', 'code')],
    batch1: batch(0),
    batch2: batch(1),
    feed1: feed(0),
    feed2: feed(1),
    epoch1: [text(loaderMid, LOADER.y + LOADER.h + 9, 'epoch 1', 'code')],
    epoch2: [text(loaderMid, LOADER.y + LOADER.h + 9, 'epoch 2', 'code')],
    file: [rect(FILE.x, FILE.y, FILE.w, FILE.h, 'fig-tensor__box'), text(FILE.x + FILE.w / 2, FILE.y + FILE.h / 2, 'model.pt', 'code')],
    save: arrow(modelRight[0], modelRight[1], fileLeft[0], fileLeft[1] - 6, 'fig-tensor__edge is-move'),
    load: arrow(fileLeft[0], fileLeft[1], modelRight[0], modelRight[1] + 6, 'fig-tensor__edge is-back'),
  };
}

const ARROWS: Part[] = ['toForward', 'toLoss', 'toBackward', 'toStep', 'toZeroGrad'];
const MODEL_PARTS: Part[] = ['model', 'layer1', 'relu', 'layer2'];
const RING_PARTS: Part[] = [...NODES, ...ARROWS, ...MODEL_PARTS];
const BATCHES: Part[] = ['loaderName', 'batch1', 'batch2'];
const LOOP: Part[] = [...RING_PARTS, ...BATCHES, 'epoch1'];
const OTHER_NODES = (keep: Node[]): Part[] => NODES.filter((node) => !keep.includes(node));

type LoopSequence = Sequence<Part>;

const ringSequence = (label: string): LoopSequence => ({ label, still: 5, states: [
  { show: LOOP, lit: ['zeroGrad', 'batch1'], caption: 'optimizer.zero_grad(): clear the old gradients' },
  { show: [...LOOP, 'feed1'], lit: ['forward', 'toForward', 'feed1', 'batch1', ...MODEL_PARTS], caption: 'logits = model(xb): forward on batch 1' },
  { show: LOOP, lit: ['loss', 'toLoss', 'batch1'], caption: 'loss = loss_fn(logits, yb): one number' },
  { show: LOOP, lit: ['backward', 'toBackward', 'batch1'], caption: 'loss.backward(): a gradient for every weight' },
  { show: LOOP, lit: ['step', 'toStep', 'batch1'], caption: 'optimizer.step(): the weights move against their .grad' },
  { show: [...LOOP, 'feed2'], lit: [...NODES, ...ARROWS, 'batch2', 'feed2'], caption: 'batch 2: the same five steps again' },
] });

const stepSequence = (label: string, caption: string): LoopSequence => ({ label, still: 1, states: [
  { show: LOOP, lit: ['backward'], caption: 'loss.backward() fills every .grad' },
  { show: LOOP, lit: ['step', 'toStep', ...MODEL_PARTS], caption },
] });

const lossSequence = (label: string, caption: string): LoopSequence => ({ label, still: 1, states: [
  { show: LOOP, lit: ['forward', 'toForward'], caption: 'logits = model(xb)' },
  { show: LOOP, lit: ['loss', 'toLoss'], caption },
] });

const modeSequence = (label: string, still: number): LoopSequence => ({ label, still, states: [
  { show: LOOP, lit: [...NODES, ...ARROWS], caption: 'model.train(): training mode, dropout on' },
  { show: RING_PARTS, dim: [...OTHER_NODES(['forward']), ...ARROWS], lit: ['forward', ...MODEL_PARTS],
    caption: 'model.eval() and torch.no_grad(): forward only' },
] });

const fileSequence = (label: string, still: number): LoopSequence => ({ label, still, states: [
  { show: [...RING_PARTS, 'file'], lit: ['layer1', 'layer2'], dim: [...NODES, ...ARROWS], caption: 'model.state_dict(): each weight, by name' },
  { show: [...RING_PARTS, 'file', 'save'], lit: ['save', 'file'], dim: [...NODES, ...ARROWS],
    caption: "torch.save(model.state_dict(), 'model.pt')" },
  { show: [...RING_PARTS, 'file', 'load'], lit: ['load', ...MODEL_PARTS], dim: [...NODES, ...ARROWS],
    caption: "model.load_state_dict(torch.load('model.pt'))" },
] });

const layerSequence = (label: string, lit: Part[], caption: string): LoopSequence => ({ label, still: 0, states: [
  { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit, caption },
] });

const SEQUENCES: Record<string, () => LoopSequence> = {
  'training-loop': () => ringSequence('The training loop: five steps per batch.'),
  optimizer: () => ({ label: 'An optimizer: it clears and steps the weights.', still: 1, states: [
    { show: LOOP, lit: MODEL_PARTS, caption: 'SGD(model.parameters(), lr=0.5)' },
    { show: LOOP, lit: ['zeroGrad', 'step'], caption: 'it runs two of the five: zero_grad and step' },
  ] }),
  'zero-grad': () => ({ label: 'zero_grad: clear every gradient before backward.', still: 0, states: [
    { show: LOOP, lit: ['zeroGrad'], caption: 'optimizer.zero_grad(): every .grad → None' },
    { show: LOOP, lit: ['backward', 'toBackward'], caption: 'then backward fills them fresh' },
    { show: LOOP, bad: ['zeroGrad'], lit: ['backward'], caption: 'skip it: backward adds to the last batch’s' },
  ] }),
  'optimizer-step': () => stepSequence('step: the optimizer updates the weights.', 'optimizer.step(): weights move against their .grad'),
  sgd: () => stepSequence('SGD: a step of lr against each gradient.', 'SGD step: weight -= lr * weight.grad'),
  adamw: () => stepSequence('AdamW: a step sized for each weight.', 'AdamW step: sized per weight, plus weight decay'),
  'learning-rate': () => stepSequence('The learning rate sets the size of each step.', 'lr: weight -= lr * weight.grad'),
  loss: () => lossSequence('A loss: one number for how wrong the model is.', 'loss = loss_fn(logits, yb): one number'),
  'cross-entropy-loss': () => lossSequence('CrossEntropyLoss: raw scores against class ids.', 'nn.CrossEntropyLoss()(logits, yb), yb class ids'),
  'mse-loss': () => lossSequence('MSELoss: the mean squared error.', 'nn.MSELoss()(pred, y): mean of (pred - y)²'),
  forward: () => ({ label: 'forward: what calling the model runs.', still: 0, states: [
    { show: [...LOOP, 'feed1'], lit: ['forward', 'feed1', ...MODEL_PARTS], caption: 'model(xb) runs forward: Linear → ReLU → Linear' },
  ] }),
  'nn-module': () => ({ label: 'nn.Module: a model, its layers and its forward.', still: 0, states: [
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: MODEL_PARTS, caption: 'a Module holds layers and says how to use them' },
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: ['layer1', 'layer2'], caption: 'model.parameters(): the weights inside it' },
  ] }),
  'nn-sequential': () => ({ label: 'nn.Sequential: layers run in order.', still: 0, states: [
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: ['model'], caption: 'nn.Sequential(Linear, ReLU, Linear)' },
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: ['layer1'], caption: 'x goes through Linear(2, 4) …' },
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: ['relu'], caption: '… then ReLU …' },
    { show: RING_PARTS, dim: [...NODES, ...ARROWS], lit: ['layer2'], caption: '… then Linear(4, 2): 2 scores' },
  ] }),
  'nn-linear': () => layerSequence('nn.Linear: a weighted sum plus a bias.', ['layer1'], 'nn.Linear(2, 4): x @ weight.T + bias'),
  'nn-relu': () => layerSequence('nn.ReLU: negatives become 0.', ['relu'], 'nn.ReLU(): max(0, x), value by value'),
  dataset: () => ({ label: 'A Dataset: examples by index.', still: 0, states: [
    { show: [...RING_PARTS, 'rows'], dim: RING_PARTS, lit: ['rows'], caption: 'TensorDataset(X, y): 16 (x, y) rows' },
  ] }),
  dataloader: () => ({ label: 'A DataLoader: a Dataset in batches.', still: 1, states: [
    { show: [...RING_PARTS, 'rows'], dim: RING_PARTS, caption: 'TensorDataset(X, y): 16 rows' },
    { show: [...RING_PARTS, ...BATCHES], dim: RING_PARTS, lit: BATCHES, caption: 'DataLoader(…, batch_size=8, shuffle=True)' },
    { show: [...RING_PARTS, ...BATCHES, 'feed1'], lit: ['batch1', 'feed1', 'forward'], caption: 'for xb, yb in loader: 8 rows per lap' },
  ] }),
  batch: () => ({ label: 'A batch: the rows one step trains on.', still: 0, states: [
    { show: [...LOOP, 'feed1'], lit: ['batch1', 'feed1', 'forward'], caption: 'xb, yb: 8 rows for one step' },
    { show: [...LOOP, 'feed2'], lit: ['batch2', 'feed2', 'forward'], caption: 'the next 8 rows, the next step' },
  ] }),
  epoch: () => ({ label: 'An epoch: one pass through the data.', still: 1, states: [
    { show: [...LOOP, 'feed1'], lit: ['batch1', 'epoch1'], caption: 'epoch 1, batch 1 of 2' },
    { show: [...LOOP, 'feed2'], lit: ['batch2', 'epoch1'], caption: 'epoch 1, batch 2 of 2: every row seen' },
    { show: [...RING_PARTS, ...BATCHES, 'epoch2', 'feed1'], lit: ['batch1', 'epoch2'], caption: 'epoch 2: all 16 again, reshuffled' },
  ] }),
  'model-train': () => modeSequence('model.train(): training mode.', 0),
  'model-eval': () => modeSequence('model.eval(): evaluation mode.', 1),
  dropout: () => modeSequence('Dropout: on in training, off in evaluation.', 1),
  'state-dict': () => fileSequence('state_dict: the weights by name.', 0),
  'torch-save': () => fileSequence('torch.save: an object to a file.', 1),
  'torch-load': () => fileSequence('torch.load: an object back from a file.', 2),
};

export function trainLoop(figure: Figure): HTMLElement {
  const sequence = (SEQUENCES[figure.highlight ?? 'training-loop'] ?? SEQUENCES['training-loop']!)();
  return partsFigure(PARTS, drawLoop(), sequence, HEIGHT);
}
