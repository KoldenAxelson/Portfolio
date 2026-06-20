// AI chat widget — vanilla, no framework. Wired into ts/main.ts and re-run after
// every hx-boost body swap (initAiWidget is idempotent). Conversation state lives
// in module scope so it survives boosted navigations within the tab; it is never
// persisted to storage (per spec: in-memory only).
//
// The widget talks to a single endpoint (the Cloudflare Worker URL, read from a
// data attribute). No secrets touch the client. Response contract handled below:
//   200 { reply }
//   429 { error:"rate_limited", scope:"minute"|"day" }
//   503 { error:"spike_detected" | "model_timeout" }
//   other → generic failure.

interface Msg {
  role: 'user' | 'bot' | 'system';
  text: string;
  cta?: boolean; // system message that should render the contact link
}

const history: Msg[] = [];
let dayLimitReached = false;
let pending = false;
let globalsWired = false;

const DAY_LIMIT_MSG = "You've reached the daily question limit. For more, ";
const SPIKE_MSG =
  'High traffic detected — this feature is temporarily unavailable. Try again shortly.';
const TIMEOUT_MSG = 'The model took too long to respond. Try again.';
const MINUTE_MSG = "You're sending messages a little fast — give it a moment, then try again.";
const GENERIC_MSG = 'Something went wrong. Please try again.';

function widgetEls() {
  const root = document.querySelector<HTMLElement>('[data-ai-widget]');
  if (!root) return null;
  return {
    root,
    panel: root.querySelector<HTMLElement>('[data-ai-panel]'),
    scrim: root.querySelector<HTMLElement>('[data-ai-scrim]'),
    log: root.querySelector<HTMLElement>('[data-ai-log]'),
    intro: root.querySelector<HTMLElement>('[data-ai-intro]'),
    typing: root.querySelector<HTMLElement>('[data-ai-typing]'),
    form: root.querySelector<HTMLFormElement>('[data-ai-form]'),
    input: root.querySelector<HTMLTextAreaElement>('[data-ai-input]'),
    send: root.querySelector<HTMLButtonElement>('[data-ai-send]'),
    triggers: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ai-trigger]')),
    endpoint: root.dataset.aiEndpoint || '',
    contact: root.dataset.aiContact || '',
  };
}

function isOpen(root: HTMLElement): boolean {
  return root.hasAttribute('data-open');
}

function setOpen(open: boolean): void {
  const els = widgetEls();
  if (!els || !els.panel) return;
  const { root, panel, scrim, input, triggers } = els;
  if (open) {
    root.setAttribute('data-open', '');
    panel.setAttribute('aria-hidden', 'false');
    if (scrim) scrim.hidden = false;
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
    // Focus the input once the entrance transition has started.
    window.setTimeout(() => input?.focus(), 50);
  } else {
    root.removeAttribute('data-open');
    panel.setAttribute('aria-hidden', 'true');
    if (scrim) scrim.hidden = true;
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
  }
}

// --- Rendering -------------------------------------------------------------

function bubble(msg: Msg, contact: string): HTMLElement {
  const el = document.createElement('div');
  if (msg.role === 'user') el.className = 'ai-msg ai-msg-user';
  else if (msg.role === 'bot') el.className = 'ai-msg ai-msg-bot';
  else el.className = 'ai-msg ai-msg-system';

  if (msg.cta) {
    // Build the contact CTA with a real link node — never innerHTML.
    el.appendChild(document.createTextNode(DAY_LIMIT_MSG));
    const a = document.createElement('a');
    a.href = contact || '#';
    a.textContent = 'contact Konrad →';
    el.appendChild(a);
  } else {
    el.textContent = msg.text; // textContent escapes; replies render as plain text
  }
  return el;
}

function renderHistory(): void {
  const els = widgetEls();
  if (!els || !els.log) return;
  const { log, intro, contact } = els;
  // Clear any previously-rendered bubbles (keep the intro line).
  log.querySelectorAll('.ai-msg').forEach((n) => n.remove());
  if (intro) intro.hidden = history.length > 0;
  for (const msg of history) log.appendChild(bubble(msg, contact));
  scrollLogToBottom();
}

function pushMessage(msg: Msg): void {
  history.push(msg);
  const els = widgetEls();
  if (!els || !els.log) return;
  if (els.intro) els.intro.hidden = true;
  els.log.appendChild(bubble(msg, els.contact));
  scrollLogToBottom();
}

function scrollLogToBottom(): void {
  const els = widgetEls();
  if (els?.log) els.log.scrollTop = els.log.scrollHeight;
}

