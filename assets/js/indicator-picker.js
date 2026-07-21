/* indicator-picker — "Deductive or Inductive?" plus the inferential-claim
 * indicator: pick the mode and tap the word that signals the inference.
 *
 * Interaction only; shared chrome/boot lives in quiz-kit, the category model in
 * categories. Plain JS, bundled per widget by Hugo's js.Build.
 */
import { el, txt, actBtn, choice, pill, iconSpan, whyBox, scoreScreen, createDeck, readData, register } from './quiz-kit.js';
import { pillsFor } from './categories.js';

function normalize(word) { return word.toLowerCase().replace(/[^a-z]/g, ''); }

function mount(root) {
  var problems = readData(root, 'data-ip-data');
  if (!problems) return;
  var deck = createDeck(problems, parseInt(root.getAttribute('data-quiz'), 10) || 4);

  root.setAttribute('data-ip-ready', '1');
  root.innerHTML = '';
  var card = el('div', 'qz-card');
  var cap = el('div', 'qz-cap');
  cap.appendChild(txt('span', '', 'Deductive or Inductive?'));
  cap.appendChild(txt('span', 'qz-chip', 'Classify'));
  var body = el('div', 'qz-body');
  card.appendChild(cap); card.appendChild(body); root.appendChild(card);

  var problem, words, answerIdx, modeSel, wordSel, locked;
  function load(p) {
    problem = p;
    words = String(p.passage).split(/\s+/);
    answerIdx = words.findIndex(function (w) { return normalize(w) === String(p.indicator).toLowerCase(); });
    modeSel = null; wordSel = -1; locked = false;
  }
  function correct() { return modeSel === problem.mode && wordSel === answerIdx; }

  function render() {
    if (deck.done) { body.innerHTML = ''; body.appendChild(scoreScreen(deck.score, deck.total)); return; }
    body.innerHTML = '';
    body.appendChild(passage());
    body.appendChild(modeRow());
    if (locked && !correct()) body.appendChild(whyBox(problem.explanation));
    body.appendChild(controls());
  }

  function passage() {
    var p = el('p', 'qz-passage ip-passage');
    words.forEach(function (word, idx) {
      var state = '';
      if (locked) { if (idx === answerIdx) state = 'ok'; else if (idx === wordSel) state = 'bad'; }
      else if (idx === wordSel) state = 'sel';
      var span = txt('span', 'ip-word' + (state ? ' ip-' + state : ''), word);
      span.setAttribute('data-widx', idx);
      p.appendChild(span);
      if (state === 'bad') p.appendChild(iconSpan('bad', 15));   // only the wrong pick gets a marker; the right word stays clean
      p.appendChild(document.createTextNode(' '));
    });
    return p;
  }
  function modeRow() {
    var row = el('div', 'qz-btns');
    ['deductive', 'inductive'].forEach(function (mode) {
      var state = '';
      if (locked) state = mode === problem.mode ? 'ok' : (mode === modeSel ? 'bad' : '');
      else if (mode === modeSel) state = 'sel';
      row.appendChild(choice(mode.charAt(0).toUpperCase() + mode.slice(1), state, { mode: mode }));
    });
    return row;
  }
  function controls() {
    var row = el('div', 'qz-controls');
    if (!locked) { row.appendChild(actBtn('check', 'Check answer', true)); row.appendChild(actBtn('reset', 'Reset', false)); }
    else {
      row.appendChild(actBtn('next', deck.atLast() ? 'See score' : 'Next →', true));
      pillsFor(problem.category).forEach(function (x) { row.appendChild(pill(x.label, x.tone)); });
    }
    row.appendChild(txt('span', 'qz-progress', (deck.i + 1) + ' / ' + deck.total));
    return row;
  }

  root.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-action]'); if (a) { doAction(a.getAttribute('data-action')); return; }
    if (locked) return;
    var m = ev.target.closest('[data-mode]'); if (m) { modeSel = m.getAttribute('data-mode'); render(); return; }
    var w = ev.target.closest('[data-widx]'); if (w) { var idx = +w.getAttribute('data-widx'); wordSel = wordSel === idx ? -1 : idx; render(); return; }
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (ev.target.closest('[data-mode],[data-widx],[data-action]')) { ev.preventDefault(); ev.target.click(); }
  });

  function doAction(a) {
    if (a === 'reset') { modeSel = null; wordSel = -1; render(); }
    else if (a === 'newquiz') { load(deck.deal()); render(); }
    else if (a === 'next') { load(deck.advance()); render(); }
    else if (a === 'check') { if (!modeSel || wordSel < 0) return; if (correct()) deck.score++; locked = true; render(); }
  }

  load(deck.deal());
  render();
}

register('[data-indicator-picker]:not([data-ip-ready])', mount, 'indicator');
