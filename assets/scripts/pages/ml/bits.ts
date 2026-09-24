// Bits-per-weight slider: memory for a model at each precision, and which
// devices could hold it. All the numbers come from the shortcode's data-* attributes.

const GPU_GB = 80;

interface Device {
  el: HTMLElement;
  gb: number;
  name: string;
}

function formatGb(gb: number): string {
  if (gb >= 100) return Math.round(gb).toLocaleString();
  if (gb >= 10) return gb.toFixed(0);
  return gb.toFixed(1);
}

function describeFit(gb: number, devices: Device[]): string {
  const smallest = devices.find((device) => gb <= device.gb);
  if (!smallest) {
    const gpus = Math.ceil(gb / GPU_GB);
    return `That's ${gpus} data-center GPUs (${GPU_GB} GB each) just to hold the model.`;
  }
  if (smallest === devices[0]) return `Small enough for ${smallest.name}, on paper.`;
  return `Fits ${smallest.name}, but nothing smaller.`;
}

export function initBits(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-bits-r');
  const bitsLabel = root.querySelector<HTMLElement>('#mli-bits-v');
  const memory = root.querySelector<HTMLElement>('#mli-bits-mem');
  const gpuRow = root.querySelector<HTMLElement>('#mli-bits-gpus');
  const caption = root.querySelector<HTMLElement>('#mli-bits-cap');
  if (!slider || !bitsLabel || !memory || !gpuRow || !caption) return;

  const widths = [...root.querySelectorAll<HTMLElement>('[data-bits]')].map((el) => Number(el.dataset.bits));
  const modelButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-billions]')];
  const devices: Device[] = [...root.querySelectorAll<HTMLElement>('[data-gb]')].map((el) => ({
    el,
    gb: Number(el.dataset.gb),
    name: el.dataset.name ?? '',
  }));
  let billions = Number(modelButtons.find((button) => button.classList.contains('is-on'))?.dataset.billions ?? 175);

  const render = (): void => {
    const bits = widths[Number(slider.value)] ?? 16;
    const gb = (billions * bits) / 8;
    bitsLabel.textContent = String(bits);
    slider.setAttribute('aria-valuetext', `${bits} bits`);
    memory.replaceChildren(`${formatGb(gb)} GB `, Object.assign(document.createElement('small'), { textContent: 'of weights' }));
    for (const device of devices) device.el.classList.toggle('is-fit', gb <= device.gb);
    gpuRow.replaceChildren(...Array.from({ length: Math.ceil(gb / GPU_GB) }, () => {
      const gpu = document.createElement('span');
      gpu.className = 'mli-bits-gpu';
      return gpu;
    }));
    caption.textContent = `${billions} billion weights × ${bits} bits ÷ 8 = ${formatGb(gb)} GB. ${describeFit(gb, devices)}`;
  };

  for (const button of modelButtons) {
    button.addEventListener('click', () => {
      billions = Number(button.dataset.billions);
      for (const other of modelButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  slider.addEventListener('input', render);
  render();
}
