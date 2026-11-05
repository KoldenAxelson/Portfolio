// {{< ml/token-ids >}}: pick a sentence and see GPT-2's real tokens and row
// numbers. The shortcode renders every sentence's chips from
// data/ml/token-ids.yaml (real tiktoken output), so this script only switches
// between sentences and lights up every copy of the token under the pointer.

export function initTokenIds(root: HTMLElement): void {
  const presets = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-preset]'));
  const sentences = Array.from(root.querySelectorAll<HTMLElement>('[data-sentence]'));
  if (!presets.length || !sentences.length) return;

  function lightUp(token: string | null): void {
    for (const chip of root.querySelectorAll<HTMLElement>('.mli-tid-chip')) {
      chip.classList.toggle('is-same', token !== null && chip.dataset.token === token);
    }
  }

  for (const sentence of sentences) {
    sentence.addEventListener('pointerover', (event) => {
      const chip = (event.target as Element).closest<HTMLElement>('.mli-tid-chip');
      lightUp(chip?.dataset.token ?? null);
    });
    sentence.addEventListener('pointerleave', () => lightUp(null));
  }

  for (const button of presets) {
    button.disabled = false;
    button.addEventListener('click', () => {
      const pick = button.dataset.preset;
      for (const other of presets) {
        other.classList.toggle('is-on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      for (const sentence of sentences) sentence.hidden = sentence.dataset.sentence !== pick;
      lightUp(null);
    });
  }
}
