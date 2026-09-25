// The plot-anatomy family: one Matplotlib figure drawn as its parts. A Figure
// (the whole image) holds an Axes (one plot area), and the Axes holds the
// lines, the tick labels, the axis labels, a title and a legend. Every term
// shows the same drawing with the part it names lit; plot types swap what is
// inside the Axes, and subplot grids swap the one Axes for several.
//
// The two curves are Chapter 6's page run (examples/ch06/data/training-log.csv).
import type { Figure } from '../def-figures';
import { attrs, centredLabel, cycleForever, figureCanvas, reduceMotion, svg } from '../figure-kit';

const TRAIN = [1.856, 1.424, 1.072, 0.861, 0.702, 0.583, 0.489, 0.432, 0.376, 0.344, 0.317, 0.289];
const VAL = [1.866, 1.478, 1.181, 0.986, 0.834, 0.758, 0.712, 0.725, 0.734, 0.781, 0.848, 0.923];
const BEST_EPOCH = VAL.indexOf(Math.min(...VAL)) + 1;
const CONFUSION = [[50, 3, 2], [4, 40, 6], [1, 8, 30]];

const WIDTH = 260;
const HEIGHT = 160;
const FIG = { x: 8, y: 4, w: 244, h: 152 };
const AX = { x: 52, y: 26, w: 182, h: 94 };
const AX_BOTTOM = AX.y + AX.h;
const STEP_MS = 2400;

// Parts paint in this order, so the shaded 'after' region sits under the lines.
const PARTS = [
  'figure', 'figTag', 'after', 'best', 'axes', 'axTag', 'xticks', 'yticks', 'logticks', 'train', 'val', 'trainLog',
  'valLog', 'title', 'xlabel', 'ylabel', 'legend', 'dfLegend', 'grid', 'gridCell', 'pair', 'pairLeftTitle',
  'pairRightTitle', 'current', 'scatter', 'hist', 'bar', 'imshow', 'file',
] as const;
type PartName = (typeof PARTS)[number];

interface PlotState {
  show: PartName[];
  lit?: PartName[];
  bad?: PartName[];
  caption: string;
}
interface Sequence { label: string; still: number; states: PlotState[] }

// Epochs span the Axes with a small margin each side, as Matplotlib pads its data.
const xOf = (epoch: number): number => AX.x + 8 + ((epoch - 1) / 11) * (AX.w - 16);
const yLinear = (loss: number): number => AX_BOTTOM - ((loss - 0.15) / 1.9) * AX.h;
// Log scale from 0.1 to 3: 10⁻¹ and 10⁰ are the ticks.
const yLog = (loss: number): number => AX_BOTTOM - ((Math.log10(loss) + 1) / (Math.log10(3) + 1)) * AX.h;

function path(points: [number, number][], className: string): SVGPathElement {
  const line = svg('path');
  attrs(line, { d: points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), pathLength: 1 });
  line.setAttribute('class', className);
  return line;
}

function curve(losses: number[], yOf: (loss: number) => number, className: string): SVGPathElement {
  return path(losses.map((loss, i): [number, number] => [xOf(i + 1), yOf(loss)]), `fig-plot__line ${className}`);
}

function rect(x: number, y: number, w: number, h: number, className: string): SVGRectElement {
  const box = svg('rect');
  attrs(box, { x, y, width: w, height: h });
  box.setAttribute('class', className);
  return box;
}

const text = (x: number, y: number, content: string, className = 'fig-plot__text'): SVGTextElement =>
  centredLabel(x, y, className, content);

function yTicks(labels: [number, string][], yOf: (loss: number) => number): SVGElement[] {
  return labels.flatMap(([loss, label]) => {
    const tick = path([[AX.x - 3, yOf(loss)], [AX.x, yOf(loss)]], 'fig-plot__tick');
    return [tick, text(AX.x - 13, yOf(loss), label)];
  });
}

function legend(names: [string, string]): SVGElement[] {
  const box = { x: AX.x + AX.w - 75, y: AX.y + 5, w: 70, h: 25 };
  const entry = (row: number, name: string, className: string): SVGElement[] => {
    const y = box.y + 8 + row * 10;
    const label = text(box.x + 18, y, name);
    label.setAttribute('text-anchor', 'start');
    return [path([[box.x + 4, y], [box.x + 14, y]], `fig-plot__line ${className}`), label];
  };
  return [rect(box.x, box.y, box.w, box.h, 'fig-plot__legend'), ...entry(0, names[0], 'is-train'), ...entry(1, names[1], 'is-val')];
}

function subplotBoxes(boxes: { x: number; y: number; name: string }[], w: number, h: number): SVGElement[] {
  return boxes.flatMap(({ x, y, name }) => [rect(x, y, w, h, 'fig-plot__axes'), text(x + w / 2, y + h / 2, name, 'fig-plot__text is-code')]);
}

