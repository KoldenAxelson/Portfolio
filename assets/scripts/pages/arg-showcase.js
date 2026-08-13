/* arg-showcase — the cycling "Argument Example" box on a Basic Logic chapter.
 *
 * Walks an argument in standard form through the terms the chapter introduces:
 * each step names a term, the caption becomes "Argument Example — <term>", and
 * the part of the argument that term refers to is highlighted while the rest
 * dims. A step can also name a different argument, which is how the same
 * familiar sentences get shown as deductive and then as inductive.
 *
 * The first step is already in the DOM from the shortcode, so this module
 * enhances rather than builds — with JS off the box is a plain, complete
 * argument in standard form. Plain JS, bundled by Hugo's js.Build (same pattern
 * as the exercise widgets; deliberately outside the tsgo gate).
 */

var STEP_MS = 3200;

/* Swap motion. The same three rules the definition figures use (see the note in
 * assets/scripts/site/def-figures.ts): exits accelerate away on an ease-IN while
 * entrances settle on an ease-out; the two overlap rather than running back to
 * back; and a slight blur softens the frames where both are partly visible.
 *
 * The extra move here is the stagger — the premises and the conclusion leave and
 * arrive in reading order rather than the whole box blinking at once, which is
 * what made the old single-block fade feel abrupt. The body's height is the same
 * for both arguments (measured: 137px), so nothing has to be animated to stop
 * the page jumping. */
var OUT_MS = 170;
var IN_MS = 260;
var STAGGER_MS = 55;
var EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
var EASE_IN = 'cubic-bezier(0.5, 0, 0.75, 0)';

