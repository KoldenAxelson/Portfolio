// Prefill/decode toy: the prompt's tokens all enter the KV cache in one step,
// then answer tokens arrive one at a time, each adding a cache slot. Timings
// and sizes come from the shortcode's data-* attributes. With reduced motion,
// the whole run appears at once.

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

export function initDecode(root: HTMLElement): void {
  const goButton = root.querySelector<HTMLButtonElement>('#mli-dcd-go');
  const phase = root.querySelector<HTMLElement>('#mli-dcd-phase');
  const text = root.querySelector<HTMLElement>('#mli-dcd-text');
  const cache = root.querySelector<HTMLElement>('#mli-dcd-cache');
  const ttftOut = root.querySelector<HTMLElement>('#mli-dcd-ttft');
  const tokensOut = root.querySelector<HTMLElement>('#mli-dcd-tokens');
  const memoryOut = root.querySelector<HTMLElement>('#mli-dcd-mb');
  if (!goButton || !phase || !text || !cache || !ttftOut || !tokensOut || !memoryOut) return;

  const promptTokens = (root.dataset.prompt ?? '').split(' ');
  const answerTokens = (root.dataset.answer ?? '').split(' ');
  const prefillMs = Number(root.dataset.prefillMs);
  const tokenMs = Number(root.dataset.tokenMs);
  const kbPerToken = Number(root.dataset.kbPerToken);
  const shouldAnimate = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  const addToCache = (count: number, kind: string): void => {
    for (let i = 0; i < count; i++) {
      const slot = document.createElement('span');
      slot.className = `mli-dcd-slot is-${kind}`;
      cache.append(slot);
    }
    const total = cache.childElementCount;
    tokensOut.textContent = String(total);
    memoryOut.textContent = `${((total * kbPerToken) / 1000).toFixed(1)} MB`;
  };

  const setPhase = (name: string): void => {
    phase.textContent = name;
    phase.classList.toggle('is-active', name !== 'Idle' && name !== 'Done');
  };

  const run = async (): Promise<void> => {
    goButton.disabled = true;
    cache.replaceChildren();
    ttftOut.textContent = '–';
    text.replaceChildren(document.createTextNode(promptTokens.join(' ')));
    const answer = document.createElement('span');
    answer.className = 'mli-dcd-answer';
    text.append(document.createElement('br'), answer);

    setPhase('Prefill: reading the whole prompt at once');
    if (shouldAnimate) await wait(prefillMs);
    addToCache(promptTokens.length, 'prompt');

    setPhase('Decode: one token at a time');
    for (const [i, token] of answerTokens.entries()) {
      if (shouldAnimate && i > 0) await wait(tokenMs);
      if (i === 0) ttftOut.textContent = `${prefillMs} ms`;
      if (!root.isConnected) return;
      answer.append(`${i ? ' ' : ''}${token}`);
      addToCache(1, 'answer');
    }
    setPhase('Done');
    goButton.disabled = false;
  };

  goButton.addEventListener('click', () => { void run(); });
}
