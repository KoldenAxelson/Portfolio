// Entry for /misc/ikigai/, shipped only there (layouts/partials/ikigai/assets.html).
// Remembers the visitor's ticked habits (layouts/shortcodes/ikigai/pillar.html) and
// their four ikigai answers (layouts/shortcodes/ikigai/venn.html), and keeps every
// count and bar on the page current: the overview tiles
// (layouts/shortcodes/ikigai/overview.html), each pillar, and each group.
//
// Storage is best effort: private browsing or a full quota throws on write, and a
// stale value fails to parse on read. Either way the page keeps working in memory.
// Bump the -vN suffix if a stored shape changes.

const HABITS_KEY = 'ikigai-habits-v1';
const ANSWERS_KEY = 'ikigai-answers-v1';
const SAVED_FADE_MS = 1500;
const CLEAR_ARMED_MS = 4000;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored on purpose; see the note at the top.
  }
}

function forget(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same as write: nothing to do but carry on.
  }
}

function readHabits(): Set<string> {
  const stored = read(HABITS_KEY);
  return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []);
}

function readAnswers(): Record<string, string> {
  const stored = read(ANSWERS_KEY);
  if (!stored || typeof stored !== 'object') return {};
  return Object.fromEntries(
    Object.entries(stored as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

const all = <T extends Element>(root: ParentNode, selector: string): T[] => Array.from(root.querySelectorAll<T>(selector));

// Fill a count element and the bar beside it (the bar reads --ikigai-progress
// from the count's parent; see .ikigai-bar in ikigai.css).
function showProgress(count: HTMLElement | null, done: number, total: number, noun: string): void {
  if (!count) return;
  count.textContent = `${done} of ${total} ${noun}`;
  count.hidden = false;
  count.parentElement?.style.setProperty('--ikigai-progress', `${total ? (done / total) * 100 : 0}%`);
}

function refresh(): void {
  for (const pillar of all<HTMLElement>(document, '[data-ikigai-pillar]')) {
    const boxes = all<HTMLInputElement>(pillar, '[data-ikigai-habit]');
    const done = boxes.filter((box) => box.checked).length;
    const progress = pillar.querySelector<HTMLElement>('[data-ikigai-progress]');
    if (progress) progress.hidden = false;
    showProgress(progress?.querySelector<HTMLElement>('[data-ikigai-count]') ?? null, done, boxes.length, 'in place');
    const tile = document.querySelector<HTMLElement>(`[data-ikigai-overview="${pillar.dataset.ikigaiPillar}"]`);
    showProgress(tile?.querySelector<HTMLElement>('[data-ikigai-count]') ?? null, done, boxes.length, 'in place');

    for (const group of all<HTMLElement>(pillar, '[data-ikigai-group]')) {
      const count = group.querySelector<HTMLElement>('[data-ikigai-count]');
      const groupBoxes = all<HTMLInputElement>(group, '[data-ikigai-habit]');
      if (!count || !groupBoxes.length) continue;
      const groupDone = groupBoxes.filter((box) => box.checked).length;
      count.textContent = `${groupDone}/${groupBoxes.length}`;
      count.hidden = false;
      count.classList.toggle('is-complete', groupDone === groupBoxes.length);
    }
  }

  const answers = all<HTMLTextAreaElement>(document, '[data-ikigai-answer]');
  const answered = answers.filter((box) => box.value.trim()).length;
  const wholeTile = document.querySelector<HTMLElement>('[data-ikigai-overview="whole"]');
  showProgress(wholeTile?.querySelector<HTMLElement>('[data-ikigai-count]') ?? null, answered, answers.length, 'answered');
}

function mountHabits(): void {
  const ticked = readHabits();
  for (const pillar of all<HTMLElement>(document, '[data-ikigai-pillar]')) {
    if (pillar.dataset.mounted) continue;
    pillar.dataset.mounted = 'true';
    for (const box of all<HTMLInputElement>(pillar, '[data-ikigai-habit]')) {
      box.checked = ticked.has(box.dataset.ikigaiHabit ?? '');
    }
    pillar.addEventListener('change', (e) => {
      const box = (e.target as HTMLElement).closest<HTMLInputElement>('[data-ikigai-habit]');
      const id = box?.dataset.ikigaiHabit;
      if (!box || !id) return;
      // Re-read first, so ticks made in another tab since this one loaded survive.
      const latest = readHabits();
      if (box.checked) latest.add(id);
      else latest.delete(id);
      write(HABITS_KEY, Array.from(latest));
      refresh();
    });
  }
}

function mountAnswers(): void {
  const answers = readAnswers();
  for (const box of all<HTMLTextAreaElement>(document, '[data-ikigai-answer]')) {
    const id = box.dataset.ikigaiAnswer;
    if (!id || box.dataset.mounted) continue;
    box.dataset.mounted = 'true';
    box.value = answers[id] ?? '';
    const saved = box.parentElement?.querySelector<HTMLElement>('[data-ikigai-saved]');
    let fadeTimer = 0;
    box.addEventListener('input', () => {
      write(ANSWERS_KEY, { ...readAnswers(), [id]: box.value });
      refresh();
      if (!saved) return;
      saved.textContent = 'Saved';
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        saved.textContent = '';
      }, SAVED_FADE_MS);
    });
  }
}

// Two taps to clear, so a stray click can't wipe someone's answers (and no
// confirm() dialog, which the site avoids).
function mountClear(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-ikigai-clear]');
  if (!button || button.dataset.mounted) return;
  button.dataset.mounted = 'true';
  const idleLabel = button.textContent ?? '';
  let disarmTimer = 0;
  const disarm = (): void => {
    button.classList.remove('is-armed');
    button.textContent = idleLabel;
  };
  button.addEventListener('click', () => {
    if (!button.classList.contains('is-armed')) {
      button.classList.add('is-armed');
      button.textContent = 'Tap again to clear everything';
      disarmTimer = window.setTimeout(disarm, CLEAR_ARMED_MS);
      return;
    }
    window.clearTimeout(disarmTimer);
    forget(HABITS_KEY);
    forget(ANSWERS_KEY);
    for (const box of all<HTMLInputElement>(document, '[data-ikigai-habit]')) box.checked = false;
    for (const box of all<HTMLTextAreaElement>(document, '[data-ikigai-answer]')) box.value = '';
    disarm();
    refresh();
  });
  button.hidden = false;
}

function mountAll(): void {
  mountHabits();
  mountAnswers();
  mountClear();
  refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll);
} else {
  mountAll();
}
// hx-boost swaps <body> without a reload; every widget marks itself mounted.
document.addEventListener('htmx:afterSettle', mountAll);
