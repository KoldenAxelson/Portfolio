/* quiz-kit — shared primitives for the Basic Logic exercise widgets.
 *
 * Plain JS (kept out of the tsgo gate). Bundled into each widget by Hugo's
 * js.Build (esbuild), so there is no separate runtime script to load. This
 * module holds only DOM, boot, and render helpers — it knows nothing about the
 * argument domain (that lives in categories.js) or any one widget's interaction.
 */

export function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
export function txt(tag, cls, text) { var e = el(tag, cls); e.textContent = text; return e; }

export function actBtn(action, label, primary) {
  var b = txt('button', 'qz-act' + (primary ? ' qz-primary' : ''), label);
  b.type = 'button'; b.setAttribute('data-action', action);
  return b;
}

export function statusIcon(kind, size) {
  var s = size || 18;
  var color = kind === 'ok' ? 'var(--qz-ok)' : 'var(--qz-bad)';
  var mark = kind === 'ok' ? '<path d="M8 12.4l2.6 2.6L15.5 9.2"/>' : '<path d="M9 9l6 6M15 9l-6 6"/>';
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="' + color +
    '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/>' + mark + '</svg>';
}
export function iconSpan(kind, size) { var s = el('span', 'qz-oicon'); s.innerHTML = statusIcon(kind, size); return s; }

export function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var swap = arr[i]; arr[i] = arr[j]; arr[j] = swap;
  }
  return arr;
}
export function sample(items, n) { return shuffle(items.slice()).slice(0, n); }

export function pill(label, tone) {
  return txt('span', 'qz-pill' + (tone && tone !== 'neutral' ? ' qz-' + tone : ''), label);
}

/* A choice button (deductive/inductive, valid/invalid, argument/non-inferential…).
 * state is '' | 'sel' | 'ok' | 'bad'; ok/bad also append a check/X icon.
 * dataset maps to data-* attributes the widget's click handler reads. */
export function choice(label, state, dataset, iconSize) {
  var b = el('button', 'qz-opt' + (state ? ' qz-' + state : ''));
  b.type = 'button';
  b.appendChild(document.createTextNode(label));
  if (dataset) for (var key in dataset) b.setAttribute('data-' + key, dataset[key]);
  if (state === 'ok' || state === 'bad') b.appendChild(iconSpan(state, iconSize));
  return b;
}

export function scoreScreen(score, total) {
  var d = el('div', 'qz-results');
  d.appendChild(txt('h2', '', 'Your score'));
  var line = el('p', 'qz-scoreline');
  line.appendChild(document.createTextNode(score + ' '));
  line.appendChild(txt('span', 'qz-den', '/ ' + total));
  d.appendChild(line);
  d.appendChild(actBtn('newquiz', 'Go Again?', true));
  return d;
}

/* The red "Why" box, shown only after a wrong answer. */
export function whyBox(explanation) {
  var w = el('div', 'qz-why');
  w.appendChild(txt('p', 'qz-why-lbl', 'Why'));
  w.appendChild(txt('p', '', explanation));
  return w;
}

/* Owns the index/score/done bookkeeping every widget shares, leaving each one
 * to manage only its own per-question view state. Pass a dealer to control how a
 * round is composed (e.g. a fixed number of arguments); the default samples at
 * random. */
export function createDeck(items, size, dealer) {
  var total = Math.max(1, Math.min(size, items.length));
  return {
    total: total, i: 0, score: 0, done: false, order: [],
    deal: function () { this.order = dealer ? dealer(total) : sample(items, total); this.i = 0; this.score = 0; this.done = false; return this.current(); },
    current: function () { return this.order[this.i]; },
    atLast: function () { return this.i >= this.total - 1; },
    advance: function () { if (this.atLast()) this.done = true; else this.i++; return this.current(); }
  };
}

/* Read + parse the JSON a shortcode embeds in its mount. Returns null when the
 * data is absent or malformed so the caller can bail without throwing. */
export function readData(root, attr) {
  var node = root.querySelector('script[' + attr + ']');
  if (!node) return null;
  try { var data = JSON.parse(node.textContent); return Array.isArray(data) && data.length ? data : null; }
  catch (e) { return null; }
}

/* Hydrate every un-mounted widget now and again after each hx-boost body swap.
 * key names the once-guard so the htmx listener is bound a single time. */
export function register(selector, mount, key) {
  function init() {
    var mounts = document.querySelectorAll(selector);
    for (var i = 0; i < mounts.length; i++) mount(mounts[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  var flag = '__qz_' + key;
  if (!window[flag]) { window[flag] = true; document.addEventListener('htmx:afterSettle', init); }
}
