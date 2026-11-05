// {{< ml/room-on-the-circle >}}: nodes per level (b^k) against room on a
// circle at radius r = k·L, for nodes spaced one unit apart: 2πr flat and
// 2π sinh r hyperbolic. Redraws the template's chart from the same formulas.
// layouts/shortcodes/ml/room-on-the-circle.html draws the first settings for
// JS off. Config: data/ml/room-on-the-circle.yaml.

export function initRoomOnTheCircle(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as { branching: number; edge: number; levels: number } | null;
  const edgeIn = root.querySelector<HTMLInputElement>('#mli-rm-edge');
  const say = root.querySelector<HTMLElement>('#mli-rm-say');
  if (!config || !edgeIn || !say) return;
  const el = { edgeIn, say };
  const num = (k: string): number => Number(root.dataset[k]);
  const [x0, x1, y0, y1, lmax] = [num('x0'), num('x1'), num('y0'), num('y1'), num('lmax')];
  const K = config.levels;
  const state = { b: config.branching, L: config.edge };

  function render(): void {
    const pts: Record<'nodes' | 'flat' | 'hyp', string[]> = { nodes: [], flat: [], hyp: [] };
    const prev: Partial<Record<'nodes' | 'flat' | 'hyp', [number, number]>> = {};
    const done = { nodes: false, flat: false, hyp: false };
    let flatOut = 0;
    let hypOut = 0;
    for (let k = 1; k <= K; k++) {
      const x = x0 + ((x1 - x0) * (k - 1)) / (K - 1);
      const r = state.L * k;
      const v = { nodes: state.b ** k, flat: 2 * Math.PI * r, hyp: 2 * Math.PI * Math.sinh(r) };
      if (!flatOut && v.nodes > v.flat) flatOut = k;
      if (!hypOut && v.nodes > v.hyp) hypOut = k;
      for (const key of ['nodes', 'flat', 'hyp'] as const) {
        if (done[key]) continue;
        let ly = Math.log10(v[key]);
        let px = x;
        const p = prev[key];
        if (ly > lmax && p) {
          // stop the line where it crosses the top of the chart
          px = p[0] + ((x - p[0]) * (lmax - p[1])) / (ly - p[1]);
          ly = lmax;
          done[key] = true;
        }
        pts[key].push(`${px.toFixed(1)},${(y0 - ((y0 - y1) * ly) / lmax).toFixed(1)}`);
        prev[key] = [x, ly];
      }
    }
    for (const key of ['nodes', 'flat', 'hyp'] as const) root.querySelector(`#mli-rm-${key}`)?.setAttribute('points', pts[key].join(' '));
    const flat = flatOut ? `Flat space runs out of room at level ${flatOut}` : `Flat space keeps up for all ${K} levels`;
    let later = 0;
    if (!hypOut && Math.exp(state.L) < state.b) {
      for (let k = K + 1; k <= 200 && !later; k++) if (state.b ** k > 2 * Math.PI * Math.sinh(state.L * k)) later = k;
    }
    const hyp = hypOut
      ? `hyperbolic space runs out at level ${hypOut}`
      : `hyperbolic space keeps up for all ${K}${later ? `, then runs out at level ${later}` : ''}`;
    const tip = Math.exp(state.L) >= state.b ? '' : ` (e to the ${state.L.toFixed(1)} is ${Math.exp(state.L).toFixed(2)}, less than ${state.b}: spread the levels further apart)`;
    el.say.textContent = `${flat}; ${hyp}${tip}.`;
  }

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-b]'));
  buttons.forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      state.b = Number(button.dataset.b);
      buttons.forEach((b) => {
        b.classList.toggle('is-on', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      });
      render();
    });
  });
  el.edgeIn.disabled = false;
  el.edgeIn.addEventListener('input', () => {
    state.L = Number(el.edgeIn.value);
    const o = root.querySelector('#mli-rm-edge-out');
    if (o) o.textContent = state.L.toFixed(1);
    render();
  });
  const controls = root.querySelector<HTMLElement>('#mli-rm-controls');
  if (controls) controls.hidden = false;
  render();
}
