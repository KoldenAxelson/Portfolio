// code-stepper — steps a Python for ML snippet one line at a time, beside the
// arrays and tables each line produced (layouts/shortcodes/code-stepper.html).
//
// The first step is already in the DOM from the shortcode, so this enhances
// rather than builds: it reveals the Back / Next buttons and redraws only what
// a step changes. A panel whose values are unchanged keeps its element and just
// moves its highlight; only a panel that is new, or holds different values,
// is rebuilt and faded in. The active code line moves by class, so CSS owns
// that transition. Nothing loops, so there is no timer to clean up.
//
// Panel markup mirrors layouts/partials/code-stepper-panel.html: change one,
// change the other.

interface Panel {
  title: string;
  meta?: string;
  kind: 'grid' | 'table' | 'text';
  cells?: string[][];
  layers?: string[][][];
  columns?: string[];
  index?: string[];
  index_name?: string;
  rows?: string[][];
  text?: string;
  lit?: string[];
}

interface Step {
  line: number;
  label: string;
  panels: Panel[];
  note?: string;
}

interface StepperData {
  caption: string;
  code: string[];
  steps: Step[];
}

const IN_MS = 260;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const FADE_IN: Keyframe[] = [
  { opacity: 0, transform: 'translateY(6px)' },
  { opacity: 1, transform: 'translateY(0)' },
];

const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Two panels hold the same values when everything but the highlight matches.
function valuesKey(panel: Panel): string {
  return JSON.stringify({ ...panel, lit: undefined });
}

function readData(root: HTMLElement): StepperData | null {
  const holder = root.querySelector('[data-cs-data]');
  if (!holder?.textContent) return null;
  try {
    return JSON.parse(holder.textContent) as StepperData;
  } catch {
    return null;
  }
}

