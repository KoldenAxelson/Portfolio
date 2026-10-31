/* Revision search: marks the kinds from the words-to-cut table in your text,
   plus runs of three or more prepositional phrases. Each kind can be hidden.
   Hedges inside quotation marks are let off by default, since people hedge
   when they talk. The lists are the table's examples plus their near
   neighbours; they're prompts for a search, so a false alarm costs nothing. */
window.WtCut = (function () {
  var CHAIN_MIN = 3; // prepositional phrases in a row before a run is flagged
  var PHRASE_MAX_WORDS = 4; // words a phrase may run before the next preposition
  var KINDS = [
    { key: "weasel", label: "Weasel", words: ["that", "just"] },
    { key: "puff", label: "Puff", words: ["utilize", "utilized", "utilizes", "utilise", "utilised", "commence", "commenced", "endeavor", "endeavored", "endeavour", "facilitate", "facilitated", "in order to", "ascertain"] },
    { key: "filter", label: "Filter", words: ["saw", "noticed", "notice", "watched", "felt", "heard", "realized", "realised", "wondered", "seemed"] },
    { key: "time", label: "Time", words: ["suddenly", "all of a sudden", "and then", "finally", "immediately", "at that moment"] },
    { key: "empty", label: "Empty", words: ["something", "stuff", "things", "there was", "there were"] },
    { key: "inflation", label: "Inflation", words: ["really", "very", "totally", "actually", "extremely", "literally", "absolutely", "quite"] },
    { key: "hedge", label: "Hedge", words: ["usually", "sort of", "kind of", "maybe", "perhaps", "probably", "somewhat", "a bit"] },
    { key: "doubled", label: "Doubled", words: ["sat down", "stood up", "whispered quietly", "shouted loudly", "end result", "each and every", "past history",
      "nodded (?:my|his|her|their|your) heads?", "shrugged (?:my|his|her|their|your) shoulders", "blinked (?:my|his|her|their|your) eyes"] },
    { key: "chain", label: "Preposition chain", words: [] }
  ];
  var PREPOSITIONS = ("of in on at by for with from into onto under over behind past through across near beside between " +
    "along around against among toward towards after before inside outside beneath above below beyond").split(" ");

  // One regex per kind, longest phrase first so "and then" wins over "then".
  KINDS.forEach(function (kind) {
    if (!kind.words.length) return;
    var sorted = kind.words.slice().sort(function (a, b) { return b.length - a.length; });
    kind.re = new RegExp("\\b(?:" + sorted.join("|") + ")\\b", "gi");
  });

  function withEditor(cb) {
    if (window.WtEditor) return cb();
    var queue = window.WtEditorQueue = window.WtEditorQueue || [];
    queue.push(cb);
    if (queue.length > 1) return;
    var s = document.createElement("script");
    s.src = "/js/writing-techniques/wt-editor.js";
    s.onload = function () { window.WtEditorQueue.splice(0).forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }

  function quoteRanges(text) {
    var ranges = [];
    var re = /["“][^"”]*["”]/g;
    var m;
    while ((m = re.exec(text))) ranges.push([m.index, m.index + m[0].length]);
    return ranges;
  }

  function inRanges(at, ranges) {
    return ranges.some(function (r) { return at >= r[0] && at < r[1]; });
  }

  // A run of CHAIN_MIN+ prepositions, each within PHRASE_MAX_WORDS words of the
  // last and with no punctuation between, marked from the first preposition to
  // the end of the last phrase.
  function findChains(text) {
    var found = [];
    var re = /[A-Za-z’']+|[.,;:!?"“”()]/g;
    var toks = [];
    var m;
    while ((m = re.exec(text))) toks.push({ s: m[0], at: m.index, end: m.index + m[0].length });
    var run = [];
    function close(i) {
      if (run.length >= CHAIN_MIN) {
        var last = run[run.length - 1];
        var stop = Math.min(i, last + PHRASE_MAX_WORDS + 1) - 1;
        found.push({ start: toks[run[0]].at, end: toks[stop].end, kind: "chain" });
      }
      run = [];
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i].s;
      if (/^[.,;:!?"“”()]$/.test(t)) { close(i); continue; }
      if (PREPOSITIONS.indexOf(t.toLowerCase()) === -1) {
        if (run.length && i - run[run.length - 1] > PHRASE_MAX_WORDS) close(i);
        continue;
      }
      if (run.length && i - run[run.length - 1] > PHRASE_MAX_WORDS) close(i);
      run.push(i);
    }
    close(toks.length);
    return found;
  }

  function findAll(text, letTalkHedge) {
    var quotes = quoteRanges(text);
    var hits = [];
    KINDS.forEach(function (kind) {
      if (!kind.re) return;
      kind.re.lastIndex = 0;
      var m;
      while ((m = kind.re.exec(text))) {
        if (kind.key === "hedge" && letTalkHedge && inRanges(m.index, quotes)) continue;
        hits.push({ start: m.index, end: m.index + m[0].length, kind: kind.key });
      }
    });
    // Longest first at the same spot, then drop anything overlapping a kept hit.
    // Chains go last so a word inside a chain keeps its own kind.
    hits.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var kept = [];
    hits.forEach(function (h) {
      if (!kept.length || h.start >= kept[kept.length - 1].end) kept.push(h);
    });
    return { words: kept, chains: findChains(text) };
  }

  function stat(value, label) {
    return '<div class="wt-stat"><b>' + value + "</b><span>" + label + "</span></div>";
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var keys = root.querySelector("#wt-cut-keys");
    var talk = root.querySelector("#wt-cut-talk");
    var stats = root.querySelector("#wt-cut-stats");
    var verdict = root.querySelector("#wt-cut-verdict");
    var hidden = {};
    var buttons = {};
    var ed;

    KINDS.forEach(function (kind) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wt-chip wt-cut-chip wt-cut-k-" + kind.key;
      b.setAttribute("aria-pressed", "true");
      b.innerHTML = '<i aria-hidden="true"></i><span></span><small></small>';
      b.children[1].textContent = kind.label;
      b.addEventListener("click", function () {
        hidden[kind.key] = !hidden[kind.key];
        render();
      });
      buttons[kind.key] = b;
      keys.appendChild(b);
    });

    function render() {
      var text = ed.input.value;
      var found = findAll(text, talk.checked);
      var all = found.words.concat(found.chains);
      var counts = {};
      all.forEach(function (h) { counts[h.kind] = (counts[h.kind] || 0) + 1; });
      KINDS.forEach(function (kind) {
        var b = buttons[kind.key];
        b.lastChild.textContent = counts[kind.key] || 0;
        b.setAttribute("aria-pressed", hidden[kind.key] ? "false" : "true");
        b.classList.toggle("is-zero", !counts[kind.key]);
      });
      ed.paint(all.filter(function (h) { return !hidden[h.kind]; }).map(function (h) {
        return { start: h.start, end: h.end, cls: "wt-cut-m wt-cut-k-" + h.kind };
      }));

      var total = all.length;
      var wordCount = window.WtEditor.wordCount(text);
      var per100 = wordCount ? Math.round(total / wordCount * 1000) / 10 : 0;
      stats.innerHTML = wordCount ? stat(total, "marks") + stat(per100, "per 100 words") : "";
      if (!wordCount) {
        verdict.textContent = "Paste a paragraph from a draft you're revising.";
        verdict.className = "vn-verdict";
      } else if (!total) {
        verdict.textContent = "Nothing from the table. Clean.";
        verdict.className = "vn-verdict is-good";
      } else {
        verdict.textContent = "Any one of them is fine once. Ask of each: does the sentence lose anything without it?";
        verdict.className = "vn-verdict " + (per100 > 4 ? "is-bad" : "is-good");
      }
    }

    talk.addEventListener("change", render);
    keys.hidden = false;
    root.querySelector("#wt-cut-talk-wrap").hidden = false;
    withEditor(function () {
      ed = window.WtEditor.mount(root, { onChange: render });
      render();
    });
  }

  return { init: init };
})();
