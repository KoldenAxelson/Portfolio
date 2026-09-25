// Break-even toy: API bills scale with tokens; rented GPUs cost the same
// whether busy or idle. Prices and constants come from the shortcode's data-*
// attributes, which also feed its JS-off state.

const SECONDS_PER_DAY = 86_400;

function formatTokens(tokens: number): string {
  if (tokens >= 1e9) return `${(tokens / 1e9).toFixed(1)}B`;
  if (tokens >= 1e6) return `${Math.round(tokens / 1e6)}M`;
  return `${Math.round(tokens / 1e3)}K`;
}

function formatDollars(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString()}`;
}

export function initBreakeven(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-be-r');
  const label = root.querySelector<HTMLElement>('#mli-be-v');
  const caption = root.querySelector<HTMLElement>('#mli-be-cap');
  const rows = [...root.querySelectorAll<HTMLElement>('[data-kind]')];
  // The fair comparison is the same open model: its hosted API vs. the GPUs.
  const baselineRow = rows.find((row) => 'baseline' in row.dataset);
  const gpuRow = rows.find((row) => row.dataset.kind === 'gpu');
  if (!slider || !label || !caption || !baselineRow || !gpuRow) return;

  const hoursPerMonth = Number(root.dataset.hoursPerMonth);
  const daysPerMonth = hoursPerMonth / 24;
  const inputShare = Number(root.dataset.inputShare);
  const minTokensPerDay = Number(root.dataset.minTokensPerDay);
  const stepsPerDecade = Number(root.dataset.stepsPerDecade);

  const monthlyCost = (row: HTMLElement, tokensPerDay: number): number => {
    if (row.dataset.kind === 'gpu') return Number(row.dataset.gpus) * Number(row.dataset.perGpuHour) * hoursPerMonth;
    const perMillion = inputShare * Number(row.dataset.inPerM) + (1 - inputShare) * Number(row.dataset.outPerM);
    return (tokensPerDay * daysPerMonth * perMillion) / 1e6;
  };

  const render = (): void => {
    const tokensPerDay = minTokensPerDay * 10 ** (Number(slider.value) / stepsPerDecade);
    const costs = rows.map((row) => monthlyCost(row, tokensPerDay));
    const cheapest = costs.indexOf(Math.min(...costs));
    rows.forEach((row, i) => {
      row.classList.toggle('is-cheapest', i === cheapest);
      const cost = row.querySelector<HTMLElement>('.mli-be-cost');
      if (cost) cost.textContent = `${formatDollars(costs[i])} / mo`;
    });
    label.textContent = formatTokens(tokensPerDay);
    slider.setAttribute('aria-valuetext', `${formatTokens(tokensPerDay)} tokens a day`);

    const breakEvenPerDay = monthlyCost(gpuRow, 0) / monthlyCost(baselineRow, 1);
    const tokensPerSecond = Math.round(breakEvenPerDay / SECONDS_PER_DAY);
    caption.textContent = `To beat the hosted API on price, the two GPUs need about ${formatTokens(breakEvenPerDay)} tokens a day: ${tokensPerSecond.toLocaleString()} every second, around the clock.`;
  };

  slider.addEventListener('input', render);
  render();
}
