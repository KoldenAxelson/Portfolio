// Government deployment map: one card per deployment option, a verdict per
// kind of data. Options and rules come from data/ml/gov-deploy.yaml.

function selectOne(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
  for (const button of buttons) {
    button.classList.toggle('is-on', button === chosen);
    button.setAttribute('aria-pressed', String(button === chosen));
  }
}

export function initGovflow(root: HTMLElement): void {
  const kindButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-kind]')];
  const optionButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-option]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-card]')];
  if (!kindButtons.length || !optionButtons.length || !cards.length) return;

  const verdicts: Record<string, string> = JSON.parse(root.dataset.verdicts ?? '{}');
  let kind = kindButtons.find((button) => button.classList.contains('is-on'))?.dataset.kind ?? 'cui';
  let option = optionButtons[0].dataset.option;

  const render = (): void => {
    for (const card of cards) {
      card.hidden = card.dataset.card !== option;
      const allowed: Record<string, string> = JSON.parse(card.dataset.allowed ?? '{}');
      const answer = allowed[kind] ?? 'no';
      const verdict = card.querySelector<HTMLElement>('[data-verdict]');
      if (!verdict) continue;
      verdict.textContent = verdicts[answer] ?? '';
      verdict.dataset.answer = answer;
    }
  };

  for (const button of kindButtons) {
    button.addEventListener('click', () => {
      kind = button.dataset.kind ?? kind;
      selectOne(kindButtons, button);
      render();
    });
  }
  for (const button of optionButtons) {
    button.addEventListener('click', () => {
      option = button.dataset.option;
      selectOne(optionButtons, button);
      render();
    });
  }
  render();
}
