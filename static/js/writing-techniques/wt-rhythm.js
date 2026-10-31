/* Sentence rhythm meter: one bar per sentence, sized by word count, with the
   shortest and longest marked in the bars and painted in the editor
   (wt-editor.js). Splitting on . ! ? is rough (it breaks on "Mr." and
   decimals), which is fine for a paragraph of fiction. */
window.WtRhythm = (function () {
  var SHORT_WORDS = 3;
  var NARROW_SPREAD_WORDS = 10;
  var MIN_SENTENCES_FOR_SPREAD = 4;

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

  // Sentences with their offsets in the raw text, for painting.
  function splitSentences(text) {
    var out = [];
    var re = /[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g;
    var m;
    while ((m = re.exec(text))) {
      var lead = m[0].length - m[0].replace(/^\s+/, "").length;
      var body = m[0].trim();
      var words = body.split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }).length;
      if (words) out.push({ text: body, words: words, start: m.index + lead, end: m.index + lead + body.length });
    }
    return out;
  }

  function describe(sentences, shortest, longest) {
    if (!sentences.length) return { text: "Paste a paragraph to see its shape.", isGood: null };
    if (shortest > SHORT_WORDS) return { text: "Nothing under four words. Try a short one.", isGood: false };
    if (sentences.length >= MIN_SENTENCES_FOR_SPREAD && longest - shortest < NARROW_SPREAD_WORDS) {
      return { text: "They all sit close together. Stretch one long.", isGood: false };
    }
    return { text: "Good spread: a short one to land on and a long one to travel in.", isGood: true };
  }

  function stat(value, label) {
    return '<div class="wt-stat"><b>' + value + "</b><span>" + label + "</span></div>";
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var bars = root.querySelector("#wt-bars");
    var verdict = root.querySelector("#wt-verdict");
    var stats = root.querySelector("#wt-rhythm-stats");
    var ed;

    function render() {
      var sentences = splitSentences(ed.input.value);
      var lengths = sentences.map(function (s) { return s.words; });
      var shortest = Math.min.apply(null, lengths);
      var longest = Math.max.apply(null, lengths);
      bars.textContent = "";
      var marks = [];
      sentences.forEach(function (s) {
        var isShort = s.words === shortest;
        var isLong = s.words === longest;
        if (isShort) marks.push({ start: s.start, end: s.end, cls: "is-short" });
        else if (isLong) marks.push({ start: s.start, end: s.end, cls: "is-long" });
        var row = document.createElement("li");
        row.className = "wt-bar" + (isShort ? " is-short" : "") + (isLong ? " is-long" : "");
        row.title = s.text;
        var count = document.createElement("span");
        count.className = "wt-n";
        count.textContent = s.words;
        var fill = document.createElement("span");
        fill.className = "wt-fill";
        fill.style.width = (s.words / longest * 100) + "%";
        var label = document.createElement("span");
        label.className = "vn-sr";
        label.textContent = " words: " + s.text;
        row.appendChild(count);
        row.appendChild(fill);
        row.appendChild(label);
        bars.appendChild(row);
      });
      ed.paint(marks);
      stats.innerHTML = sentences.length
        ? stat(shortest, "shortest") + stat(longest, "longest") + stat(sentences.length, "sentences")
        : "";
      var result = describe(sentences, shortest, longest);
      verdict.textContent = result.text;
      verdict.classList.toggle("is-good", result.isGood === true);
      verdict.classList.toggle("is-bad", result.isGood === false);
    }

    withEditor(function () {
      ed = window.WtEditor.mount(root, { onChange: render });
      render();
    });
  }

  return { init: init };
})();
