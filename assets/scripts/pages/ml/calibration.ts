// Reliability chart: for each confidence band, how sure a model said it was vs.
// how often it was right, and what that means for answers it handles alone.
// All the numbers come from the shortcode's data-* attributes.

const BAND_WIDTH = 10;

function readNumbers(value: string | undefined): number[] {
  return (value ?? '').split(',').map(Number);
}

export function initCalibration(root: HTMLElement): void {
  const chart = root.querySelector<HTMLElement>('#mli-cal-chart');
  const slider = root.querySelector<HTMLInputElement>('#mli-cal-r');
  const thresholdLabel = root.querySelector<HTMLElement>('#mli-cal-v');
  const output = root.querySelector<HTMLElement>('#mli-cal-out');
  const caption = root.querySelector<HTMLElement>('#mli-cal-cap');
  const modelButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-accuracy]')];
  if (!chart || !slider || !thresholdLabel || !output || !caption || !modelButtons.length) return;

  const bandStarts = readNumbers(root.dataset.bins);
  const counts = readNumbers(root.dataset.counts);
  let model = modelButtons.find((button) => button.classList.contains('is-on')) ?? modelButtons[0];

  const render = (): void => {
    const accuracy = readNumbers(model.dataset.accuracy);
    const threshold = Number(slider.value);
    const columns = bandStarts.map((start, i) => {
      const stated = (start + BAND_WIDTH / 2) / 100;
      const column = document.createElement('div');
      column.className = start >= threshold ? 'mli-cal-col is-on' : 'mli-cal-col';
      const track = document.createElement('div');
      track.className = 'mli-cal-track';
      const fill = document.createElement('div');
      fill.className = 'mli-cal-fill';
      fill.style.height = `${accuracy[i] * 100}%`;
      const mark = document.createElement('div');
      mark.className = 'mli-cal-mark';
      mark.style.bottom = `${stated * 100}%`;
      track.append(fill, mark);
      const label = document.createElement('span');
      label.textContent = `${start}s`;
      column.append(track, label);
      return column;
    });
    chart.replaceChildren(...columns);

    const handledBands = bandStarts.flatMap((start, i) => (start >= threshold ? [i] : []));
    const handled = handledBands.reduce((sum, i) => sum + counts[i], 0);
    const wrong = Math.round(handledBands.reduce((sum, i) => sum + counts[i] * (1 - accuracy[i]), 0));
    const wrongPercent = Math.round((wrong / handled) * 100);
    thresholdLabel.textContent = String(threshold);
    slider.setAttribute('aria-valuetext', `${threshold} percent`);
    output.replaceChildren(`${wrong} wrong `, Object.assign(document.createElement('small'), { textContent: `of ${handled.toLocaleString()} handled alone` }));
    caption.textContent = `The ${model.textContent?.toLowerCase()} model says ${threshold}% or more, and in that range it's wrong ${wrongPercent}% of the time.`;
  };

  for (const button of modelButtons) {
    button.addEventListener('click', () => {
      model = button;
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