function setTyping(on: boolean): void {
  const els = widgetEls();
  if (els?.typing) els.typing.hidden = !on;
  if (on) scrollLogToBottom();
}

function lockForDayLimit(): void {
  dayLimitReached = true;
  const els = widgetEls();
  if (!els) return;
  if (els.input) {
    els.input.disabled = true;
    els.input.placeholder = 'Daily limit reached';
  }
  if (els.send) els.send.disabled = true;
}

function updateSendState(): void {
  const els = widgetEls();
  if (!els || !els.send || !els.input) return;
  els.send.disabled = pending || dayLimitReached || els.input.value.trim() === '';
}

// --- Networking ------------------------------------------------------------

async function send(text: string): Promise<void> {
  const els = widgetEls();
  if (!els || pending || dayLimitReached || !els.endpoint) return;

  pending = true;
  pushMessage({ role: 'user', text });
  if (els.input) {
    els.input.value = '';
    autoGrow(els.input);
  }
  updateSendState();
  setTyping(true);

  // Abort if the round trip stalls — the proxy caps the model at ~15s, so 20s
  // covers it plus tunnel overhead without leaving the typing dots spinning.
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(els.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: ctrl.signal,
    });
    let data: { reply?: string; error?: string; scope?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON body */
    }

    if (res.ok && typeof data.reply === 'string') {
      pushMessage({ role: 'bot', text: data.reply });
    } else {
      handleError(res.status, data);
    }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    pushMessage({ role: 'system', text: aborted ? TIMEOUT_MSG : GENERIC_MSG });
  } finally {
    window.clearTimeout(timer);
    pending = false;
    setTyping(false);
    updateSendState();
  }
}

function handleError(status: number, data: { error?: string; scope?: string }): void {
  const code = data.error || '';
  if (code === 'rate_limited' && data.scope === 'day') {
    pushMessage({ role: 'system', text: DAY_LIMIT_MSG, cta: true });
    lockForDayLimit();
    return;
  }
  if (code === 'rate_limited') {
    pushMessage({ role: 'system', text: MINUTE_MSG });
    return;
  }
  if (code === 'spike_detected') {
    pushMessage({ role: 'system', text: SPIKE_MSG });
    return;
  }
  if (code === 'model_timeout') {
    pushMessage({ role: 'system', text: TIMEOUT_MSG });
    return;
  }
  void status;
  pushMessage({ role: 'system', text: GENERIC_MSG });
}

// --- Input behaviour -------------------------------------------------------

function autoGrow(input: HTMLTextAreaElement): void {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

// --- Wiring ----------------------------------------------------------------

function wireGlobalsOnce(): void {
  if (globalsWired) return;
  globalsWired = true;

  // Escape closes the panel.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const root = document.querySelector<HTMLElement>('[data-ai-widget]');
    if (root && isOpen(root)) {
      setOpen(false);
      document.querySelector<HTMLButtonElement>('[data-ai-trigger]')?.focus();
    }
  });
}

export function initAiWidget(): void {
  wireGlobalsOnce();

  const els = widgetEls();
  if (!els || !els.panel) return;

  // Re-render any prior conversation into the freshly-swapped DOM.
  renderHistory();
  if (dayLimitReached) lockForDayLimit();
  updateSendState();

  // Triggers (desktop FAB + mobile navbar button).
  for (const trigger of els.triggers) {
    if (trigger.dataset.aiBound) continue;
    trigger.dataset.aiBound = '1';
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const root = document.querySelector<HTMLElement>('[data-ai-widget]');
      if (!root) return;
      setOpen(!isOpen(root));
    });
  }

  // Close button + scrim.
  const closeBtn = els.root.querySelector<HTMLButtonElement>('[data-ai-close]');
  if (closeBtn && !closeBtn.dataset.aiBound) {
    closeBtn.dataset.aiBound = '1';
    closeBtn.addEventListener('click', () => setOpen(false));
  }
  if (els.scrim && !els.scrim.dataset.aiBound) {
    els.scrim.dataset.aiBound = '1';
    els.scrim.addEventListener('click', () => setOpen(false));
  }

  // Input: auto-grow, enable/disable send, Enter-to-send.
  if (els.input && !els.input.dataset.aiBound) {
    els.input.dataset.aiBound = '1';
    els.input.addEventListener('input', () => {
      autoGrow(els.input as HTMLTextAreaElement);
      updateSendState();
    });
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.form?.requestSubmit();
      }
    });
  }

  // Form submit.
  if (els.form && !els.form.dataset.aiBound) {
    els.form.dataset.aiBound = '1';
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = els.input?.value.trim() || '';
      if (text) void send(text);
    });
  }
}
