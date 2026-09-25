// Checkpoint toy: simulate one day in half-minute ticks. Work since the last
// finished checkpoint is lost at each failure, plus a fixed restart. Failure
// times are exponential draws from a fixed seed.

type Tick = 'work' | 'save' | 'lost';

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function failureTimes(totalMin: number, mtbfMin: number, seed: number): number[] {
  const random = seededRandom(seed);
  const times: number[] = [];
  for (let t = -Math.log(1 - random()) * mtbfMin; t < totalMin; t += -Math.log(1 - random()) * mtbfMin) {
    times.push(Math.floor(t));
  }
  return times;
}

// Half-minute ticks, so a 30-second save is representable.
const TICKS_PER_MIN = 2;
const BLOCK_MIN = 10;
const SIMULATED_DAYS = 30;

function markLost(timeline: Tick[], tick: number, count: number): void {
  for (let back = 1; back <= count; back++) timeline[tick - back] = 'lost';
}

function simulateDay(totalTicks: number, failureTicks: Set<number>, intervalTicks: number, saveTicks: number, restartTicks: number): Tick[] {
  const timeline: Tick[] = [];
  let sinceSave = 0;
  let saving = 0;
  let restarting = 0;
  for (let tick = 0; tick < totalTicks; tick++) {
    if (failureTicks.has(tick)) {
      markLost(timeline, tick, sinceSave);
      sinceSave = 0;
      saving = 0;
      restarting = restartTicks;
    }
    if (restarting > 0) {
      restarting--;
      timeline.push('lost');
      continue;
    }
    if (saving > 0) {
      saving--;
      // An unfinished save protects nothing, so its ticks roll back too.
      sinceSave++;
      timeline.push('save');
      if (saving === 0) sinceSave = 0;
      continue;
    }
    timeline.push('work');
    sinceSave++;
    if (sinceSave >= intervalTicks) saving = saveTicks;
  }
  return timeline;
}

function mostCommon(ticks: Tick[]): Tick {
  const counts = { work: 0, save: 0, lost: 0 };
  for (const tick of ticks) counts[tick]++;
  if (counts.lost >= counts.work && counts.lost >= counts.save) return 'lost';
  return counts.save > counts.work ? 'save' : 'work';
}

export function initCheckpoint(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-ckpt-r');
  const intervalLabel = root.querySelector<HTMLElement>('#mli-ckpt-v');
  const strip = root.querySelector<HTMLElement>('#mli-ckpt-strip');
  const output = root.querySelector<HTMLElement>('#mli-ckpt-out');
  const caption = root.querySelector<HTMLElement>('#mli-ckpt-cap');
  const saveButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-save-min]')];
  if (!slider || !intervalLabel || !strip || !output || !caption || !saveButtons.length) return;

  const mtbfMin = Number(root.dataset.mtbfMin);
  const restartMin = Number(root.dataset.restartMin);
  const totalMin = Number(root.dataset.hours) * 60;
  const seed = Number(root.dataset.seed);
  // Averaging many days smooths out one unlucky day; the strip shows the first.
  const days = Array.from({ length: SIMULATED_DAYS }, (_, day) =>
    new Set(failureTimes(totalMin, mtbfMin, seed + day).map((minute) => minute * TICKS_PER_MIN)));
  const averageFailures = days.reduce((sum, day) => sum + day.size, 0) / days.length;
  let saveButton = saveButtons[0];

  const render = (): void => {
    const intervalMin = Number(slider.value);
    const saveMin = Number(saveButton.dataset.saveMin);
    const timelines = days.map((failureTicks) => simulateDay(totalMin * TICKS_PER_MIN, failureTicks, intervalMin * TICKS_PER_MIN, saveMin * TICKS_PER_MIN, restartMin * TICKS_PER_MIN));
    const counts = { work: 0, save: 0, lost: 0 };
    for (const timeline of timelines) for (const tick of timeline) counts[tick]++;
    const ticksPerDay = totalMin * TICKS_PER_MIN;
    const usefulPercent = Math.round((counts.work / (ticksPerDay * days.length)) * 100);
    const timeline = timelines[0];
    const sweetSpotMin = Math.round(Math.sqrt(2 * saveMin * mtbfMin));
    const blockTicks = BLOCK_MIN * TICKS_PER_MIN;

    strip.replaceChildren(...Array.from({ length: totalMin / BLOCK_MIN }, (_, block) => {
      const cell = document.createElement('span');
      cell.className = `mli-ckpt-cell is-${mostCommon(timeline.slice(block * blockTicks, (block + 1) * blockTicks))}`;
      return cell;
    }));
    intervalLabel.textContent = String(intervalMin);
    slider.setAttribute('aria-valuetext', `${intervalMin} minutes`);
    output.replaceChildren(`${usefulPercent}% `, Object.assign(document.createElement('small'), { textContent: 'of the time was useful' }));
    const perDay = (ticks: number): number => Math.round(ticks / TICKS_PER_MIN / days.length);
    caption.textContent = `About ${Math.round(averageFailures)} failures a day. Averaged over ${days.length} simulated days: ${perDay(counts.lost)} minutes a day redone or restarting, ${perDay(counts.save)} spent saving. The Young–Daly rule of thumb puts the sweet spot near ${sweetSpotMin} minutes.`;
  };

  for (const button of saveButtons) {
    button.addEventListener('click', () => {
      saveButton = button;
      for (const other of saveButtons) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      render();
    });
  }
  slider.addEventListener('input', render);
  render();
}
