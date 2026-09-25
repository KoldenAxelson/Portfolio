// Cascade toy: a small model answers every request and reports how sure it
// is; below the threshold, the request is re-asked of a big model. Requests
// are simulated from a fixed seed so every reader sees the same stream.

interface SimRequest {
  smallIsRight: boolean;
  bigIsRight: boolean;
  smallConfidence: number;
}

// Deterministic PRNG (mulberry32), so the demo doesn't change between visits.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Easy requests dominate, as in most real traffic. Confidence tracks
// difficulty with modest noise, so the small model is fairly well calibrated.
function simulate(count: number, seed: number): SimRequest[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const difficulty = random() ** 2;
    return {
      smallIsRight: difficulty + (random() - 0.5) * 0.2 < 0.55,
      bigIsRight: difficulty + (random() - 0.5) * 0.2 < 0.92,
      smallConfidence: Math.min(1, Math.max(0, 1 - difficulty + (random() - 0.5) * 0.3)),
    };
  });
}

export function initRoute(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-route-r');
  const thresholdLabel = root.querySelector<HTMLElement>('#mli-route-v');
  const grid = root.querySelector<HTMLElement>('#mli-route-grid');
  const costOut = root.querySelector<HTMLElement>('#mli-route-cost');
  const rightOut = root.querySelector<HTMLElement>('#mli-route-right');
  const bigRightOut = root.querySelector<HTMLElement>('#mli-route-bigright');
  const caption = root.querySelector<HTMLElement>('#mli-route-cap');
  if (!slider || !thresholdLabel || !grid || !costOut || !rightOut || !bigRightOut || !caption) return;

  const smallCost = Number(root.dataset.smallCost);
  const bigCost = Number(root.dataset.bigCost);
  const requests = simulate(Number(root.dataset.requests), Number(root.dataset.seed));
  const bigRightCount = requests.filter((request) => request.bigIsRight).length;
  const dots = requests.map(() => grid.appendChild(document.createElement('span')));
  bigRightOut.textContent = `${Math.round((bigRightCount / requests.length) * 100)}%`;

  const render = (): void => {
    const threshold = Number(slider.value) / 100;
    let cost = 0;
    let rightCount = 0;
    let escalatedCount = 0;
    requests.forEach((request, i) => {
      const isEscalated = request.smallConfidence < threshold;
      const isRight = isEscalated ? request.bigIsRight : request.smallIsRight;
      cost += isEscalated ? smallCost + bigCost : smallCost;
      if (isRight) rightCount++;
      if (isEscalated) escalatedCount++;
      dots[i].className = `mli-route-dot ${isEscalated ? 'is-big' : 'is-small'}${isRight ? '' : ' is-wrong'}`;
    });
    const costPercent = Math.round((cost / (requests.length * bigCost)) * 100);
    thresholdLabel.textContent = slider.value;
    slider.setAttribute('aria-valuetext', `${slider.value} percent`);
    costOut.textContent = `${costPercent}%`;
    rightOut.textContent = `${Math.round((rightCount / requests.length) * 100)}%`;
    caption.textContent = `${escalatedCount} of ${requests.length} requests went to the big model. The bill is ${costPercent}% of sending everything there, and ${rightCount} answers are right against ${bigRightCount} for the big model alone.`;
  };

  slider.addEventListener('input', render);
  render();
}