var FADE_OUT = [
  { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
  { opacity: 0, transform: 'translateY(-6px)', filter: 'blur(2px)' }
];
var FADE_IN = [
  { opacity: 0, transform: 'translateY(8px)', filter: 'blur(2px)' },
  { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }
];

function rows(body) {
  return Array.prototype.slice.call(body.querySelectorAll('.sc-line, hr, .sc-note'));
}

function readData(root) {
  var holder = root.querySelector('[data-showcase-data]');
  if (!holder) return null;
  try {
    return JSON.parse(holder.textContent);
  } catch {
    return null;
  }
}

function el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/* A conclusion whose indicator words need highlighting is split into three text
 * runs so the indicator can be wrapped on its own, without innerHTML. */
function conclusionText(parent, text, indicator) {
  var at = indicator ? text.toLowerCase().indexOf(indicator.toLowerCase()) : -1;
  if (at < 0) {
    parent.appendChild(document.createTextNode(text));
    return;
  }
  parent.appendChild(document.createTextNode(text.slice(0, at)));
  var mark = el('span', 'sc-word');
  mark.setAttribute('data-part', 'indicator');
  mark.textContent = text.slice(at, at + indicator.length);
  parent.appendChild(mark);
  parent.appendChild(document.createTextNode(text.slice(at + indicator.length)));
}

/* One line of the argument: a gutter mark that is decoration for sighted readers
 * (P1, P2, the therefore sign), and the sentence itself, prefixed by the label a
 * screen reader reads in the mark's place. The caller fills the sentence, since
 * the conclusion's needs its indicator marked up and a premise's does not. */
function argumentLine(part, markText, markClass, spoken, saidClass) {
  var row = el('p', 'sc-line flex items-baseline gap-x-2.5');
  row.setAttribute('data-part', part);

  var mark = el('span', 'shrink-0 font-mono ' + markClass);
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = markText;
  row.appendChild(mark);

  var said = el('span', 'min-w-0 ' + saidClass);
  var sr = el('span', 'sr-only');
  sr.textContent = spoken;
  said.appendChild(sr);
  row.appendChild(said);

  return { row: row, said: said };
}

function renderArgument(body, arg, note) {
  body.textContent = '';

  var stack = el('div', 'space-y-1.5');
  arg.premises.forEach(function (text, i) {
    var line = argumentLine('premises', 'P' + (i + 1), 'text-xs text-muted',
      'Premise ' + (i + 1) + ': ', 'text-fg');
    line.said.appendChild(document.createTextNode(text));
    stack.appendChild(line.row);
  });
  body.appendChild(stack);

  body.appendChild(el('hr', 'my-2.5 border-0 border-t border-border/70'));

  var concl = argumentLine('conclusion', '\u2234', 'text-sm text-accent',
    'Therefore, conclusion: ', 'font-medium text-fg');
  conclusionText(concl.said, arg.conclusion, arg.indicator);
  body.appendChild(concl.row);

  if (note) {
    var line = el('p', 'sc-note mt-3 text-sm italic leading-snug text-muted');
    line.setAttribute('data-showcase-note', '');
    line.textContent = note;
    body.appendChild(line);
  }
}

function applyHighlight(body, highlight) {
  var lines = Array.prototype.slice.call(body.querySelectorAll('.sc-line'));
  var words = Array.prototype.slice.call(body.querySelectorAll('.sc-word'));
  var all = highlight === 'all' || !highlight;

  lines.forEach(function (line) {
    var mine = all || line.getAttribute('data-part') === highlight;
    // The indicator lives inside the conclusion, so that line stays lit while
    // the word inside it is what actually draws the eye.
    if (highlight === 'indicator') mine = line.getAttribute('data-part') === 'conclusion';
    line.classList.toggle('is-dim', !mine);
  });
  words.forEach(function (word) {
    word.classList.toggle('is-lit', highlight === 'indicator');
  });
}

function mount(root) {
  var data = readData(root);
  if (!data || !data.steps || !data.steps.length) return;
  var body = root.querySelector('[data-showcase-body]');
  var label = root.querySelector('[data-showcase-label]');
  if (!body || !label) return;

  root.setAttribute('data-showcase-ready', '1');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var index = 0;
  var shownArgument = data.steps[0].argument;

  // Apply the first step's highlight to the server-rendered markup, so the box
  // starts in the same state the cycle will return it to.
  applyHighlight(body, data.steps[0].highlight);
  if (reduce) return; // a complete, labelled argument — just not a moving one

  // The lines leave in reading order, the new argument is rendered, and its
  // lines arrive the same way.
  var swapArgument = function (step) {
    var leaving = rows(body).map(function (row, i) {
      return row.animate(FADE_OUT, {
        duration: OUT_MS, delay: i * STAGGER_MS, easing: EASE_IN, fill: 'forwards'
      }).finished;
    });
    Promise.all(leaving).then(function () {
      if (!root.isConnected) return;
      renderArgument(body, data.arguments[step.argument], step.note);
      applyHighlight(body, step.highlight); // settle the final state before arriving
      rows(body).forEach(function (row, i) {
        row.animate(FADE_IN, {
          duration: IN_MS, delay: i * STAGGER_MS, easing: EASE_OUT, fill: 'backwards'
        });
      });
    }, function () { /* animation cancelled — the box went away */ });
  };

  var swapLabel = function (text) {
    label.animate(FADE_OUT, { duration: OUT_MS, easing: EASE_IN, fill: 'forwards' })
      .finished.then(function (anim) {
        label.textContent = text;
        anim.cancel();
        label.animate(FADE_IN, { duration: IN_MS, easing: EASE_OUT });
      }, function () { label.textContent = text; });
  };

  // Self-cleaning: each hop checks the box is still in the document, so a
  // boosted navigation away can't leave the timer running.
  var hop = function () {
    if (!root.isConnected) return;
    index = (index + 1) % data.steps.length;
    var step = data.steps[index];
    swapLabel(step.label);
    var note = body.querySelector('[data-showcase-note]');
    var noteChanged = (note ? note.textContent : '') !== (step.note || '');
    if (step.argument !== shownArgument || noteChanged) {
      shownArgument = step.argument;
      swapArgument(step);
    } else {
      applyHighlight(body, step.highlight);
    }
    window.setTimeout(hop, STEP_MS);
  };
  window.setTimeout(hop, STEP_MS);
}

function init() {
  var roots = document.querySelectorAll('[data-arg-showcase]');
  for (var i = 0; i < roots.length; i += 1) {
    if (!roots[i].hasAttribute('data-showcase-ready')) mount(roots[i]);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
document.addEventListener('htmx:afterSettle', init);
