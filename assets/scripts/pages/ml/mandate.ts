// Mandate checks: one signed mandate, six carts from a shopping agent, and the
// payment layer's checks on each. The model is never consulted; the checks
// only read the cart, the mandate and the token. Scenario text comes from
// data/ml/mandate.yaml via the shortcode's data-* attributes.

interface Mandate {
  merchant: string;
  days: number;
}

interface Check {
  id: string;
  label: string;
  fail: string;
}

interface Cart {
  shop: string;
  signed: boolean;
  total: number;
  charge: number;
  day: number;
  reused: boolean;
}

const money = (n: number): string => `$${n.toFixed(2)}`;

function fillIn(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function runChecks(cart: Cart, mandate: Mandate, limit: number): Record<string, boolean> {
  return {
    merchant: cart.shop === mandate.merchant,
    signed: cart.signed,
    charge: Math.abs(cart.charge - cart.total) < 0.005,
    limit: cart.total <= limit,
    expiry: cart.day <= mandate.days,
    token: !cart.reused,
  };
}

function selectOne(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
  for (const button of buttons) {
    button.classList.toggle('is-on', button === chosen);
    button.setAttribute('aria-pressed', String(button === chosen));
  }
}

export function initMandate(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-mnd-r');
  const limitLabel = root.querySelector<HTMLElement>('#mli-mnd-v');
  const picks = [...root.querySelectorAll<HTMLButtonElement>('[data-pick]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  if (!slider || !limitLabel || !picks.length || !cards.length) return;

  const mandate: Mandate = JSON.parse(root.dataset.mandate ?? '{}');
  const checks: Check[] = JSON.parse(root.dataset.checks ?? '[]');
  const paid = root.dataset.paid ?? '';
  let shown = picks[0].dataset.pick;

  const renderCard = (card: HTMLElement, limit: number): void => {
    const cart: Cart = JSON.parse(card.dataset.detail ?? '{}');
    const results = runChecks(cart, mandate, limit);
    for (const check of checks) {
      const row = card.querySelector<HTMLElement>(`[data-check="${check.id}"]`);
      const mark = row?.querySelector<HTMLElement>('.mli-mnd-mark');
      const status = row?.querySelector<HTMLElement>('.sr-only');
      if (!row || !mark || !status) continue;
      const ok = results[check.id];
      row.classList.toggle('is-pass', ok);
      row.classList.toggle('is-fail', !ok);
      mark.textContent = ok ? '✓' : '✗';
      status.textContent = ok ? ' (passed)' : ' (failed)';
    }
    const firstFailure = checks.find((check) => !results[check.id]);
    const verdict = card.querySelector<HTMLElement>('[data-verdict]');
    if (!verdict) return;
    verdict.textContent = fillIn(firstFailure ? `Blocked. ${firstFailure.fail}` : paid, {
      shop: cart.shop,
      total: money(cart.total),
      charge: money(cart.charge),
      limit: `$${limit}`,
      hours: String(mandate.days * 24),
    });
  };

  const render = (): void => {
    const limit = Number(slider.value);
    limitLabel.textContent = `$${limit}`;
    slider.setAttribute('aria-valuetext', `${limit} dollars`);
    for (const card of cards) {
      card.hidden = card.dataset.card !== shown;
      renderCard(card, limit);
    }
  };

  for (const button of picks) {
    button.addEventListener('click', () => {
      shown = button.dataset.pick;
      selectOne(picks, button);
      render();
    });
  }
  slider.addEventListener('input', render);
  render();
}
