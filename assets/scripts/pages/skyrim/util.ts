// Shared by the Skyrim modules on /misc/skyrim/. All four render themselves by
// assembling HTML strings, and two of them — the resto planner and the enchant-max
// calculator — read their settings out of `data-f` inputs, so the escaping, the number
// formats and the field readers live here rather than once per module. The builder and
// the filter use the rendering and query helpers only.

/**
 * Safe in an ATTRIBUTE as well as in text, which is the case that matters: most call
 * sites here interpolate into `data-*`, `alt` and `aria-label`. Escaping only `&` and `<`
 * would let a quote in an ingredient name close the attribute and open a tag.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Thousands separators, one decimal below 1000 and none above. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const decimals = Math.abs(value) >= 1000 ? 0 : 1;
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Two decimals. Near a target, 199.96 and 200.04 must not both read "200.0". */
export function formatPrecise(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const decimals = Math.abs(value) >= 1000 ? 0 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** A whole number without a decimal point: "200%", not "200.0%". */
export function formatWhole(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : formatNumber(value);
}

/** "2.5" / "12.5" / "3" — trailing zeroes trimmed so x3 does not read x3.00. */
export function formatMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : String(parseFloat(value.toFixed(2)));
}

export function findField(root: Element, name: string): HTMLInputElement | HTMLSelectElement | null {
  return root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-f="${name}"]`);
}

export function readNumber(root: Element, name: string, fallback: number): number {
  const field = findField(root, name);
  const value = field ? parseFloat(field.value) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

export function readFlag(root: Element, name: string): boolean {
  const field = findField(root, name);
  return field instanceof HTMLInputElement && field.checked;
}

/** Trailing-edge debounce, so a held arrow key costs one recalculation. */
export function debounce(fn: () => void, ms: number): () => void {
  let timer = 0;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  };
}

export function queryAll<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/**
 * Collapse a widget's `[data-config]` panel behind its `[data-config-toggle]` button.
 *
 * The panel ships OPEN with its toggle hidden, so a reader without JavaScript sees the
 * assumptions rather than a dead "+" button. This reveals the button and collapses the
 * panel.
 *
 * Shared rather than owned by the resto planner, because that is exactly how the two
 * widgets drifted apart: two visually identical `.sky-calc` cards, 700px apart on the
 * same page, one collapsing its settings and one rendering 1,747px of them permanently
 * open between the question and the answer.
 */
export function setUpConfigPanel(root: Element): void {
  const panel = root.querySelector<HTMLElement>('[data-config]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-config-toggle]');
  if (!panel || !toggle) return;

  toggle.hidden = false;
  panel.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    toggle.classList.toggle('is-open', !panel.hidden);
  });
}
