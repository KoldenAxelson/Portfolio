/* How many beats: the same six lines with no actions, a few, or one on every
   line. Each mode's version of each line is spelled out in full below, so the
   markup's "A few" version and the script's stay word for word the same. */
window.WtBeats = (function () {
  var LINES = {
    none: ["“You saw the board?”", "“I saw it.”", "“You went up eleven.”", "“Lucky.”", "“Nobody goes up eleven.”", "“I do.”"],
    some: ["Owen set his tray down across from Andre. “You saw the board?”", "“I saw it.”", "“You went up eleven.”", "“Lucky.”",
      "“Nobody goes up eleven.”", "Andre stood and pushed his chair in. “I do.”"],
    every: ["Owen set his tray down across from Andre. “You saw the board?”", "Andre tore his roll in half. “I saw it.”",
      "Owen leaned in, elbows on the table. “You went up eleven.”", "Andre shrugged and looked at the window. “Lucky.”",
      "Owen tapped the table twice. “Nobody goes up eleven.”", "Andre stood and pushed his chair in. “I do.”"]
  };
  var VERDICTS = {
    none: { good: false, text: "Voices floating in a white room. Six lines in, you're counting back to see who has the last word, and nobody's sitting anywhere." },
    some: { good: true, text: "Two beats: one to put them at the table, one to take Andre away from it. The middle runs at the speed of talk, which is where the tension lives." },
    every: { good: false, text: "A stage direction for every line, and the scene clogs. The roll, the elbows, the shrug and the tapping blur into one fidget, and the jab at the end lands softer." }
  };

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var scene = root.querySelector("#wt-beats-scene");
    var verdict = root.querySelector("#wt-beats-verdict");
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-beats]"));

    function show(mode) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-beats") === mode ? "true" : "false"); });
      scene.textContent = "";
      LINES[mode].forEach(function (line) {
        var p = document.createElement("p");
        p.textContent = line;
        scene.appendChild(p);
      });
      verdict.textContent = VERDICTS[mode].text;
      verdict.className = "vn-verdict " + (VERDICTS[mode].good ? "is-good" : "is-bad");
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-wt-beats")); });
    });
    root.querySelector("#wt-beats-modes").hidden = false;
    show("some");
  }

  return { init: init };
})();
