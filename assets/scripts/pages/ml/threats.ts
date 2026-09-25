// Threat map: each attack path lists the controls that close it. Controls
// marked detects-only never close a path; they turn "open" into "open, but
// seen". Paths and controls come from data/ml/weights-threats.yaml.

export function initThreats(root: HTMLElement): void {
  const output = root.querySelector<HTMLElement>('#mli-thr-out');
  const controls = [...root.querySelectorAll<HTMLInputElement>('[data-control]')];
  const paths = [...root.querySelectorAll<HTMLElement>('[data-stopped-by]')];
  if (!output || !controls.length || !paths.length) return;

  const render = (): void => {
    const active = new Set(controls.filter((box) => box.checked && !box.dataset.detectsOnly).map((box) => box.dataset.control));
    const isWatched = controls.some((box) => box.checked && box.dataset.detectsOnly);
    let closedCount = 0;
    for (const path of paths) {
      const isClosed = (path.dataset.stoppedBy ?? '').split(' ').some((id) => active.has(id));
      if (isClosed) closedCount++;
      path.classList.toggle('is-open', !isClosed);
      path.classList.toggle('is-watched', !isClosed && isWatched);
      const state = path.querySelector<HTMLElement>('.mli-thr-state');
      if (state) state.textContent = isClosed ? 'Closed' : isWatched ? 'Open, but you’d see it' : 'Open';
    }
    output.replaceChildren(`${closedCount} of ${paths.length} `, Object.assign(document.createElement('small'), { textContent: 'paths closed' }));
  };

  for (const box of controls) box.addEventListener('change', render);
  render();
}
