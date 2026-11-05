// {{< ml/wrap-clock >}}: a small clock of 2^bits positions and one move
// (add, multiply or XOR by k). An arrow runs from every position to where the
// move sends it. If no two arrows end in the same place, the move can be
// undone, and the demo shows the undo; if two do, it names them. The 32-bit
// clock behaves the same way, with 4,294,967,296 positions instead.

import { svgElement } from './plot';
import { FACE, binary, isLabelled, positionPoint } from './clock-face';

type Move = 'add' | 'multiply' | 'xor';

interface Outcome {
  targets: number[];
  sourcesOf: Map<number, number[]>;
  undo: string | null;
  undoTargets: number[] | null;
}

function apply(move: Move, value: number, k: number, count: number): number {
  if (move === 'add') return (value + k) % count;
  if (move === 'multiply') return (value * k) % count;
  return value ^ k;
}

// Small clocks only (64 positions at most), so a search is clearer than
// extended Euclid.
function multiplicativeInverse(k: number, count: number): number | null {
  for (let candidate = 1; candidate < count; candidate++) if ((k * candidate) % count === 1) return candidate;
  return null;
}

// layouts/shortcodes/ml/wrap-clock.html repeats the multiply sentence (and this
// inverse search) for its no-JS readout.
function describeUndo(move: Move, k: number, count: number): { text: string; inverseK: number; inverseMove: Move } | null {
  if (move === 'add') {
    const back = (count - k) % count;
    return { text: `add ${back} (the same as subtracting ${k})`, inverseK: back, inverseMove: 'add' };
  }
  if (move === 'xor') return { text: `XOR with ${k} again`, inverseK: k, inverseMove: 'xor' };
  const inverse = multiplicativeInverse(k, count);
  if (inverse === null) return null;
  const product = k * inverse;
  const wrapNote = product === 1 ? '' : ', which wraps around to 1';
  return { text: `multiply by ${inverse}, because ${k} × ${inverse} = ${product}${wrapNote}`, inverseK: inverse, inverseMove: 'multiply' };
}

function outcomeOf(move: Move, k: number, count: number): Outcome {
  const targets = Array.from({ length: count }, (_, value) => apply(move, value, k, count));
  const sourcesOf = new Map<number, number[]>();
  targets.forEach((target, source) => sourcesOf.set(target, [...(sourcesOf.get(target) ?? []), source]));
  const undo = sourcesOf.size === count ? describeUndo(move, k, count) : null;
  const undoTargets = undo ? targets.map((target) => apply(undo.inverseMove, target, undo.inverseK, count)) : null;
  return { targets, sourcesOf, undo: undo?.text ?? null, undoTargets };
}

