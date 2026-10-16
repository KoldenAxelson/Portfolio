/* The tiny-experiment pact: "I will [action] for [duration]", then a check-in
   grid that remembers itself in localStorage. Storage is a convenience only;
   every read and write is guarded so the widget still works in a private
   window, it just forgets on reload. */
window.GmPact = (function () {
  var STORE_KEY = "gm-pact";
  var STATES = ["", "done", "skip"];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { return null; }
  }
  function save(pact) {
    try {
      if (pact) localStorage.setItem(STORE_KEY, JSON.stringify(pact));
      else localStorage.removeItem(STORE_KEY);
    } catch (e) { /* storage blocked: keep going in memory */ }
  }

  function init(root) {
    if (!root || root.getAttribute("data-gm-ready")) return;
    root.setAttribute("data-gm-ready", "1");

    var $ = function (id) { return root.querySelector("#gm-" + id); };
    var pact = load();

    function unitLabel(n, cadence) { return n + " " + cadence + (n === 1 ? "" : "s"); }

    function showBuilder() {
      $("build").hidden = false;
      $("fields").hidden = false;
      $("build-controls").hidden = false;
      $("run").hidden = true;
      updateStart();
    }

    function updateStart() {
      $("start").disabled = !$("action").value.trim() || !(parseInt($("count").value, 10) > 0);
    }

    function showRun() {
      $("build").hidden = true;
      $("run").hidden = false;
      $("pact-line").textContent = "I will " + pact.action + " every " + pact.cadence + " for " + unitLabel(pact.marks.length, pact.cadence) + ".";
      var grid = $("grid");
      grid.innerHTML = "";
      pact.marks.forEach(function (mark, i) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "gm-cell";
        cell.addEventListener("click", function () {
          pact.marks[i] = STATES[(STATES.indexOf(pact.marks[i]) + 1) % STATES.length];
          save(pact);
          paint();
        });
        grid.appendChild(cell);
      });
      paint();
    }

    function paint() {
      var cells = $("grid").children;
      var done = 0;
      var skipped = 0;
      for (var i = 0; i < cells.length; i++) {
        var mark = pact.marks[i];
        if (mark === "done") done++;
        if (mark === "skip") skipped++;
        cells[i].className = "gm-cell" + (mark ? " is-" + mark : "");
        cells[i].textContent = mark === "done" ? "✓" : mark === "skip" ? "–" : String(i + 1);
        cells[i].setAttribute("aria-label", pact.cadence + " " + (i + 1) + ": " + (mark === "done" ? "done" : mark === "skip" ? "skipped" : "not logged"));
      }
      var total = pact.marks.length;
      var tally = done + " of " + total + " done" + (skipped ? ", " + skipped + " skipped" : "") + ".";
      if (done + skipped === total) {
        tally += " Experiment over. How did it feel, what did you learn, and do you keep going or design the next one?";
      } else if (skipped) {
        tally += " For each skip, the useful question is why.";
      }
      $("tally").textContent = tally;
    }

    $("start").addEventListener("click", function () {
      var count = Math.min(60, Math.max(1, parseInt($("count").value, 10) || 1));
      pact = { action: $("action").value.trim(), cadence: $("cadence").value, marks: new Array(count).fill("") };
      save(pact);
      showRun();
    });
    $("reset").addEventListener("click", function () { pact = null; save(null); showBuilder(); });
    $("action").addEventListener("input", updateStart);
    $("count").addEventListener("input", updateStart);

    if (pact && pact.marks && pact.marks.length) showRun(); else showBuilder();
  }

  return { init: init };
})();
