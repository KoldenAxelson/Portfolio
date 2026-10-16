/* The braid — generates the classical Vedic recitation patterns from whatever
   phrase the reader types, and shows what the permutation actually buys you.

   The patterns are the real ones. Writing w1..wn for the words:

     pada    w1 / w2 / w3 …                      each word once, in order
     krama   w1w2 / w2w3 / w3w4 …                overlapping pairs
     jata    w1w2 w2w1 w1w2 / w2w3 w3w2 w2w3 …   each pair forward, back, forward
     ghana   w1w2 w2w1 w1w2w3 w3w2w1 w1w2w3 / …  each triple, woven

   ghana is defined over triples, so its last group is a pair and falls back to
   the jata weave; with fewer than three words the whole form does.

   THE POINT OF THE INTERACTION is the coverage strip, not the pretty chips. A
   word that is spoken once has one chance to survive the century; a word spoken
   nine times, in nine different neighbourhoods, is checkable against itself.
   Hovering a source word lights every utterance of it downstream, which is the
   only way to see that from the outside. */
window.GcBraid = (function () {
  var FORMS = [
    { key: "pada", label: "pada", gloss: "word by word",
      note: "The text split into its words, each said once, in order. This is the baseline — and it is where nearly all modern memorisation stops." },
    { key: "krama", label: "krama", gloss: "step",
      note: "Overlapping pairs. Every word is now said twice, as the end of one pair and the start of the next, so dropping one breaks two units instead of one." },
    { key: "jata", label: "jaṭā", gloss: "braid",
      note: "Each pair woven forward, back, and forward again. The sequence stops being something you can coast down — saying it requires holding the pair as a unit you can turn around." },
    { key: "ghana", label: "ghana", gloss: "dense",
      note: "The densest of the classical patterns; a reciter who has it is called a ghanapāṭhin. Every word is said in every neighbourhood it belongs to, in both directions." }
  ];

  /* Each output token is { i: index of the source word, g: which group it belongs
     to } — the group boundaries are what get the separators, and `i` is what the
     hover highlight and the coverage count both key off. */
  function build(words, key) {
    var n = words.length, out = [], i;
    function grp(g, idxs) { for (var k = 0; k < idxs.length; k++) out.push({ i: idxs[k], g: g }); }

    if (key === "pada" || n < 2) { for (i = 0; i < n; i++) grp(i, [i]); return out; }
    if (key === "krama") { for (i = 0; i < n - 1; i++) grp(i, [i, i + 1]); return out; }
    if (key === "jata" || n < 3) {
      for (i = 0; i < n - 1; i++) grp(i, [i, i + 1, i + 1, i, i, i + 1]);
      return out;
    }
    /* ghana: every triple woven, then the trailing pair as a jata group. */
    for (i = 0; i < n - 2; i++) {
      grp(i, [i, i + 1, i + 1, i, i, i + 1, i + 2, i + 2, i + 1, i, i, i + 1, i + 2]);
    }
    grp(n - 2, [n - 2, n - 1, n - 1, n - 2, n - 2, n - 1]);
    return out;
  }

  function words(str) {
    var raw = String(str || "").trim().split(/\s+/);
    var out = [];
    for (var i = 0; i < raw.length; i++) if (raw[i]) out.push(raw[i]);
    return out.slice(0, 9); /* ghana on ten words is 106 chips and stops reading as a pattern */
  }

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var input = root.querySelector("#gc-braid-in");
    var srcWrap = root.querySelector("#gc-braid-src");
    var tabsWrap = root.querySelector("#gc-braid-tabs");
    var outWrap = root.querySelector("#gc-braid-out");
    var noteEl = root.querySelector("#gc-braid-note");
    var statEl = root.querySelector("#gc-braid-stat");
    var playBtn = root.querySelector("#gc-braid-play");
    if (!input || !outWrap) return;

    var form = "ghana", ws = [], toks = [], timer = null, lit = -1;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var tabs = [];
    for (var t = 0; t < FORMS.length; t++) {
      (function (f) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "gc-tab"; b.setAttribute("role", "tab");
        b.innerHTML = '<span class="gc-tab-name">' + f.label + '</span><span class="gc-tab-gloss">' + f.gloss + "</span>";
        b.addEventListener("click", function () { form = f.key; render(); });
        tabsWrap.appendChild(b); tabs.push({ el: b, key: f.key });
      })(FORMS[t]);
    }

    function stop() { if (timer) { clearInterval(timer); timer = null; } lit = -1; playBtn.textContent = "Recite it"; }

    function paint() {
      var chips = outWrap.querySelectorAll(".gc-chip");
      for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("is-lit", i === lit);
      if (lit >= 0 && chips[lit] && chips[lit].scrollIntoView) {
        /* nearest, so the block never yanks the page around under the reader */
        try { chips[lit].scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
      }
    }

    function highlight(idx) {
      var chips = outWrap.querySelectorAll(".gc-chip");
      /* dim-the-rest lives on the container so it survives a re-render */
      outWrap.classList.toggle("has-same", idx >= 0);
      for (var i = 0; i < chips.length; i++) {
        chips[i].classList.toggle("is-same", idx >= 0 && +chips[i].getAttribute("data-i") === idx);
      }
      var cells = srcWrap.querySelectorAll(".gc-src-word");
      for (var j = 0; j < cells.length; j++) cells[j].classList.toggle("is-on", idx >= 0 && j === idx);
    }

    function render() {
      stop();
      ws = words(input.value);
      toks = build(ws, form);

      for (var t2 = 0; t2 < tabs.length; t2++) tabs[t2].el.classList.toggle("is-on", tabs[t2].key === form);
      for (var f2 = 0; f2 < FORMS.length; f2++) if (FORMS[f2].key === form) noteEl.textContent = FORMS[f2].note;

      /* count first — the coverage strip is the actual payload */
      var counts = [], m;
      for (m = 0; m < ws.length; m++) counts.push(0);
      for (m = 0; m < toks.length; m++) counts[toks[m].i]++;
      var max = 1;
      for (m = 0; m < counts.length; m++) if (counts[m] > max) max = counts[m];

      srcWrap.innerHTML = "";
      for (m = 0; m < ws.length; m++) {
        (function (k) {
          var cell = document.createElement("button");
          cell.type = "button"; cell.className = "gc-src-word";
          cell.innerHTML = '<span class="gc-src-txt">' + esc(ws[k]) + "</span>" +
            '<span class="gc-src-bar"><span style="height:' + Math.round((counts[k] / max) * 100) + '%"></span></span>' +
            '<span class="gc-src-n">' + counts[k] + "×</span>";
          cell.addEventListener("mouseenter", function () { highlight(k); });
          cell.addEventListener("mouseleave", function () { highlight(-1); });
          cell.addEventListener("focus", function () { highlight(k); });
          cell.addEventListener("blur", function () { highlight(-1); });
          srcWrap.appendChild(cell);
        })(m);
      }

      outWrap.innerHTML = "";
      var lastG = -1;
      for (m = 0; m < toks.length; m++) {
        if (toks[m].g !== lastG && lastG !== -1) {
          var sep = document.createElement("span");
          sep.className = "gc-sep"; sep.textContent = "/";
          outWrap.appendChild(sep);
        }
        lastG = toks[m].g;
        var chip = document.createElement("span");
        chip.className = "gc-chip"; chip.setAttribute("data-i", toks[m].i);
        chip.textContent = ws[toks[m].i];
        outWrap.appendChild(chip);
      }

      if (!ws.length) {
        statEl.textContent = "";
        outWrap.innerHTML = '<span class="gc-braid-empty">Type a phrase above.</span>';
        return;
      }
      var least = counts[0];
      for (m = 0; m < counts.length; m++) if (counts[m] < least) least = counts[m];
      statEl.innerHTML = "<b>" + ws.length + "</b> words → <b>" + toks.length +
        "</b> utterances · every word passes the ear at least <b>" + least + "×</b>";
    }

    playBtn.addEventListener("click", function () {
      if (timer) { stop(); paint(); return; }
      if (!toks.length) return;
      lit = -1; playBtn.textContent = "Stop";
      timer = setInterval(function () {
        lit++;
        if (lit >= toks.length) { stop(); paint(); return; }
        paint();
      }, reduce ? 420 : 240);
    });

    input.addEventListener("input", render);
    render();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
