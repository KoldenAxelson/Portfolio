/* validity-picker — "Evaluate the Argument": deductive/inductive, then
 * valid/invalid (deductive) or strong/weak (inductive). A soundness/cogency
 * verdict shows as a pill after checking, but is never selected.
 *
 * Interaction only; shared chrome/boot lives in quiz-kit, the category model in
 * categories. Plain JS, bundled per widget by Hugo's js.Build.
 */
import { el, txt, actBtn, choice, pill, whyBox, scoreScreen, createDeck, readData, register } from './quiz-kit.js';
import { CATEGORIES, qualityPill } from './categories.js';

function axisFor(mode) {
  return mode === 'deductive'
    ? [['valid', 'Valid'], ['invalid', 'Invalid']]
    : [['strong', 'Strong'], ['weak', 'Weak']];
}

function mount(root) {
  var problems = readData(root, 'data-vp-data');
  if (!problems) return;
  var deck = createDeck(problems, parseInt(root.getAttribute('data-quiz'), 10) || 4);

  root.setAttribute('data-vp-ready', '1');
  root.innerHTML = '';
  var card = el('div', 'qz-card');
  var cap = el('div', 'qz-cap');
  cap.appendChild(txt('span', '', 'Evaluate the Argument'));
  cap.appendChild(txt('span', 'qz-chip', 'Evaluate'));
  var body = el('div', 'qz-body');
  card.appendChild(cap); card.appendChild(body); root.appendChild(card);

  var problem, modeSel, verdictSel, locked;
  function load(p) { problem = p; modeSel = null; verdictSel = null; locked = false; }
  function answer() { return CATEGORIES[problem.category].verdict; }   // valid/invalid or strong/weak
  function correct() { return modeSel === problem.mode && verdictSel === answer(); }

  function render() {
    if (deck.done) { body.innerHTML = ''; body.appendChild(scoreScreen(deck.score, deck.total)); return; }
    body.innerHTML = '';
    body.appendChild(txt('p', 'qz-passage', problem.passage));

    if (!locked && modeSel) {
      body.appendChild(backButton());
      body.appendChild(verdictRow());
    } else if (!locked) {
      body.appendChild(modeRow());
    } else {
      body.appendChild(modeRow());
      var revealed = verdictRow(); revealed.classList.add('qz-spaced'); body.appendChild(revealed);
      if (!correct()) body.appendChild(whyBox(problem.explanation));
    }
    body.appendChild(controls());
  }

  function modeRow() {
    var row = el('div', 'qz-btns');
    [['deductive', 'Deductive'], ['inductive', 'Inductive']].forEach(function (opt) {
      var key = opt[0], state = '';
      if (locked) state = problem.mode === key ? 'ok' : (modeSel === key ? 'bad' : '');
      else if (modeSel === key) state = 'sel';
      row.appendChild(choice(opt[1], state, { mode: key }));
    });
    return row;
  }
  function verdictRow() {
    // once locked, show the axis for the correct mode; before that, the picked mode's axis
    var mode = locked ? problem.mode : modeSel;
    var row = el('div', 'qz-btns');
    axisFor(mode).forEach(function (opt) {
      var key = opt[0], state = '';
      if (locked) state = key === answer() ? 'ok' : (modeSel === problem.mode && verdictSel === key ? 'bad' : '');
      else if (verdictSel === key) state = 'sel';
      row.appendChild(choice(opt[1], state, { verdict: key }));
    });
    return row;
  }
  function backButton() {
    var b = txt('button', 'qz-back', '‹ Back'); b.type = 'button'; b.setAttribute('data-back', '1');
    return b;
  }
  function controls() {
    var row = el('div', 'qz-controls');
    if (!locked) { row.appendChild(actBtn('check', 'Check answer', true)); row.appendChild(actBtn('reset', 'Reset', false)); }
    else {
      row.appendChild(actBtn('next', deck.atLast() ? 'See score' : 'Next →', true));
      var q = qualityPill(problem.category); if (q) row.appendChild(pill(q.label, q.tone));
    }
    row.appendChild(txt('span', 'qz-progress', (deck.i + 1) + ' / ' + deck.total));
    return row;
  }

  root.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-action]'); if (a) { doAction(a.getAttribute('data-action')); return; }
    if (locked) return;
    if (ev.target.closest('[data-back]')) { modeSel = null; verdictSel = null; render(); return; }
    var m = ev.target.closest('[data-mode]'); if (m) { modeSel = m.getAttribute('data-mode'); verdictSel = null; render(); return; }
    var v = ev.target.closest('[data-verdict]'); if (v) { var key = v.getAttribute('data-verdict'); verdictSel = verdictSel === key ? null : key; render(); return; }
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (ev.target.closest('[data-mode],[data-verdict],[data-back],[data-action]')) { ev.preventDefault(); ev.target.click(); }
  });

  function doAction(a) {
    if (a === 'reset') { modeSel = null; verdictSel = null; render(); }
    else if (a === 'newquiz') { load(deck.deal()); render(); }
    else if (a === 'next') { load(deck.advance()); render(); }
    else if (a === 'check') { if (!modeSel || !verdictSel) return; if (correct()) deck.score++; locked = true; render(); }
  }

  load(deck.deal());
  render();
}

register('[data-validity]:not([data-vp-ready])', mount, 'validity');
