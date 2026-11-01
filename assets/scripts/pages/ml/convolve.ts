// Circular convolution by hand (shortcodes/ml/convolve.html). The template
// already computes every product and sum; this only moves the highlight. Pick
// an output, or point at a cell, and the cells that add into that output light
// up along their wrapped diagonal.

export function initConvolve(root: HTMLElement): void {
  const outputs = Array.from(root.querySelectorAll<HTMLButtonElement>('.mli-conv-outs [data-g]'));
  const cells = Array.from(root.querySelectorAll<HTMLElement>('.mli-conv-cell'));

  const focus = (group: string): void => {
    root.dataset.focus = group;
    for (const button of outputs) {
      const on = button.dataset.g === group;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', String(on));
    }
  };

  for (const button of outputs) button.addEventListener('click', () => focus(button.dataset.g ?? '0'));
  for (const cell of cells) cell.addEventListener('pointerenter', () => focus(cell.dataset.g ?? '0'));
}
