/* Predict, teach, check: the step shape from the learning-harness section.
   The guess comes before the explanation on purpose; showing the steps first
   would make the prediction free. Markup (shortcodes/how-to-learn/predict.html)
   carries every step and answer so the page reads with JS off; this only hides
   them until the reader commits. */
window.GcPredict = (function () {
  var VERDICTS = {
    teach: {
      right: "You called it. Most people guess far lower, because they picture a match with their own birthday.",
      wrong: "Not quite. The usual slip is picturing a match with your own birthday; the steps below count something else."
    },
    check: {
      right: "Right, and on a cue you weren't taught on. That's the recall practice is meant to build.",
      wrong: "Back to step one above: count the pairs, then ask how often one pair matches."
    }
  };

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var verdict = root.querySelector("#gc-pr-verdict");
    root.querySelectorAll("[data-gc-pr-reveal]").forEach(function (el) { el.hidden = true; });
    root.querySelectorAll("[data-gc-pr-group]").forEach(function (group) {
      wireGroup(root, group, verdict);
    });
  }

  function wireGroup(root, group, verdict) {
    var name = group.getAttribute("data-gc-pr-group");
    var reveal = root.querySelector('[data-gc-pr-reveal="' + name + '"]');
    var buttons = group.querySelectorAll("button");

    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        buttons.forEach(function (other) { other.setAttribute("aria-pressed", String(other === button)); });
        var isRight = button.hasAttribute("data-right");
        verdict.className = "vn-verdict " + (isRight ? "is-good" : "is-bad");
        verdict.textContent = "You said " + button.getAttribute("data-pick") + ". " + VERDICTS[name][isRight ? "right" : "wrong"];
        if (reveal) reveal.hidden = false;
      });
    });
  }

  return { init: init };
})();