// Bars for a histogram of errors: adjacent bins, a rough bell.
const HIST_COUNTS = [2, 5, 11, 19, 24, 18, 10, 4, 1];
const BAR_COUNTS: [string, number][] = [['cat', 120], ['dog', 80], ['bird', 30]];
const SCATTER = Array.from({ length: 14 }, (_, i) => [i / 13, i / 13 + [0.06, -0.05, 0.08, -0.02, -0.09, 0.04, 0.1, -0.07, 0.02, -0.04, 0.07, -0.08, 0.03, -0.03][i]!]);

function marks(name: PartName): SVGElement[] {
  const inner = { x: AX.x + 10, y: AX.y + 8, w: AX.w - 20, h: AX.h - 12 };
  if (name === 'scatter') {
    return SCATTER.map(([u, v]) => {
      const dot = svg('circle');
      attrs(dot, { cx: inner.x + u! * inner.w, cy: inner.y + inner.h - v! * inner.h * 0.9, r: 2.4 });
      dot.setAttribute('class', 'fig-plot__mark');
      return dot;
    });
  }
  if (name === 'hist') {
    const binW = inner.w / HIST_COUNTS.length;
    return HIST_COUNTS.map((count, i) => {
      const h = (count / 24) * inner.h;
      return rect(inner.x + i * binW, AX_BOTTOM - h, binW, h, 'fig-plot__mark is-bin');
    });
  }
  if (name === 'bar') {
    const slot = inner.w / BAR_COUNTS.length;
    return BAR_COUNTS.flatMap(([label, count], i) => {
      const h = (count / 120) * inner.h;
      const x = inner.x + i * slot + slot * 0.15;
      return [rect(x, AX_BOTTOM - h, slot * 0.7, h, 'fig-plot__mark'), text(x + slot * 0.35, AX_BOTTOM + 8, label)];
    });
  }
  const cell = 26;
  const left = AX.x + (AX.w - 3 * cell) / 2;
  const top = AX.y + (AX.h - 3 * cell) / 2;
  return CONFUSION.flatMap((row, r) => row.map((value, c) => {
    const box = rect(left + c * cell, top + r * cell, cell, cell, 'fig-plot__pixel');
    box.setAttribute('fill-opacity', (0.12 + (0.88 * value) / 50).toFixed(2));
    return box;
  }));
}

function fileIcon(): SVGElement[] {
  const sheet = svg('path');
  attrs(sheet, { d: 'M 196 60 h 26 l 10 10 v 34 h -36 z', fill: 'none' });
  sheet.setAttribute('class', 'fig-plot__file');
  return [rect(FIG.x, FIG.y, FIG.w, FIG.h, 'fig-plot__cover'), sheet, text(214, 90, 'loss.png', 'fig-plot__text is-code')];
}

/** Every part, drawn once; states only show, hide and tone them. */
function drawParts(): Record<PartName, SVGElement[]> {
  const pairW = 104;
  const gridW = 106;
  return {
    figure: [rect(FIG.x, FIG.y, FIG.w, FIG.h, 'fig-plot__figure')],
    figTag: [text(FIG.x + 22, FIG.y + FIG.h - 7, 'Figure', 'fig-plot__text is-tag')],
    axes: [rect(AX.x, AX.y, AX.w, AX.h, 'fig-plot__axes')],
    axTag: [text(AX.x + 20, AX_BOTTOM - 9, 'Axes', 'fig-plot__text is-tag')],
    xticks: [2, 4, 6, 8, 10, 12].flatMap((epoch) => [
      path([[xOf(epoch), AX_BOTTOM], [xOf(epoch), AX_BOTTOM + 3]], 'fig-plot__tick'), text(xOf(epoch), AX_BOTTOM + 9, String(epoch))]),
    yticks: yTicks([[0.5, '0.5'], [1, '1.0'], [1.5, '1.5']], yLinear),
    logticks: yTicks([[0.1, '10⁻¹'], [1, '10⁰']], yLog),
    train: [curve(TRAIN, yLinear, 'is-train')],
    val: [curve(VAL, yLinear, 'is-val')],
    trainLog: [curve(TRAIN, yLog, 'is-train')],
    valLog: [curve(VAL, yLog, 'is-val')],
    title: [text(AX.x + AX.w / 2, 15, 'Train vs validation loss')],
    xlabel: [text(AX.x + AX.w / 2, AX_BOTTOM + 21, 'epoch')],
    ylabel: [text(0, 0, 'loss')],
    legend: legend(['train', 'validation']),
    dfLegend: legend(['train_loss', 'val_loss']),
    best: [path([[xOf(BEST_EPOCH), AX.y], [xOf(BEST_EPOCH), AX_BOTTOM]], 'fig-plot__best')],
    after: [rect(xOf(BEST_EPOCH), AX.y, AX.x + AX.w - xOf(BEST_EPOCH), AX.h, 'fig-plot__after')],
    grid: subplotBoxes([
      { x: 20, y: 12, name: 'axs[0, 0]' }, { x: 134, y: 12, name: 'axs[0, 1]' },
      { x: 20, y: 84, name: 'axs[1, 0]' }, { x: 134, y: 84, name: 'axs[1, 1]' },
    ], gridW, 62),
    gridCell: [rect(20, 84, gridW, 62, 'fig-plot__axes')],
    pair: subplotBoxes([{ x: 20, y: 30, name: 'axs[0]' }, { x: 136, y: 30, name: 'axs[1]' }], pairW, 96),
    pairLeftTitle: [text(20 + pairW / 2, 20, 'train')],
    pairRightTitle: [text(136 + pairW / 2, 20, 'train')],
    current: [text(136 + pairW / 2, 140, 'plt.gca()', 'fig-plot__text is-code')],
    scatter: marks('scatter'),
    hist: marks('hist'),
    bar: marks('bar'),
    imshow: marks('imshow'),
    file: fileIcon(),
  };
}

