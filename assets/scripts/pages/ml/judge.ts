// Judge toy: the reader picks the better answer per item, then a scripted
// judge picks too. Its picks depend on which version it reads first, which is
// the point. Items and picks come from data/ml/judge.yaml.

export function initJudge(root: HTMLElement): void {
  const runButton = root.querySelector<HTMLButtonElement>('#mli-judge-run');
  const swapBox = root.querySelector<HTMLInputElement>('#mli-judge-swap');
  const output = root.querySelector<HTMLElement>('#mli-judge-out');
  const caption = root.querySelector<HTMLElement>('#mli-judge-cap');
  const items = [...root.querySelectorAll<HTMLElement>('.mli-judge-item')];
  if (!runButton || !swapBox || !output || !caption || !items.length) return;

  const readerPicks = new Map<HTMLElement, string>();
  let hasRun = false;

  const judgePick = (item: HTMLElement): string => (swapBox.checked ? item.dataset.judgeSwapped : item.dataset.judge) ?? '';

  const renderJudge = (): void => {
    if (!hasRun) return;
    let agreed = 0;
    for (const item of items) {
      const pick = judgePick(item);
      for (const answer of item.querySelectorAll<HTMLElement>('[data-pick]')) {
        answer.classList.toggle('is-judged', answer.dataset.pick === pick);
      }
      if (readerPicks.get(item) === pick) agreed++;
    }
    const graded = readerPicks.size;
    const v2Wins = items.filter((item) => judgePick(item) === 'v2').length;
    output.hidden = false;
    output.replaceChildren(`v2 wins ${v2Wins} of ${items.length} `, Object.assign(document.createElement('small'), { textContent: 'by the judge' }));
    caption.textContent = graded
      ? `Reading ${swapBox.checked ? 'v2' : 'v1'} first, the judge agreed with you on ${agreed} of ${graded}. ${swapBox.checked ? 'Same answers, different order, different winner.' : 'Now flip the order.'}`
      : 'Grade a few yourself first, then compare.';
  };

  for (const item of items) {
    const answers = [...item.querySelectorAll<HTMLButtonElement>('[data-pick]')];
    for (const answer of answers) {
      answer.addEventListener('click', () => {
        readerPicks.set(item, answer.dataset.pick ?? '');
        for (const other of answers) {
          other.classList.toggle('is-on', other === answer);
          other.setAttribute('aria-pressed', String(other === answer));
        }
        renderJudge();
      });
    }
  }
  runButton.addEventListener('click', () => {
    hasRun = true;
    renderJudge();
  });
  swapBox.addEventListener('change', renderJudge);
}
