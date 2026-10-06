// Context budget: setup (system prompt, AGENTS.md, skills, tool definitions)
// plus the work so far, against one context window. Compaction shrinks only
// the work. Numbers come from data/ml/context-budget.yaml via data-config.

interface Option {
  id: string;
  label: string;
  tokens: number;
  choices?: string;
}

interface Budget {
  window: number;
  compact_at: number;
  compact_keep: number;
  step_tokens: number;
  fixed: { label: string; tokens: number }[];
  skills: { options: Option[] };
  tools: { options: Option[] };
}

const format = (n: number): string => Math.round(n).toLocaleString('en-US');

function selectOne(buttons: HTMLButtonElement[], chosen: HTMLButtonElement): void {
  for (const button of buttons) {
    button.classList.toggle('is-on', button === chosen);
    button.setAttribute('aria-pressed', String(button === chosen));
  }
}

export function initContext(root: HTMLElement): void {
  const slider = root.querySelector<HTMLInputElement>('#mli-ctx-r');
  const stepsLabel = root.querySelector<HTMLElement>('#mli-ctx-v');
  const compactBox = root.querySelector<HTMLInputElement>('#mli-ctx-compact');
  const usedLabel = root.querySelector<HTMLElement>('#mli-ctx-used');
  const fill = root.querySelector<HTMLElement>('#mli-ctx-fill');
  const mark = root.querySelector<HTMLElement>('#mli-ctx-mark');
  const free = root.querySelector<HTMLElement>('#mli-ctx-free');
  const setupShare = root.querySelector<HTMLElement>('#mli-ctx-setup');
  const toolChoices = root.querySelector<HTMLElement>('#mli-ctx-tools');
  const caption = root.querySelector<HTMLElement>('#mli-ctx-cap');
  const skillButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-skills]')];
  const toolButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-tools]')];
  const rows = new Map([...root.querySelectorAll<HTMLElement>('[data-row]')].map((row) => [row.dataset.row ?? '', row]));
  if (!slider || !stepsLabel || !compactBox || !usedLabel || !fill || !mark || !free || !setupShare || !toolChoices || !caption) return;

  const budget: Budget = JSON.parse(root.dataset.config ?? '{}');
  const fixedTokens = budget.fixed.reduce((sum, item) => sum + item.tokens, 0);
  const share = (tokens: number): number => (tokens / budget.window) * 100;
  let skills = budget.skills.options[0];
  let tools = budget.tools.options[0];

  const setRow = (key: string, tokens: number, label?: string): void => {
    const row = rows.get(key);
    const bar = row?.querySelector<HTMLElement>('.mli-roof-fill');
    const value = row?.querySelector<HTMLElement>('.mli-roof-ms');
    if (!row || !bar || !value) return;
    bar.style.width = `${Math.min(share(tokens), 100)}%`;
    value.textContent = format(tokens);
    const name = row.querySelector<HTMLElement>('.mli-roof-lab');
    if (name && label) name.textContent = label;
  };

  const render = (): void => {
    const steps = Number(slider.value);
    const setup = fixedTokens + skills.tokens + tools.tokens;
    const rawWork = steps * budget.step_tokens;
    const compacts = compactBox.checked && rawWork > 0 && setup + rawWork > budget.compact_at;
    const work = compacts ? rawWork * budget.compact_keep : rawWork;
    const used = setup + work;
    const over = used > budget.window;

    stepsLabel.textContent = String(steps);
    slider.setAttribute('aria-valuetext', `${steps} steps, ${format(rawWork)} tokens`);
    setRow('skills', skills.tokens);
    setRow('tools', tools.tokens);
    setRow('work', work, compacts ? 'Summary of work' : 'Work so far');

    usedLabel.textContent = `${format(used)} / ${format(budget.window)}`;
    fill.style.width = `${Math.min(share(used), 100)}%`;
    fill.classList.toggle('mli-bad', over);
    mark.hidden = !compactBox.checked;
    free.textContent = over ? `−${format(used - budget.window)}` : format(budget.window - used);
    setupShare.textContent = `${Math.round(share(setup))}%`;
    toolChoices.textContent = tools.choices ?? '';

    if (over) {
      caption.textContent = `That's ${format(used - budget.window)} tokens more than the window holds. The request fails, or the harness has to throw something away, and it won't always pick what you would.`;
    } else if (compactBox.checked && setup > budget.compact_at) {
      caption.textContent = 'Compaction can only summarize the work. The setup alone is past the trigger, so every step compacts and the agent keeps losing its notes.';
    } else if (compacts) {
      caption.textContent = `Compacted: ${format(rawWork)} tokens of work became a ${format(work)}-token summary. Room is back, but anything the summary left out is gone.`;
    } else {
      caption.textContent = `${Math.round(share(setup))}% of the window is spent before the agent reads a single file.`;
    }
  };

  for (const button of skillButtons) {
    button.addEventListener('click', () => {
      skills = budget.skills.options.find((option) => option.id === button.dataset.skills) ?? skills;
      selectOne(skillButtons, button);
      render();
    });
  }
  for (const button of toolButtons) {
    button.addEventListener('click', () => {
      tools = budget.tools.options.find((option) => option.id === button.dataset.tools) ?? tools;
      selectOne(toolButtons, button);
      render();
    });
  }
  slider.addEventListener('input', render);
  compactBox.addEventListener('change', render);
  render();
}