const FULL: PartName[] = ['figure', 'axes', 'xticks', 'yticks', 'train', 'val', 'title', 'xlabel', 'ylabel', 'legend'];
const EMPTY: PartName[] = ['figure', 'axes', 'xticks', 'yticks'];
const without = (parts: PartName[], ...gone: PartName[]): PartName[] => parts.filter((part) => !gone.includes(part));
const LOG: PartName[] = [...without(FULL, 'yticks', 'train', 'val'), 'logticks', 'trainLog', 'valLog'];
// What log.plot() draws with no arguments: no title, no y label, the column names in the legend.
const DF_PLOT: PartName[] = [...without(FULL, 'title', 'ylabel', 'legend'), 'dfLegend'];

/** An empty Axes, then the plot type drawn in it. */
function markSequence(part: PartName, label: string, caption: string): Sequence {
  const bare: PartName[] = ['figure', 'axes'];
  return { label, still: 1, states: [
    { show: bare, caption: 'fig, ax = plt.subplots()' },
    { show: [...bare, part], lit: [part], caption },
  ] };
}

/** The finished plot, then the same plot with one part lit. */
function litSequence(label: string, lit: PartName[], caption: string, before: PartName[] = FULL): Sequence {
  return { label, still: 1, states: [
    { show: before, caption: 'a loss plot' },
    { show: [...FULL, ...lit], lit, caption },
  ] };
}

