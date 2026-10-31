/* Openings and landings: each sentence's first word and the word it ends on.
   Flags an opening that repeats the sentence before it (the "He... He... He..."
   run) and an ending on a word that carries nothing, so the most important
   information can go last instead. Sentence splitting is the same rough
   . ! ? split as wt-rhythm.js. */
window.WtLandings = (function () {
  // Endings that rarely carry the point of a sentence. A prompt, never a rule.
  var WEAK = ["it", "them", "him", "her", "there", "then", "too", "also", "again", "now", "though", "anyway",
    "really", "very", "that", "this", "things", "stuff", "something", "anything", "everything", "so", "yet", "well"];
  // Words ending in -ly that aren't adverbs, so an ending on them isn't flagged.
  var NOT_ADVERBS = ["family", "only", "early", "reply", "supply", "apply", "ally", "rally", "belly", "holly",
    "july", "italy", "fly", "ugly", "holy", "lonely", "lovely", "friendly", "silly", "jelly", "bully", "lily"];
  var SAMPLES = {
    draft: "He walked to the mess hall. He got a tray and sat down with it. He looked at the screen on the wall and the score was there again. He didn't really want to eat anything after that. The noise was loud and he hated it.",
    revised: "Kevin walked to the mess hall. Tray, seat, the screen on the wall, and there it was again: his score. After that, nothing on the tray looked like food. He hated the noise."
  };

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

  function words(sentence) {
    return sentence.split(/\s+/).map(function (w) {
      return w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
    }).filter(Boolean);
  }

  // Sentences with their offsets in the raw text, for painting the editor.
  function splitSentences(text) {
    var out = [];
    var re = /[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g;
    var m;
    while ((m = re.exec(text))) {
      var lead = m[0].length - m[0].replace(/^\s+/, "").length;
      var body = m[0].trim();
      if (words(body).length) out.push({ text: body, start: m.index + lead });
    }
    return out;
  }

  function weakEnding(word) {
    var w = word.toLowerCase();
    if (WEAK.indexOf(w) !== -1) return true;
    return w.length > 4 && /ly$/.test(w) && NOT_ADVERBS.indexOf(w) === -1;
  }

  function describe(rows) {
    if (!rows.length) return { text: "Paste a paragraph to see where its sentences start and land.", isGood: null };
    var repeats = rows.filter(function (r) { return r.repeat; }).length;
    var weak = rows.filter(function (r) { return r.weak; }).length;
    var parts = [];
    if (repeats) parts.push(repeats + " sentence" + (repeats === 1 ? " opens" : "s open") + " the same way as the one before");
    if (weak) parts.push(weak + " land" + (weak === 1 ? "s" : "") + " on a word that carries nothing");
    if (!parts.length) return { text: "Every opening differs from the one before it, and every sentence ends on a word worth stopping on.", isGood: true };
    return { text: parts.join(", and ") + ". Move the strongest word to the end, or start one sentence on something other than its subject.", isGood: false };
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var list = root.querySelector("#wt-land-list");
    var verdict = root.querySelector("#wt-land-verdict");
    var presets = root.querySelector(".wt-presets");
    var stats = root.querySelector("#wt-land-stats");
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-preset]"));
    var ed;

    function render() {
      var previous = "";
      var marks = [];
      var rows = splitSentences(ed.input.value).map(function (s) {
        var sentence = s.text;
        var w = words(sentence);
        var first = w[0].toLowerCase();
        var last = w[w.length - 1];
        var row = { sentence: sentence, first: w[0], last: last, repeat: first === previous, weak: weakEnding(last) };
        var openAt = s.start + sentence.indexOf(w[0]);
        var lastAt = s.start + sentence.lastIndexOf(last);
        if (row.repeat) marks.push({ start: openAt, end: openAt + w[0].length, cls: "is-open" });
        if (row.weak) marks.push({ start: lastAt, end: lastAt + last.length, cls: "is-weak" });
        previous = first;
        return row;
      });
      ed.paint(marks);
      list.textContent = "";
      rows.forEach(function (row) {
        var li = document.createElement("li");
        li.className = "wt-land-row" + (row.repeat ? " is-repeat" : "") + (row.weak ? " is-weak" : "");
        var open = document.createElement("span");
        open.className = "wt-land-open";
        open.textContent = row.first;
        var body = document.createElement("span");
        body.className = "wt-land-text";
        // Underline the final occurrence of the last word inside the sentence.
        var at = row.sentence.lastIndexOf(row.last);
        body.appendChild(document.createTextNode(row.sentence.slice(0, at)));
        var end = document.createElement("u");
        end.className = "wt-land-end";
        end.textContent = row.last;
        body.appendChild(end);
        body.appendChild(document.createTextNode(row.sentence.slice(at + row.last.length)));
        li.appendChild(open);
        li.appendChild(body);
        var notes = [];
        if (row.repeat) notes.push("same opening");
        if (row.weak) notes.push("weak landing");
        if (notes.length) {
          var flag = document.createElement("span");
          flag.className = "wt-flag";
          flag.textContent = notes.join(" · ");
          li.appendChild(flag);
        }
        list.appendChild(li);
      });
      var repeats = rows.filter(function (r) { return r.repeat; }).length;
      var weak = rows.filter(function (r) { return r.weak; }).length;
      stats.innerHTML = rows.length
        ? '<div class="wt-stat' + (repeats ? " is-bad" : "") + '"><b>' + repeats + "</b><span>same openings</span></div>" +
          '<div class="wt-stat' + (weak ? " is-bad" : "") + '"><b>' + weak + "</b><span>weak landings</span></div>" +
          '<div class="wt-stat"><b>' + rows.length + "</b><span>sentences</span></div>"
        : "";
      var result = describe(rows);
      verdict.textContent = result.text;
      verdict.classList.toggle("is-good", result.isGood === true);
      verdict.classList.toggle("is-bad", result.isGood === false);
    }

    function pick(name) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-preset") === name ? "true" : "false"); });
      ed.set(SAMPLES[name]);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { pick(b.getAttribute("data-wt-preset")); });
    });
    presets.hidden = false;
    withEditor(function () {
      ed = window.WtEditor.mount(root, { onChange: render });
      ed.input.addEventListener("input", function () {
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      });
      render();
    });
  }

  return { init: init };
})();