function arrowPath(from: number, to: number, count: number): string {
  const start = positionPoint(from, count, FACE.radius - 9);
  const end = positionPoint(to, count, FACE.radius - 9);
  // Bend each chord toward the centre so arrows between neighbours stay visible.
  const control = { x: FACE.centre + ((start.x + end.x) / 2 - FACE.centre) * 0.35, y: FACE.centre + ((start.y + end.y) / 2 - FACE.centre) * 0.35 };
  return `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
}

export function initWrapClock(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('#mli-wc-plot');
  const kSlider = root.querySelector<HTMLInputElement>('#mli-wc-k');
  const kValue = root.querySelector<HTMLElement>('#mli-wc-k-v');
  const summary = root.querySelector<HTMLElement>('#mli-wc-summary');
  const verdict = root.querySelector<HTMLElement>('#mli-wc-verdict');
  const followText = root.querySelector<HTMLElement>('#mli-wc-follow');
  const undoButton = root.querySelector<HTMLButtonElement>('#mli-wc-undo');
  const bitsButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-bits]'));
  const moveButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-move]'));
  // The sizes on offer come from data/ml/wrap-clock.yaml's bitsChoices, via the buttons.
  const bitsChoices = bitsButtons.map((button) => Number(button.dataset.bits));
  if (!svg || !kSlider || !summary || !verdict) return;

  const state = {
    bits: Number(root.dataset.bits ?? 4),
    move: (root.dataset.move ?? 'multiply') as Move,
    k: Number(root.dataset.k ?? 3),
    selected: 1,
    showUndo: false,
  };

  svg.replaceChildren();
  const head = svgElement('marker', { id: 'mli-wc-head', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  head.append(svgElement('path', { d: 'M0,0 L10,5 L0,10 z', class: 'mli-wc-head' }));
  svg.append(head);
  svg.append(svgElement('circle', { cx: FACE.centre, cy: FACE.centre, r: FACE.radius, class: 'mli-wc-rim' }));
  const arrowLayer = svgElement('g', {});
  const dotLayer = svgElement('g', {});
  svg.append(arrowLayer, dotLayer);

  const count = (): number => 2 ** state.bits;

  function moveLabel(): string {
    if (state.move === 'add') return `Add ${state.k}`;
    if (state.move === 'multiply') return `Multiply by ${state.k}`;
    return `XOR with ${state.k} (binary ${binary(state.k, state.bits)})`;
  }

  function render(): void {
    const positions = count();
    const outcome = outcomeOf(state.move, state.k, positions);
    const showingUndo = state.showUndo && outcome.undoTargets !== null;
    const destination = outcome.targets[state.selected];
    const sharers = outcome.sourcesOf.get(destination) ?? [];

    arrowLayer.replaceChildren(
      ...outcome.targets.map((target, source) => {
        const from = showingUndo ? target : source;
        const to = showingUndo ? source : target;
        const isFollowed = source === state.selected || (!showingUndo && sharers.includes(source));
        return svgElement('path', {
          d: arrowPath(from, to, positions),
          class: `mli-wc-arrow${showingUndo ? ' is-undo' : ''}${isFollowed ? ' is-followed' : ''}`,
          'marker-end': from === to ? '' : 'url(#mli-wc-head)',
        });
      }),
    );

    dotLayer.replaceChildren();
    for (let value = 0; value < positions; value++) {
      const hits = outcome.sourcesOf.get(value)?.length ?? 0;
      const point = positionPoint(value, positions);
      const classes = ['mli-wc-dot', hits === 0 ? 'is-missed' : hits > 1 ? 'is-shared' : '', value === state.selected ? 'is-selected' : '', value === destination ? 'is-target' : ''];
      dotLayer.append(svgElement('circle', { cx: point.x, cy: point.y, r: positions > 32 ? 4 : 6, class: classes.join(' '), 'data-value': value }));
      if (hits > 1) {
        const badge = positionPoint(value, positions, FACE.radius - 26);
        const text = svgElement('text', { x: badge.x, y: badge.y + 3, class: 'mli-wc-count', 'text-anchor': 'middle' });
        text.textContent = `×${hits}`;
        dotLayer.append(text);
      }
      if (isLabelled(value, positions)) {
        const at = positionPoint(value, positions, FACE.labelRadius);
        const label = svgElement('text', { x: at.x, y: at.y + 4, class: 'mli-wc-label', 'text-anchor': 'middle' });
        label.textContent = String(value);
        dotLayer.append(label);
      }
    }

    summary!.textContent = `${moveLabel()}, on a clock with ${positions} positions (${state.bits} bits).`;
    if (outcome.undo) {
      verdict!.textContent = `Every position lands on a different one, so it can be undone: ${outcome.undo}.`;
    } else {
      const [first, second] = [...outcome.sourcesOf.values()].find((sources) => sources.length > 1) ?? [];
      const firstTarget = outcome.targets[first ?? 0];
      verdict!.textContent = `The move reaches only ${outcome.sourcesOf.size} of ${positions} positions: ${first} and ${second} both land on ${firstTarget}, so once you're there, there's no telling which you started from. It can't be undone.`;
    }
    if (followText) {
      const others = sharers.filter((source) => source !== state.selected);
      followText.textContent = `Following ${state.selected}: it goes to ${destination}${others.length ? `, and so ${others.length === 1 ? 'does' : 'do'} ${others.join(', ')}` : ''}.`;
    }
    if (undoButton) {
      undoButton.disabled = !outcome.undo;
      undoButton.textContent = showingUndo ? 'Hide the undo' : 'Show the undo';
      undoButton.setAttribute('aria-pressed', String(showingUndo));
    }
    root.classList.toggle('is-undo', showingUndo);
    if (kValue) kValue.textContent = String(state.k);
  }

  function choose(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
    for (const button of buttons) {
      button.classList.toggle('is-on', button === chosen);
      button.setAttribute('aria-pressed', String(button === chosen));
    }
  }

  for (const button of bitsButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.bits = Number(button.dataset.bits);
      state.k = Math.min(state.k, count() - 1);
      state.selected = Math.min(state.selected, count() - 1);
      kSlider!.max = String(count() - 1);
      kSlider!.value = String(state.k);
      choose(bitsButtons, button);
      render();
    });
  }
  for (const button of moveButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.move = button.dataset.move as Move;
      choose(moveButtons, button);
      render();
    });
  }
  kSlider.disabled = false;
  kSlider.addEventListener('input', () => {
    state.k = Number(kSlider.value);
    render();
  });
  undoButton?.addEventListener('click', () => {
    state.showUndo = !state.showUndo;
    render();
  });

  // One tab stop for the whole clock: arrow keys walk the followed position.
  svg.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    state.selected = (state.selected + step + count()) % count();
    render();
  });
  svg.addEventListener('click', (event) => {
    const dot = (event.target as Element).closest<SVGCircleElement>('circle[data-value]');
    if (!dot) return;
    state.selected = Number(dot.dataset.value);
    render();
  });

  if (!bitsChoices.includes(state.bits)) state.bits = bitsChoices[0] ?? 4;
  state.k = Math.min(state.k, count() - 1);
  kSlider.max = String(count() - 1);
  kSlider.value = String(state.k);
  for (const id of ['#mli-wc-controls', '#mli-wc-actions']) {
    const element = root.querySelector<HTMLElement>(id);
    if (element) element.hidden = false;
  }
  root.classList.add('is-live');
  render();
}