const SEQUENCES: Record<string, () => Sequence> = {
  figure: () => litSequence('A Figure: the whole image.', ['figure', 'figTag'], 'fig: the Figure, the whole image; savefig writes it'),
  axes: () => litSequence('An Axes: one plot area.', ['axes', 'axTag'], 'ax: one Axes, a plot area with its own x and y scales'),
  subplots: () => ({ label: 'plt.subplots: a Figure and its Axes in one call.', still: 0, states: [
    { show: ['figure', 'figTag', 'axes', 'axTag'], lit: ['figTag', 'axTag'], caption: 'fig, ax = plt.subplots(): a Figure holding one empty Axes' },
    { show: FULL, lit: ['train', 'val'], caption: "then ax's methods draw into it" },
  ] }),
  grid: () => ({ label: 'A subplot grid: several Axes in one Figure.', still: 1, states: [
    { show: ['figure', 'grid'], caption: 'fig, axs = plt.subplots(2, 2): axs has shape (2, 2)' },
    { show: ['figure', 'grid', 'gridCell'], lit: ['gridCell'], caption: 'axs[1, 0]: row 1, column 0' },
  ] }),
  plot: () => ({ label: 'ax.plot: lines through points.', still: 2, states: [
    { show: ['figure', 'axes'], caption: 'fig, ax = plt.subplots()' },
    { show: [...EMPTY, 'train'], lit: ['train'], caption: "ax.plot(epochs, train, label='train')" },
    { show: [...EMPTY, 'train', 'val'], lit: ['val'], caption: 'a second ax.plot: a second line, in the next colour' },
  ] }),
  scatter: () => markSequence('scatter', 'ax.scatter: one dot per point.', 'ax.scatter(target, prediction): one dot per pair'),
  hist: () => markSequence('hist', 'ax.hist: how many values fall in each bin.', 'ax.hist(errors, bins=9): a bar per bin, its height a count'),
  bar: () => markSequence('bar', 'ax.bar: one bar per category.', "ax.bar(['cat', 'dog', 'bird'], counts)"),
  imshow: () => markSequence('imshow', 'ax.imshow: an array as coloured cells.', 'ax.imshow(matrix): a cell per value, row 0 at the top'),
  labels: () => litSequence('Axis labels: what each direction measures.', ['xlabel', 'ylabel'],
    "ax.set_xlabel('epoch'), ax.set_ylabel('loss')", without(FULL, 'xlabel', 'ylabel')),
  title: () => litSequence('A title: what the plot shows.', ['title'], "ax.set_title('Train vs validation loss')", without(FULL, 'title')),
  legend: () => litSequence('A legend: which line is which.', ['legend'], 'ax.legend(): one entry per labelled line', without(FULL, 'legend')),
  'log-scale': () => ({ label: 'A log scale: equal steps are equal ratios.', still: 1, states: [
    { show: FULL, caption: 'linear: equal steps add the same amount' },
    { show: LOG, lit: ['logticks'], caption: "ax.set_yscale('log'): each tick is 10× the one below" },
  ] }),
  savefig: () => ({ label: 'fig.savefig: the Figure written to a file.', still: 1, states: [
    { show: FULL, caption: 'fig: a finished Figure' },
    { show: [...FULL, 'file'], lit: ['file'], caption: "fig.savefig('loss.png', dpi=150): the format from the extension" },
  ] }),
  'df-plot': () => ({ label: 'DataFrame.plot: a line per column, drawn by pandas.', still: 1, states: [
    { show: ['figure'], caption: 'log: index epoch, columns train_loss and val_loss' },
    { show: DF_PLOT, lit: ['train', 'val', 'dfLegend', 'xlabel'],
      caption: 'log.plot(): a line per column against the index, a legend of column names' },
  ] }),
  pyplot: () => ({ label: 'pyplot style: plt functions act on the current Axes.', still: 1, states: [
    { show: ['figure', 'pair'], caption: 'fig, axs = plt.subplots(1, 2)' },
    { show: ['figure', 'pair', 'pairRightTitle', 'current'], bad: ['pairRightTitle'], lit: ['current'],
      caption: "plt.title('train') titles axs[1], the current Axes" },
  ] }),
  'oo-style': () => ({ label: 'Object-oriented style: call the method on the Axes you mean.', still: 1, states: [
    { show: ['figure', 'pair'], caption: 'fig, axs = plt.subplots(1, 2)' },
    { show: ['figure', 'pair', 'pairLeftTitle'], lit: ['pairLeftTitle'], caption: "axs[0].set_title('train'): this Axes, by name" },
  ] }),
  overfitting: () => ({ label: 'Overfitting: validation loss turns up while train loss keeps falling.', still: 1, states: [
    { show: FULL, caption: 'train and validation loss by epoch' },
    { show: [...FULL, 'best', 'after'], bad: ['after', 'val'],
      caption: `validation lowest at epoch ${BEST_EPOCH}, then rising while train falls` },
  ] }),
};

export function plotAnatomy(figure: Figure): HTMLElement {
  const sequence = (SEQUENCES[figure.highlight ?? 'figure'] ?? SEQUENCES.figure!)();
  const wrap = document.createElement('figure');
  wrap.className = 'def-fig fig-py';
  const canvas = figureCanvas(WIDTH, HEIGHT, 'fig-py__canvas fig-plot', sequence.label);
  const caption = document.createElement('figcaption');
  caption.className = 'fig-py__caption';
  const captionCode = document.createElement('code');
  caption.appendChild(captionCode);

  const drawn = drawParts();
  const [ylabel] = drawn.ylabel;
  ylabel?.setAttribute('transform', `translate(${AX.x - 34} ${AX.y + AX.h / 2}) rotate(-90)`);
  // Only the parts some state shows go into the SVG.
  const used = new Set(sequence.states.flatMap((state) => state.show));
  const groups = new Map<PartName, SVGGElement>();
  for (const name of PARTS) {
    if (!used.has(name)) continue;
    const group = svg('g');
    group.setAttribute('class', 'fig-plot__part');
    group.append(...drawn[name]);
    canvas.appendChild(group);
    groups.set(name, group);
  }

  const paint = (index: number): void => {
    const state = sequence.states[index % sequence.states.length];
    if (!state) return;
    for (const [name, group] of groups) {
      group.classList.toggle('is-hidden', !state.show.includes(name));
      group.classList.toggle('is-lit', state.lit?.includes(name) ?? false);
      group.classList.toggle('is-bad', state.bad?.includes(name) ?? false);
    }
    captionCode.textContent = state.caption;
    canvas.setAttribute('aria-label', `${sequence.label} ${state.caption}`);
  };

  paint(reduceMotion() ? sequence.still : 0);
  wrap.append(canvas, caption);
  if (!reduceMotion() && sequence.states.length > 1) cycleForever(canvas, STEP_MS, paint);
  return wrap;
}