function gridTable(cells: string[][], keyPrefix: string): HTMLTableElement {
  const table = element('table', 'cs-grid');
  const body = element('tbody');
  cells.forEach((values, row) => {
    const tr = element('tr');
    values.forEach((value, col) => {
      const td = element('td', '', value);
      td.dataset.cell = `${keyPrefix}${row},${col}`;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  table.appendChild(body);
  return table;
}

function frameTable(panel: Panel): HTMLTableElement {
  const table = element('table', 'cs-table');
  const head = element('thead');
  const headRow = element('tr');
  headRow.appendChild(element('th', 'cs-table__index-name', panel.index_name ?? ''));
  for (const column of panel.columns ?? []) {
    const th = element('th', '', column);
    th.scope = 'col';
    headRow.appendChild(th);
  }
  head.appendChild(headRow);
  table.appendChild(head);

  const body = element('tbody');
  (panel.rows ?? []).forEach((values, row) => {
    const tr = element('tr');
    const label = element('th', '', panel.index?.[row] ?? '');
    label.scope = 'row';
    tr.appendChild(label);
    values.forEach((value, col) => {
      const td = element('td', '', value);
      td.dataset.cell = `${row},${col}`;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  table.appendChild(body);
  return table;
}

function panelBody(panel: Panel): HTMLElement {
  if (panel.kind === 'table') return frameTable(panel);
  if (panel.kind === 'text') return element('pre', 'cs-text', panel.text ?? '');
  const layers = element('div', 'cs-layers');
  if (panel.layers) {
    panel.layers.forEach((cells, layer) => layers.appendChild(gridTable(cells, `${layer},`)));
  } else {
    layers.appendChild(gridTable(panel.cells ?? [], ''));
  }
  return layers;
}

function buildPanel(panel: Panel): HTMLElement {
  const wrap = element('div', 'cs-panel');
  wrap.dataset.csTitle = panel.title;
  const title = element('p', 'cs-panel__title');
  title.appendChild(element('code', '', panel.title));
  if (panel.meta) {
    title.appendChild(document.createTextNode(' '));
    title.appendChild(element('span', 'cs-panel__meta', panel.meta));
  }
  wrap.append(title, panelBody(panel));
  return wrap;
}

// The server-rendered cells carry no data-cell key, so number them the way
// buildPanel does before the first highlight is applied.
function keyServerCells(panelEl: HTMLElement): void {
  const grids = panelEl.querySelectorAll<HTMLTableElement>('table.cs-grid');
  const isLayered = grids.length > 1;
  grids.forEach((table, layer) => {
    table.querySelectorAll('tr').forEach((tr, row) => {
      tr.querySelectorAll('td').forEach((td, col) => {
        td.dataset.cell = isLayered ? `${layer},${row},${col}` : `${row},${col}`;
      });
    });
  });
  panelEl.querySelectorAll<HTMLTableElement>('table.cs-table tbody tr').forEach((tr, row) => {
    tr.querySelectorAll('td').forEach((td, col) => {
      td.dataset.cell = `${row},${col}`;
    });
  });
}

function applyLit(panelEl: HTMLElement, lit: string[] | undefined): void {
  const keys = new Set(lit ?? []);
  panelEl.querySelectorAll<HTMLElement>('td[data-cell]').forEach((td) => {
    td.classList.toggle('is-lit', keys.has(td.dataset.cell ?? ''));
  });
}

function mount(root: HTMLElement): void {
  const data = readData(root);
  const panelsEl = root.querySelector<HTMLElement>('[data-cs-panels]');
  const label = root.querySelector<HTMLElement>('[data-cs-label]');
  const count = root.querySelector<HTMLElement>('[data-cs-count]');
  const note = root.querySelector<HTMLElement>('[data-cs-note]');
  const controls = root.querySelector<HTMLElement>('[data-cs-controls]');
  const prev = root.querySelector<HTMLButtonElement>('[data-cs-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-cs-next]');
  if (!data?.steps.length || !panelsEl || !label || !count || !note || !controls || !prev || !next) return;

  root.dataset.csReady = '1';
  const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-cs-line]'));
  const shown = new Map<HTMLElement, string>();
  panelsEl.querySelectorAll<HTMLElement>('.cs-panel').forEach((panelEl, i) => {
    keyServerCells(panelEl);
    const first = data.steps[0]?.panels[i];
    if (first) shown.set(panelEl, valuesKey(first));
  });
  let current = 0;

  const showPanels = (panels: Panel[]): void => {
    const reusable = Array.from(shown.entries());
    const ordered: HTMLElement[] = panels.map((panel) => {
      const key = valuesKey(panel);
      const match = reusable.find(([el, k]) => k === key && el.dataset.csTitle === panel.title);
      if (match) {
        reusable.splice(reusable.indexOf(match), 1);
        applyLit(match[0], panel.lit);
        return match[0];
      }
      const built = buildPanel(panel);
      applyLit(built, panel.lit);
      shown.set(built, key);
      if (!reduceMotion()) built.animate(FADE_IN, { duration: IN_MS, easing: EASE_OUT, fill: 'backwards' });
      return built;
    });
    for (const [stale] of reusable) shown.delete(stale);
    panelsEl.replaceChildren(...ordered);
  };

  const go = (index: number): void => {
    const step = data.steps[index];
    if (!step) return;
    current = index;
    label.textContent = step.label;
    count.textContent = `Step ${index + 1} of ${data.steps.length}`;
    lines.forEach((line, i) => line.classList.toggle('is-active', i === step.line));
    note.textContent = step.note ?? '';
    note.hidden = !step.note;
    showPanels(step.panels);
    prev.disabled = index === 0;
    const isLast = index === data.steps.length - 1;
    next.textContent = isLast ? 'Start over' : 'Next →';
    next.setAttribute('aria-label', isLast ? 'Back to the first step' : 'Next step');
  };

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current === data.steps.length - 1 ? 0 : current + 1));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' && current < data.steps.length - 1) go(current + 1);
    else if (event.key === 'ArrowLeft' && current > 0) go(current - 1);
  });

  controls.hidden = false;
  go(0);
}

function init(): void {
  document.querySelectorAll<HTMLElement>('[data-code-stepper]').forEach((root) => {
    if (!root.dataset.csReady) mount(root);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
document.addEventListener('htmx:afterSettle', init);
