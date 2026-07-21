/* recognize-passage — "Argument or Not?": argument vs. non-inferential passage,
 * then which kind of non-inferential passage. Each round draws a fixed number of
 * arguments and fills the rest with non-inferential passages.
 *
 * Interaction only; shared chrome/boot lives in quiz-kit. Plain JS, bundled per
 * widget by Hugo's js.Build.
 */
import { el, txt, actBtn, choice, whyBox, scoreScreen, shuffle, sample, createDeck, readData, register } from './quiz-kit.js';

var NIP_TYPES = [
  { key: 'report', label: 'Report' },
  { key: 'explanation', label: 'Explanation' },
  { key: 'illustration', label: 'Illustration' },
  { key: 'expository', label: 'Expository' },
  { key: 'belief', label: 'Statement of Belief' },
  { key: 'advice', label: 'Advice' },
  { key: 'warning', label: 'Warning' },
  { key: 'conditional', label: 'Conditional' }
];

function mount(root) {
  var problems = readData(root, 'data-rp-data');
  if (!problems) return;
  var args = problems.filter(function (p) { return p.type === 'argument'; });
  var nips = problems.filter(function (p) { return p.type === 'nip'; });
  var total = Math.max(1, Math.min(parseInt(root.getAttribute('data-quiz'), 10) || 10, problems.length));
  var nArg = Math.min(parseInt(root.getAttribute('data-args'), 10) || 4, args.length, total);
  var deck = createDeck(problems, total, function () {
    return shuffle(sample(args, nArg).concat(sample(nips, total - nArg)));
  });

  root.setAttribute('data-rp-ready', '1');
  root.innerHTML = '';
  var card = el('div', 'qz-card');
  var cap = el('div', 'qz-cap');
  cap.appendChild(txt('span', '', 'Argument or Not?'));
  cap.appendChild(txt('span', 'qz-chip', 'Recognize'));
  var body = el('div', 'qz-body');
  card.appendChild(cap); card.appendChild(body); root.appendChild(card);

  var problem, top, sub, locked;
  function load(p) { problem = p; top = null; sub = null; locked = false; }
  function correct() { return top === problem.type && (problem.type === 'argument' || sub === problem.subtype); }

  function render() {
    if (deck.done) { body.innerHTML = ''; body.appendChild(scoreScreen(deck.score, deck.total)); return; }
    body.innerHTML = '';
    body.appendChild(txt('p', 'qz-passage' + (locked ? ' rp-withsrc' : ''), problem.passage));
    if (locked) body.appendChild(txt('p', 'rp-src', '— ' + problem.source));

    if (!locked && top === 'nip') {
      body.appendChild(backButton());
      body.appendChild(subGrid());
    } else if (!locked) {
      body.appendChild(topRow());
    } else {
      body.appendChild(topRow());
      if (problem.type === 'nip') { var g = subGrid(); g.classList.add('qz-spaced'); body.appendChild(g); }
      if (!correct()) body.appendChild(whyBox(problem.explanation));
    }
    body.appendChild(controls());
  }

  function topRow() {
    var row = el('div', 'qz-btns');
    [['argument', 'Argument'], ['nip', 'Non-Inferential']].forEach(function (opt) {
      var key = opt[0], state = '';
      if (locked) state = problem.type === key ? 'ok' : (top === key ? 'bad' : '');
      else if (top === key) state = 'sel';
      row.appendChild(choice(opt[1], state, { top: key }));
    });
    return row;
  }
  function subGrid() {
    var grid = el('div', 'rp-grid');
    NIP_TYPES.forEach(function (t) {
      var state = '';
      if (locked) state = problem.subtype === t.key ? 'ok' : (sub === t.key ? 'bad' : '');
      else if (sub === t.key) state = 'sel';
      grid.appendChild(choice(t.label, state, { sub: t.key }, 16));
    });
    return grid;
  }
  function backButton() {
    var b = txt('button', 'qz-back', '‹ Back'); b.type = 'button'; b.setAttribute('data-back', '1');
    return b;
  }
  function controls() {
    var row = el('div', 'qz-controls');
    if (!locked) { row.appendChild(actBtn('check', 'Check answer', true)); row.appendChild(actBtn('reset', 'Reset', false)); }
    else row.appendChild(actBtn('next', deck.atLast() ? 'See score' : 'Next →', true));
    row.appendChild(txt('span', 'qz-progress', (deck.i + 1) + ' / ' + deck.total));
    return row;
  }

  root.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-action]'); if (a) { doAction(a.getAttribute('data-action')); return; }
    if (locked) return;
    if (ev.target.closest('[data-back]')) { top = null; sub = null; render(); return; }
    var tp = ev.target.closest('[data-top]');
    if (tp) { var k = tp.getAttribute('data-top'); top = k === 'argument' ? (top === 'argument' ? null : 'argument') : 'nip'; sub = null; render(); return; }
    var sb = ev.target.closest('[data-sub]');
    if (sb) { var s = sb.getAttribute('data-sub'); sub = sub === s ? null : s; render(); return; }
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (ev.target.closest('[data-top],[data-sub],[data-back],[data-action]')) { ev.preventDefault(); ev.target.click(); }
  });

  function doAction(a) {
    if (a === 'reset') { top = null; sub = null; render(); }
    else if (a === 'newquiz') { load(deck.deal()); render(); }
    else if (a === 'next') { load(deck.advance()); render(); }
    else if (a === 'check') {
      var complete = top === 'argument' || (top === 'nip' && sub);
      if (!complete) return;
      if (correct()) deck.score++;
      locked = true; render();
    }
  }

  load(deck.deal());
  render();
}

register('[data-recognize]:not([data-rp-ready])', mount, 'recognize');
