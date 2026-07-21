/* arg-builder — "Natural Speech → Standard Form": tap a sentence to break it
 * into words, then place its words into the premise and conclusion slots. On a
 * wrong parse it reveals the correct standard form.
 *
 * Interaction only; shared chrome/boot lives in quiz-kit, the category model in
 * categories. Plain JS, bundled per widget by Hugo's js.Build.
 */
import { el, txt, actBtn, pill, statusIcon, shuffle, scoreScreen, createDeck, readData, register } from './quiz-kit.js';
import { pillsFor } from './categories.js';

/* Turn a raw problem into the view model the widget renders: one entry per
 * sentence (with its slot label and target words), the slot order, a slot→
 * sentence lookup, and a per-sentence bank of the target words mixed with the
 * distractor "herrings", shuffled once so the answer order isn't given away. */
function buildProblem(p) {
  var premiseCount = 0;
  var sentences = p.passage.map(function (s) {
    var slot = s.role === 'conclusion' ? 'C' : 'P' + (++premiseCount);
    return { text: s.text, slot: slot, role: s.role, words: String(s.target).trim().split(/\s+/), herrings: s.herrings || [] };
  });
  var order = sentences.filter(function (s) { return s.role === 'premise'; }).map(function (s) { return s.slot; }).concat(['C']);
  var slotToSentence = {};
  sentences.forEach(function (s, idx) { slotToSentence[s.slot] = idx; });
  var banks = sentences.map(function (s, si) {
    var tokens = s.words.map(function (word, k) { return { id: si + 'w' + k, text: word }; })
      .concat(s.herrings.map(function (word, k) { return { id: si + 'h' + k, text: word }; }));
    return shuffle(tokens);
  });
  return { sentences: sentences, order: order, slotToSentence: slotToSentence, banks: banks, category: p.category };
}

