// Roofline toy: one decoding step reads every weight once (memory time) and
// does two FLOPs per weight per request (compute time). Whichever is longer
// sets the pace. Chip specs and model size come from the shortcode's data-*.

const BATCH_SIZES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const FLOPS_PER_WEIGHT = 2;

function formatMs(ms: number): string {
  return ms >= 1 ? `${ms.toFixed(1)} ms` : `${ms.toFixed(2)} ms`;
}

export function initRoofline(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-roof-r');
  const batchLabel = root.querySelector<HTMLElement>('#mli-roof-v');
  const memoryFill = root.querySelector<HTMLElement>('#mli-roof-mem');
  const mathFill = root.querySelector<HTMLElement>('#mli-roof-math');
  const memoryValue = root.querySelector<HTMLElement>('#mli-roof-memv');
  const mathValue = root.querySelector<HTMLElement>('#mli-roof-mathv');
  const badge = root.querySelector<HTMLElement>('#mli-roof-badge');
  const output = root.querySelector<HTMLElement>('#mli-roof-out');
  const caption = root.querySelector<HTMLElement>('#mli-roof-cap');
  const chipButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-tflops]')];
  if (!slider || !batchLabel || !memoryFill || !mathFill || !memoryValue || !mathValue || !badge || !output || !caption || chipButtons.length === 0) return;

  const weights = Number(root.dataset.billions) * 1e9;
  const weightBytes = weights * Number(root.dataset.bytesPerWeight);
  let chip = chipButtons[0];

  const render = (): void => {
    const batch = BATCH_SIZES[Number(slider.value)] ?? 1;
    const memoryMs = (weightBytes / (Number(chip.dataset.tbps) * 1e12)) * 1000;
    const mathMs = ((weights * FLOPS_PER_WEIGHT * batch) / (Number(chip.dataset.tflops) * 1e12)) * 1000;
    const stepMs = Math.max(memoryMs, mathMs);
    const isMemoryBound = memoryMs >= mathMs;
    const busyPercent = (mathMs / stepMs) * 100;

    batchLabel.textContent = batch.toLocaleString();
    slider.setAttribute('aria-valuetext', `${batch} ${batch === 1 ? 'request' : 'requests'}`);
    memoryFill.style.width = `${(memoryMs / stepMs) * 100}%`;
    mathFill.style.width = `${busyPercent}%`;
    memoryValue.textContent = formatMs(memoryMs);
    mathValue.textContent = formatMs(mathMs);
    badge.textContent = isMemoryBound ? 'Memory-bound' : 'Compute-bound';
    badge.classList.toggle('is-compute', !isMemoryBound);
    const tokensPerSecond = Math.round((batch / stepMs) * 1000);
    output.replaceChildren(`${tokensPerSecond.toLocaleString()} `, Object.assign(document.createElement('small'), { textContent: 'tokens / second' }));
    caption.textContent = isMemoryBound
      ? `${batch === 1 ? 'One request at a time' : `${batch} requests share each read`}: the math units are busy ${busyPercent < 1 ? busyPercent.toFixed(1) : Math.round(busyPercent)}% of the time. The rest is waiting for weights to arrive from memory.`
      : `Now the math is the slower part. Adding requests stops being free: each one adds work, so total speed has hit its ceiling.`;
  };

  for (const button of chipButtons) {
    button.addEventListener('click', () => {
      chip = button;
      for (const other of chipButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  slider.addEventListener('input', render);
  render();
}
