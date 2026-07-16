/* The harness loop, made visible — a ReAct-style agent trace.
   A raw model can't act; a harness wraps it in a reason -> act -> observe loop, feeding
   it tools and looping until the job is done. This plays a scripted trace of a coding
   agent fixing a failing test (read, edit, run, react), one step at a time. The trace is
   illustrative, but the shape — think, call a tool, read the result, decide again — is
   exactly how a harness like Claude Code operates. */
window.MliAgent = (function () {
  var STEPS = [
    { t: "thought", x: "The test suite is red. Let me see what's actually failing." },
    { t: "action", x: "run_tests()" },
    { t: "obs", x: "FAIL test_add: add(2, 3) expected 5, got 6" },
    { t: "thought", x: "Off by one. I'll read the function to find the bug." },
    { t: "action", x: "read_file(\"math.py\")" },
    { t: "obs", x: "def add(a, b):\n    return a + b + 1" },
    { t: "thought", x: "There's a stray + 1. Remove it." },
    { t: "action", x: "edit_file(\"math.py\", \"return a + b\")" },
    { t: "obs", x: "math.py updated" },
    { t: "thought", x: "Re-run the suite to confirm the fix." },
    { t: "action", x: "run_tests()" },
    { t: "obs", x: "All 14 tests passed" },
    { t: "answer", x: "Fixed a stray + 1 in add(). The suite is green." }
  ];
  var LABEL = { thought: "THINK", action: "ACT", obs: "OBSERVE", answer: "DONE" };
  var PHASE = { thought: "reason", action: "act", obs: "observe" };
  var DELAY = { thought: 850, action: 700, obs: 1050, answer: 700 };

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function init(root) {
    if (!root) return;
    var phasesEl = root.querySelector("#mli-ag-phases");
    var logEl = root.querySelector("#mli-ag-log");
    var replay = root.querySelector("#mli-ag-replay");
    var stepBtn = root.querySelector("#mli-ag-step");
    if (!logEl) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // phase strip
    var pills = {};
    if (phasesEl) {
      ["reason", "act", "observe"].forEach(function (p, i) {
        if (i) { var ar = document.createElement("span"); ar.className = "mli-ag-arrow"; ar.textContent = "→"; phasesEl.appendChild(ar); }
        var el = document.createElement("span"); el.className = "mli-ag-pill"; el.textContent = p;
        phasesEl.appendChild(el); pills[p] = el;
      });
      var loop = document.createElement("span"); loop.className = "mli-ag-loop"; loop.textContent = "↺"; phasesEl.appendChild(loop);
      var done = document.createElement("span"); done.className = "mli-ag-done"; done.textContent = "done ✓"; phasesEl.appendChild(done); pills._done = done;
    }
    function setPhase(t) {
      for (var k in pills) if (k !== "_done") pills[k].classList.remove("is-active");
      if (pills._done) pills._done.classList.remove("is-on");
      if (t === "answer") { if (pills._done) pills._done.classList.add("is-on"); }
      else if (PHASE[t] && pills[PHASE[t]]) pills[PHASE[t]].classList.add("is-active");
    }

    // build steps
    var els = [];
    logEl.innerHTML = "";
    STEPS.forEach(function (s) {
      var d = document.createElement("div"); d.className = "mli-ag-step t-" + s.t;
      var lab = document.createElement("span"); lab.className = "mli-ag-lab"; lab.textContent = LABEL[s.t];
      var body = document.createElement("div"); body.className = "mli-ag-body"; body.textContent = s.x;
      d.appendChild(lab); d.appendChild(body); logEl.appendChild(d); els.push(d);
    });

    var shown = 0, timer = null, playing = false;
    function clear() { if (timer) { clearTimeout(timer); timer = null; } }
    function reset() { clear(); playing = false; shown = 0; for (var i = 0; i < els.length; i++) els[i].classList.remove("is-shown"); setPhase(null); }
    function next() {
      if (shown >= STEPS.length) { playing = false; setPhase("answer"); return; }
      els[shown].classList.add("is-shown");
      setPhase(STEPS[shown].t);
      shown++;
      if (playing) timer = setTimeout(next, DELAY[STEPS[shown - 1].t]);
    }
    function play() { reset(); playing = true; timer = setTimeout(next, 250); }
    function stepOnce() { playing = false; clear(); next(); }

    if (replay) replay.addEventListener("click", play);
    if (stepBtn) stepBtn.addEventListener("click", stepOnce);

    if (reduce) { for (var i = 0; i < els.length; i++) els[i].classList.add("is-shown"); setPhase("answer"); }
    else play();
  }

  return { init: init };
})();
