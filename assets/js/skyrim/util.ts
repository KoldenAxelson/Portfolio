// Shared by the Skyrim modules on /misc/skyrim/. Both the resto planner and the
// potion builder render themselves by assembling HTML strings and both read
// their settings out of `data-f` inputs, so the escaping, the number formats and
// the field readers live here rather than once per module.

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
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
