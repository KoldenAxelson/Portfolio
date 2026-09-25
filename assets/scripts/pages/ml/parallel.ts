// Parallelism grid: for each strategy, draw which of the model's layers every
// GPU stores. `holds` comes from data/ml/parallelism.yaml:
//   all    every layer, whole        slice  a thin slice of every layer
//   shard  every layer, stored 1/N   stage  one whole layer per GPU
// A sharded GPU also shows the one layer it has borrowed in full to compute.

type Holding = 'full' | 'part' | 'none' | 'borrowed';

const BORROWED_LAYER = 2;

function holdingFor(holds: string, gpu: number, layer: number): Holding {
  if (holds === 'all') return 'full';
  if (holds === 'stage') return layer === gpu ? 'full' : 'none';
  if (holds === 'shard' && layer === BORROWED_LAYER) return 'borrowed';
  return 'part';
}

export function initParallel(root: HTMLElement): void {
  const grid = root.querySelector<HTMLElement>('#mli-par-grid');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-strategy]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  if (!grid || !buttons.length) return;

  const gpuCount = Number(root.dataset.gpus);
  const layerCount = Number(root.dataset.layers);

  const show = (button: HTMLButtonElement): void => {
    const holds = button.dataset.holds ?? 'all';
    grid.dataset.holds = holds;
    grid.replaceChildren(...Array.from({ length: gpuCount }, (_, gpu) => {
      const box = document.createElement('div');
      box.className = 'mli-par-gpu';
      const name = document.createElement('span');
      name.textContent = `GPU ${gpu + 1}`;
      const stack = document.createElement('div');
      stack.className = 'mli-par-layers';
      for (let layer = 0; layer < layerCount; layer++) {
        const cell = document.createElement('span');
        cell.className = `mli-par-layer is-${holdingFor(holds, gpu, layer)}`;
        cell.style.setProperty('--slice', String(gpu / gpuCount));
        stack.append(cell);
      }
      box.append(stack, name);
      return box;
    }));
    for (const card of cards) card.hidden = card.dataset.card !== button.dataset.strategy;
    for (const other of buttons) {
      other.classList.toggle('is-on', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    }
  };

  for (const button of buttons) button.addEventListener('click', () => show(button));
  show(buttons[0]);
}