function mount(root) {
  var problems = readData(root, 'data-arg-data');
  if (!problems) return;
  var deck = createDeck(problems, parseInt(root.getAttribute('data-quiz'), 10) || 4);

  root.setAttribute('data-arg-ready', '1');
  root.innerHTML = '';
  var card = el('div', 'qz-card');
  var cap = el('div', 'qz-cap');
  cap.appendChild(txt('span', '', 'Natural Speech → Standard Form'));
  cap.appendChild(txt('span', 'qz-chip', 'Parsing'));
  var body = el('div', 'qz-body');
  card.appendChild(cap); card.appendChild(body); root.appendChild(card);

  var model, selected, placed, marks, locked;   // selected: index of the sentence whose bank is open, or -1
  function load(p) {
    model = buildProblem(p);
    selected = -1; placed = {}; marks = {}; locked = false;
    model.order.forEach(function (slot) { placed[slot] = []; });
  }
  function tokenText(si, id) { return model.banks[si].find(function (t) { return t.id === id; }).text; }
  function sentenceFor(slot) { return model.sentences[model.slotToSentence[slot]]; }
  function allCorrect() { return model.order.every(function (slot) { return marks[slot] === 'ok'; }); }

  function render() {
    if (deck.done) { body.innerHTML = ''; body.appendChild(scoreScreen(deck.score, deck.total)); return; }
    body.innerHTML = '';
    body.appendChild(passage());

    var stack = el('div', 'ab-stack');
    stack.appendChild(standardForm());
    if (!locked) stack.appendChild(bank());
    body.appendChild(stack);

    if (locked && !allCorrect()) body.appendChild(answerKey());
    body.appendChild(controls());
  }

  function passage() {
    var p = el('p', 'ab-passage');
    model.sentences.forEach(function (s, idx) {
      var span = txt('span', 'ab-sent' + (selected === idx ? ' ab-sel' : ''), s.text);
      span.setAttribute('data-sent', idx);
      p.appendChild(span);
      p.appendChild(document.createTextNode(' '));
    });
    return p;
  }

  function standardForm() {
    var group = el('div');
    group.appendChild(txt('p', 'ab-h', 'Standard form'));
    var rows = el('div');
    model.order.forEach(function (slot) {
      if (slot === 'C') rows.appendChild(el('hr'));
      rows.appendChild(slotRow(slot));
    });
    group.appendChild(rows);
    return group;
  }

  function slotRow(slot) {
    var isConclusion = slot === 'C';
    var ids = placed[slot];
    var armed = selected >= 0 && model.sentences[selected].slot === slot;

    var row = el('div', 'ab-row');
    row.appendChild(txt('span', 'ab-lbl' + (isConclusion ? ' ab-c' : ''), isConclusion ? '∴' : slot));

    var box = el('div', 'ab-slot' + (ids.length ? ' ab-filled' : '') + (armed ? ' ab-armed' : '') + (marks[slot] ? ' ab-' + marks[slot] : ''));
    box.setAttribute('data-slot', slot);
    box.setAttribute('tabindex', '0');
    box.setAttribute('aria-label', 'Build ' + (isConclusion ? 'the conclusion' : slot) + ' — tap to select its sentence');
    if (!ids.length) box.appendChild(txt('span', 'ab-ph', isConclusion ? 'conclusion' : 'premise'));
    else {
      var si = model.slotToSentence[slot];
      ids.forEach(function (id) {
        var chip = txt('button', 'ab-tok ab-chip-tok', tokenText(si, id));
        chip.type = 'button'; chip.setAttribute('data-chip', id); chip.setAttribute('data-inslot', slot);
        box.appendChild(chip);
      });
    }
    row.appendChild(box);
    if (marks[slot]) { var status = el('span', 'ab-status'); status.innerHTML = statusIcon(marks[slot], 20); row.appendChild(status); }
    return row;
  }

  function bank() {
    var group = el('div');
    group.appendChild(txt('p', 'ab-h', 'Bank'));
    var wrap = el('div', 'ab-bankwrap');
    if (selected >= 0) {
      var used = placed[model.sentences[selected].slot];
      var tray = el('div', 'ab-bank');
      model.banks[selected].forEach(function (t) {
        if (used.indexOf(t.id) >= 0) return;
        var b = txt('button', 'ab-tok', t.text);
        b.type = 'button'; b.setAttribute('data-token', t.id);
        tray.appendChild(b);
      });
      wrap.appendChild(tray);
    }
    group.appendChild(wrap);
    return group;
  }

  function answerKey() {
    var box = el('div', 'qz-why');
    box.appendChild(txt('p', 'qz-why-lbl', 'Standard form'));
    var answer = el('div', 'ab-answer');
    model.order.forEach(function (slot) {
      var isConclusion = slot === 'C';
      var row = el('div', 'ab-arow');
      row.appendChild(txt('span', 'ab-albl' + (isConclusion ? ' ab-c' : ''), isConclusion ? '∴' : slot));
      row.appendChild(txt('span', 'ab-atext', sentenceFor(slot).words.join(' ')));
      answer.appendChild(row);
    });
    box.appendChild(answer);
    return box;
  }

  function controls() {
    var row = el('div', 'qz-controls');
    if (!locked) { row.appendChild(actBtn('check', 'Check answer', true)); row.appendChild(actBtn('reset', 'Reset', false)); }
    else {
      row.appendChild(actBtn('next', deck.atLast() ? 'See score' : 'Next →', true));
      pillsFor(model.category).forEach(function (x) { row.appendChild(pill(x.label, x.tone)); });
    }
    row.appendChild(txt('span', 'qz-progress', (deck.i + 1) + ' / ' + deck.total));
    return row;
  }

  function activate(ev) {
    var a = ev.target.closest('[data-action]'); if (a) { doAction(a.getAttribute('data-action')); return; }
    if (locked) return;
    var chip = ev.target.closest('[data-chip]');
    if (chip) { var slot = chip.getAttribute('data-inslot'), id = chip.getAttribute('data-chip'); placed[slot] = placed[slot].filter(function (x) { return x !== id; }); render(); return; }
    var token = ev.target.closest('[data-token]');
    if (token) { if (selected < 0) return; placed[model.sentences[selected].slot].push(token.getAttribute('data-token')); render(); return; }
    var box = ev.target.closest('[data-slot]');
    if (box) { selected = model.slotToSentence[box.getAttribute('data-slot')]; render(); return; }
    var sentence = ev.target.closest('[data-sent]');
    if (sentence) { var idx = +sentence.getAttribute('data-sent'); selected = selected === idx ? -1 : idx; render(); return; }
  }

  root.addEventListener('click', activate);
  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    if (ev.target.closest('[data-slot],[data-sent],[data-action]')) { ev.preventDefault(); activate(ev); }
  });

  function doAction(a) {
    if (a === 'reset') { model.order.forEach(function (slot) { placed[slot] = []; }); selected = -1; marks = {}; render(); return; }
    if (a === 'newquiz') { load(deck.deal()); render(); return; }
    if (a === 'next') { load(deck.advance()); render(); return; }
    if (a === 'check') {
      var complete = model.order.every(function (slot) { return placed[slot].length; });
      if (!complete) return;
      var allOk = true;
      model.order.forEach(function (slot) {
        var si = model.slotToSentence[slot];
        var got = placed[slot].map(function (id) { return tokenText(si, id); });
        var want = model.sentences[si].words;
        var ok = got.length === want.length && got.every(function (t, k) { return t === want[k]; });
        marks[slot] = ok ? 'ok' : 'bad';
        if (!ok) allOk = false;
      });
      if (allOk) deck.score++;
      locked = true; selected = -1; render();
    }
  }

  load(deck.deal());
  render();
}

register('[data-arg-builder]:not([data-arg-ready])', mount, 'argBuilder');
