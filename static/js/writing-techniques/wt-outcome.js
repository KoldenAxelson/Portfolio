/* How the scene ends: four endings for one scene goal, each with what the
   reader is left asking and how hard it pulls into the next scene. The pull
   is my judgement of each ending, on a 0 to 100 scale. */
window.WtOutcome = (function () {
  var ENDINGS = {
    yes: { pull: 5, end: "Reyes signs. The squad gets the Commons on Friday, and it's a good night.",
      ask: "Nothing. The question is answered and the scene is over." },
    yesbut: { pull: 80, end: "Reyes signs. The room books under Owen's ID, and the next morning his score is down four.",
      ask: "Was it the game night? What else is the score watching?" },
    no: { pull: 15, end: "Reyes says no. Owen walks home.",
      ask: "Not much. He wanted it and didn't get it, and nothing changed." },
    noand: { pull: 90, end: "Reyes says no and logs the request. Owen walks home wondering who else can read the log, and stops posting in the squad chat.",
      ask: "What does the log do? How long before the squad notices he's gone quiet?" }
  };

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-end]"));
    var end = root.querySelector("#wt-outcome-end");
    var ask = root.querySelector("#wt-outcome-ask");
    var meter = root.querySelector("#wt-outcome-meter");
    var fill = root.querySelector("#wt-outcome-fill");

    function show(key) {
      var e = ENDINGS[key];
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-end") === key ? "true" : "false"); });
      end.textContent = e.end;
      ask.textContent = e.ask;
      fill.style.width = e.pull + "%";
      fill.classList.toggle("is-low", e.pull < 50);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-wt-end")); });
    });
    root.querySelector("#wt-outcome-pick").hidden = false;
    meter.hidden = false;
    show("yesbut");
  }

  return { init: init };
})();
