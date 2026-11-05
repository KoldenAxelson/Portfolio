// {{< ml/signed-clock >}}: one clock, two sets of labels. Unsigned counts the
// positions 0 up to the top; two's complement keeps the bottom half and calls
// the top half negative. Step the hand with +1 and −1 to watch where each
// reading jumps. The bit pattern under the hand never changes with the labels.

import { svgElement } from './plot';
import { FACE, binary, formatInteger, isLabelled, positionPoint } from './clock-face';

const signedValue = (position: number, count: number): number => (position >= count / 2 ? position - count : position);

export function initSignedClock(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('#mli-sc-plot');
  const patternText = root.querySelector<HTMLElement>('#mli-sc-pattern');
  const noteText = root.querySelector<HTMLElement>('#mli-sc-note');
  const labelButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-labels]'));
  const bitsButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-bits]'));
  const stepButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-step]'));
  if (!svg || !patternText || !noteText) return;

  const state = { bits: Number(root.dataset.bits ?? 4), isSigned: root.dataset.labels !== 'unsigned', position: 0 };
  const count = (): number => 2 ** state.bits;
  // Start one below the halfway point: the largest signed number, one step
  // from the jump. layouts/shortcodes/ml/signed-clock.html works out the same
  // start for its no-JS readout.
  state.position = count() / 2 - 1;

  svg.replaceChildren();
  const negativeArc = svgElement('path', { class: 'mli-sc-negative' });
  const rim = svgElement('circle', { cx: FACE.centre, cy: FACE.centre, r: FACE.radius, class: 'mli-wc-rim' });
  const hand = svgElement('line', { x1: FACE.centre, y1: FACE.centre, class: 'mli-sc-hand' });
  const marks = svgElement('g', {});
  svg.append(negativeArc, rim, marks, hand, svgElement('circle', { cx: FACE.centre, cy: FACE.centre, r: 4, class: 'mli-sc-pin' }));

  function arcPath(count: number): string {
    // From the halfway position round to just before 0: the positions two's
    // complement reads as negative.
    const start = positionPoint(count / 2 - 0.5, count, FACE.radius);
    const end = positionPoint(count - 0.5, count, FACE.radius);
    return `M${start.x.toFixed(1)},${start.y.toFixed(1)} A${FACE.radius},${FACE.radius} 0 0 1 ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  }

  function render(lastStep = 0, from = state.position): void {
    const positions = count();
    const labelFor = (position: number): string => formatInteger(state.isSigned ? signedValue(position, positions) : position);

    negativeArc.setAttribute('d', arcPath(positions));
    negativeArc.toggleAttribute('hidden', !state.isSigned);
    marks.replaceChildren();
    for (let position = 0; position < positions; position++) {
      const point = positionPoint(position, positions);
      marks.append(svgElement('circle', { cx: point.x, cy: point.y, r: positions > 32 ? 2.5 : 5, class: `mli-wc-dot${position === state.position ? ' is-selected' : ''}` }));
      if (!isLabelled(position, positions) && position !== state.position) continue;
      const at = positionPoint(position, positions, FACE.labelRadius);
      const label = svgElement('text', { x: at.x, y: at.y + 4, class: `mli-wc-label${position === state.position ? ' is-current' : ''}`, 'text-anchor': 'middle' });
      label.textContent = labelFor(position);
      marks.append(label);
    }
    const tip = positionPoint(state.position, positions, FACE.radius - 16);
    hand.setAttribute('x2', tip.x.toFixed(1));
    hand.setAttribute('y2', tip.y.toFixed(1));

    const unsigned = state.position;
    const signed = signedValue(state.position, positions);
    patternText!.innerHTML = `Bits <b>${binary(state.position, state.bits)}</b>: unsigned <b>${formatInteger(unsigned)}</b>, two’s complement <b>${formatInteger(signed)}</b>.`;
    noteText!.textContent = noteFor(lastStep, from, positions);
  }

  function noteFor(lastStep: number, from: number, positions: number): string {
    const top = positions - 1;
    const signedMax = positions / 2 - 1;
    if (lastStep === 1 && from === signedMax) return `One step up from ${signedMax}, the largest signed number, lands on −${positions / 2}, the smallest. Unsigned, the same step just goes from ${signedMax} to ${positions / 2}.`;
    if (lastStep === 1 && from === top) return `Unsigned, ${top} + 1 wraps around to 0. Read as two’s complement, that step was just −1 + 1 = 0.`;
    if (lastStep === -1 && from === 0) return `Unsigned, 0 − 1 wraps around to ${top}. Read as two’s complement, that position is −1.`;
    if (lastStep === 0) return 'Step forward once to see the two readings split.';
    if (lastStep === -1 && from === positions / 2) return `One step down from −${positions / 2}, the smallest signed number, lands on ${signedMax}, the largest.`;
    return 'The bits and the step are the same either way; only the labels differ.';
  }

  for (const button of stepButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step);
      const from = state.position;
      state.position = (state.position + step + count()) % count();
      render(step, from);
    });
  }
  for (const button of labelButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.isSigned = button.dataset.labels === 'signed';
      for (const other of labelButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  for (const button of bitsButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.bits = Number(button.dataset.bits);
      state.position = count() / 2 - 1;
      for (const other of bitsButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }

  const controls = root.querySelector<HTMLElement>('#mli-sc-controls');
  if (controls) controls.hidden = false;
  root.classList.add('is-live');
  render();
}
