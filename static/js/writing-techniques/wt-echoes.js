/* Echo finder: colours every word that comes back within WINDOW_WORDS of an
   earlier use, so accidental repeats show up next to the chosen ones. Press a
   word's chip to mark it as on purpose; the marks reset when the word stops
   repeating. Stemming is crude on purpose: lowercase, drop a possessive and a
   plain plural -s, which is enough to pair "container" with "containers".
   The marks are painted inside the editor (wt-editor.js). */
window.WtEchoes = (function () {
  var WINDOW_WORDS = 40;
  var HUES = 6; // .wt-echo-0 to .wt-echo-5 in writing-techniques.css
  // Small words that repeat in every paragraph and mean nothing by it.
  // "every" is left out on purpose: anaphora is the echo this widget exists for.
  var STOP = ("a an the and or but if so of to in on at by for with from into onto up down out over off as " +
    "is was were be been being am are has have had do did does done not no nor than then that this these those " +
    "it its it's i me my mine we us our you your he him his she her they them their there here what which who whom " +
    "when where why how all any some can could would should will shall may might must just very too also " +
    "s t don didn wasn isn couldn wouldn i'm i'd i'll he'd he's she's we're they're you're one").split(" ");

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

  function stem(word) {
    var w = word.toLowerCase().replace(/[’']s$/, "").replace(/[’']/g, "'");
    if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1);
    return w;
  }

  // Splits text into word and non-word runs, keeping everything, so the
  // output can be rebuilt exactly as typed.
  function tokens(text) {
    var out = [];
    var re = /([A-Za-z][A-Za-z’']*)|([^A-Za-z]+)/g;
    var m;
    while ((m = re.exec(text))) out.push(m[1] ? { word: m[1], key: stem(m[1]), start: m.index } : { gap: m[2] });
    return out;
  }

  function findEchoes(list) {
    var lastSeen = {};
    var echoed = {};
    var index = 0;
    list.forEach(function (t) {
      if (!t.word) return;
      t.at = index++;
      if (STOP.indexOf(t.key) !== -1 || t.key.length < 3) return;
      if (lastSeen[t.key] !== undefined && t.at - lastSeen[t.key] <= WINDOW_WORDS) echoed[t.key] = true;
      lastSeen[t.key] = t.at;
    });
    return echoed;
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var chips = root.querySelector("#wt-echo-chips");
    var pill = root.querySelector("#wt-echo-pill");
    var verdict = root.querySelector("#wt-echo-verdict");
    var chosen = {};
    var ed;

    function render() {
      var list = tokens(ed.input.value);
      var echoed = findEchoes(list);
      var keys = Object.keys(echoed);
      var hue = {};
      keys.forEach(function (k, i) { hue[k] = i % HUES; });
      Object.keys(chosen).forEach(function (k) { if (!echoed[k]) delete chosen[k]; });

      ed.paint(list.filter(function (t) { return t.word && echoed[t.key]; }).map(function (t) {
        return { start: t.start, end: t.start + t.word.length, cls: "wt-echo wt-echo-" + hue[t.key] + (chosen[t.key] ? " is-chosen" : "") };
      }));

      chips.textContent = "";
      keys.forEach(function (k) {
        var count = list.filter(function (t) { return t.key === k; }).length;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "wt-chip wt-echo-" + hue[k];
        chip.setAttribute("aria-pressed", chosen[k] ? "true" : "false");
        chip.setAttribute("data-k", k);
        chip.innerHTML = "<span></span><small></small>";
        chip.firstChild.textContent = k;
        chip.lastChild.textContent = "×" + count;
        chip.addEventListener("click", function () {
          if (chosen[k]) delete chosen[k];
          else chosen[k] = true;
          render();
          var again = chips.querySelector('[data-k="' + k + '"]');
          if (again) again.focus();
        });
        chips.appendChild(chip);
      });

      var marked = keys.filter(function (k) { return chosen[k]; }).length;
      pill.textContent = keys.length ? marked + " of " + keys.length + " echoes chosen" : "No echoes";
      pill.className = "wt-pill" + (keys.length && marked === keys.length || !keys.length ? " is-good" : "");
      if (!keys.length) {
        verdict.textContent = "No word comes back within " + WINDOW_WORDS + " words of itself.";
        verdict.className = "vn-verdict is-good";
      } else if (marked === keys.length) {
        verdict.textContent = "Every echo is marked as chosen. If you'd defend each one to an editor, keep them.";
        verdict.className = "vn-verdict is-good";
      } else {
        var loose = keys.filter(function (k) { return !chosen[k]; });
        verdict.textContent = "Still unmarked: " + loose.join(", ") + ". Make each one stronger, or swap it for a different word.";
        verdict.className = "vn-verdict is-bad";
      }
    }

    withEditor(function () {
      ed = window.WtEditor.mount(root, { onChange: render });
      render();
    });
  }

  return { init: init };
})();
