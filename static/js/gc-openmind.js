/* Empty the mind — the same five-sentence argument read two ways.

   The passage is rigged, but rigged the way real arguments are: every objection
   a reader fires on the way through is answered by a sentence further down. In
   "objections loaded" the reader never reaches those sentences, because each
   objection ends their attention on the sentence that provoked it. Flipping the
   switch is the whole demo — same words, same reader, different order of two
   activities Zhu Xi insisted were separate.

   `answeredBy` is a 1-based sentence number, printed as the receipt. */
window.GcOpenMind = (function () {
  var LINES = [
    { text: "Most note-taking is a way of avoiding the work of understanding.",
      obj: "Obviously false — I take notes constantly and I learn from them.", answeredBy: 4 },
    { text: "Copying a sentence down feels like learning, and it reliably substitutes for it.",
      obj: "There's research showing that writing things out aids retention.", answeredBy: 4 },
    { text: "A note you can search is a note you have no reason to remember, and a note you never revisit is indistinguishable from one you never took.",
      obj: "That's the entire point of a second brain — you're not supposed to remember it.", answeredBy: 4 },
    { text: "The exception is the note that could not have been copied: a summary in your own words, a question, an objection, a link to something the author never mentioned.",
      obj: "So the claim is just that some notes are better than others. That's trivial.", answeredBy: 5 },
    { text: "So the test for a note is not whether it captured the material, but whether writing it required you to have understood the material first.",
      obj: null, answeredBy: 0 }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var sw = root.querySelector("#gc-om-switch");
    var body = root.querySelector("#gc-om-body");
    var foot = root.querySelector("#gc-om-foot");
    var evalBtn = root.querySelector("#gc-om-eval");
    if (!body || !sw) return;

    var loaded = true, evaluated = false;

    function render() {
      body.innerHTML = "";
      var i;
      for (i = 0; i < LINES.length; i++) {
        var L = LINES[i];
        var row = document.createElement("div");
        row.className = "gc-om-row";
        var p = document.createElement("p");
        p.className = "gc-om-line" + (loaded && L.obj ? " is-dropped" : "");
        p.innerHTML = '<span class="gc-om-num">' + (i + 1) + "</span>" + esc(L.text);
        row.appendChild(p);
        if (loaded && L.obj) {
          var o = document.createElement("div");
          o.className = "gc-om-obj";
          o.innerHTML = '<span class="gc-om-tag">your objection</span>' + esc(L.obj) +
            '<span class="gc-om-ans">answered in sentence ' + L.answeredBy + " — which you have not read yet</span>";
          row.appendChild(o);
        }
        body.appendChild(row);
      }

      if (loaded) {
        foot.className = "gc-om-verdict is-bad";
        foot.innerHTML = "Four objections fired. All four are answered later in the passage. " +
          "You read one sentence of five — the last one, the only one nothing provoked you on.";
        evalBtn.hidden = true;
      } else if (!evaluated) {
        foot.className = "gc-om-verdict";
        foot.textContent = "Read it through with nothing in your hands. Then evaluate — separately, and second.";
        evalBtn.hidden = false;
        evalBtn.textContent = "Now evaluate";
      } else {
        foot.className = "gc-om-verdict is-good";
        foot.innerHTML = "Same four objections, raised after the passage instead of during it. " +
          "Three of them dissolve on sentence 4 and the fourth on sentence 5, which is information you now have.";
        evalBtn.hidden = true;
        for (var j = 0; j < LINES.length; j++) {
          if (!LINES[j].obj) continue;
          var d = document.createElement("div");
          d.className = "gc-om-obj is-late";
          d.innerHTML = '<span class="gc-om-tag">on sentence ' + (j + 1) + "</span>" + esc(LINES[j].obj) +
            '<span class="gc-om-ans">the passage answers this in sentence ' + LINES[j].answeredBy + "</span>";
          body.appendChild(d);
        }
      }
    }

    sw.addEventListener("change", function () { loaded = !sw.checked; evaluated = false; render(); });
    evalBtn.addEventListener("click", function () { evaluated = true; render(); });
    render();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
