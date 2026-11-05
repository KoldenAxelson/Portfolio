// {{< ml/mutation-test >}}: mutation testing on a leap-year function. Each
// version (the real one and its mutants) is built from the same parameters the
// template reads (see data/ml/mutation-test.yaml), run against each test, and
// a mutant no test in the suite fails survives.
// layouts/shortcodes/ml/mutation-test.html works out the starting suite the
// same way for JS off; keep the two in step.

interface Params {
  four: number;
  first: 'eq' | 'ne';
  century: boolean;
  hundred: 'eq' | 'ne';
  join: 'or' | 'and';
  keep400: boolean;
  fourhundred: number;
}
interface Version {
  name: string;
  code: string;
  params: Params;
}
interface Test {
  label: string;
  year?: number;
  expect?: boolean;
  kind?: 'type';
  inSuite: boolean;
}

const cmp = (v: number, op: 'eq' | 'ne'): boolean => (op === 'eq' ? v === 0 : v !== 0);

export function leap(p: Params, y: number): boolean {
  let a = cmp(y % p.four, p.first);
  if (p.century) a = a && cmp(y % 100, p.hundred);
  if (!p.keep400) return a;
  const b = y % p.fourhundred === 0;
  return p.join === 'or' ? a || b : a && b;
}

function passes(v: Version, t: Test): boolean {
  if (t.kind === 'type') return typeof leap(v.params, 2024) === 'boolean';
  return leap(v.params, t.year ?? 0) === t.expect;
}

export function initMutationTest(root: HTMLElement): void {
  const config = JSON.parse(root.dataset.config ?? 'null') as { versions: Version[]; tests: Test[] } | null;
  const say = root.querySelector<HTMLElement>('#mli-mt-say');
  if (!config || !say) return;
  const sayEl: HTMLElement = say;
  const { versions, tests } = config;
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('[data-test]'));
  const on = tests.map((t) => t.inSuite);

  function render(): void {
    let caught = 0;
    const survivors: string[] = [];
    versions.forEach((v, vi) => {
      const row = root.querySelector<HTMLElement>(`tr[data-row="${vi}"]`);
      if (!row) return;
      let failed = 0;
      tests.forEach((t, ti) => {
        const ok = passes(v, t);
        if (on[ti] && !ok) failed++;
        const cell = row.querySelector<HTMLElement>(`td[data-col="${ti}"]`);
        if (!cell) return;
        cell.textContent = ok ? 'passes' : 'fails';
        cell.classList.toggle('is-pass', ok);
        cell.classList.toggle('is-fail', !ok);
        cell.classList.toggle('is-off', !on[ti]);
      });
      const verdict = row.querySelector('.mli-mt-verdict');
      if (vi === 0) {
        if (verdict) verdict.textContent = failed === 0 ? 'passes, as it should' : 'fails: a test is wrong';
        return;
      }
      if (failed) caught++;
      else survivors.push(v.name);
      row.classList.toggle('is-survivor', failed === 0);
      if (verdict) verdict.textContent = failed ? 'caught' : 'survives';
    });
    root.querySelectorAll<HTMLElement>('th[data-col]').forEach((th) => {
      const off = !on[Number(th.dataset.col)];
      th.classList.toggle('is-off', off);
      const mark = th.querySelector<HTMLElement>('.mli-mt-out');
      if (mark) mark.hidden = !off;
    });
    const total = versions.length - 1;
    const n = on.filter(Boolean).length;
    sayEl.textContent = n === 0 ? 'No tests in the suite: every broken version survives.' : `This suite catches ${caught} of the ${total} broken versions.${survivors.length ? ` Surviving: ${survivors.join('; ')}.` : ' Nothing slips through.'}`;
  }

  boxes.forEach((box) => {
    box.disabled = false;
    box.addEventListener('change', () => {
      on[Number(box.dataset.test)] = box.checked;
      render();
    });
  });
  render();
}
