/* The trust score from the self-improvement video, as a toy: every day is a
   promise kept or broken, and the score answers. Scoring and the graduation
   rule are stated in the caption of shortcodes/get-moving/trust.html; keep
   them in step. No storage: it's a demonstration, the pact widget is the log. */
window.GmTrust = (function () {
  var START = 50;
  var KEPT = 5;
  var BROKEN = -8;
  var KEEP_ODDS = { small: 0.9, big: 0.5 };
  var GRADUATE_KEPT = 5;
  var STATES = ["", "kept", "missed"];
  var LABELS = { "": "not yet", kept: "kept", missed: "missed" };

  function scoreOf(days) {
    var score = START;
    var missedTwice = [];
    days.forEach(function (state, i) {
      if (state === "kept") score = Math.min(100, score + KEPT);
      if (state !== "missed") return;
      var isSecondMiss = days[i - 1] === "missed";
      score = Math.max(0, score + (isSecondMiss ? BROKEN * 2 : BROKEN));
      if (isSecondMiss) missedTwice.push(i);
    });
    return { score: score, missedTwice: missedTwice };
  }

  function weekGraduated(days, week, missedTwice) {
    var slice = days.slice(week * 7, week * 7 + 7);
    var kept = slice.filter(function (state) { return state === "kept"; }).length;
    var hasDouble = missedTwice.some(function (i) { return i >= week * 7 && i < week * 7 + 7; });
    return kept >= GRADUATE_KEPT && !hasDouble;
  }

  function init(root) {
    if (!root || root.getAttribute("data-gm-ready")) return;
    root.setAttribute("data-gm-ready", "1");
    var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-gm-day]"));
    var days = buttons.map(function () { return ""; });
    var simTimer = null;
    var hint = root.querySelector("#gm-tr-note").textContent;

    function paint(note) {
      var result = scoreOf(days);
      root.querySelector("#gm-tr-score").textContent = result.score;
      root.querySelector("#gm-tr-fill").style.width = result.score + "%";
      buttons.forEach(function (button, i) {
        button.className = "gm-tr-day" + (days[i] ? " is-" + days[i] : "") + (result.missedTwice.indexOf(i) >= 0 ? " is-twice" : "");
        button.setAttribute("aria-label", button.getAttribute("aria-label").replace(/: .*$/, ": " + LABELS[days[i]]));
      });
      [0, 1].forEach(function (week) {
        root.querySelector("#gm-tr-grad-" + (week + 1)).hidden = !weekGraduated(days, week, result.missedTwice);
      });
      if (note !== undefined) { root.querySelector("#gm-tr-note").textContent = note; return; }
      var last = result.missedTwice[result.missedTwice.length - 1];
      root.querySelector("#gm-tr-note").textContent = last !== undefined
        ? "Two misses in a row cost double. Make the next one small enough that you can't not do it."
        : "Score " + result.score + ". Kept promises add a little; broken ones cost more.";
    }

    function stopSim() { clearTimeout(simTimer); simTimer = null; }

    function simulate(size) {
      stopSim();
      days = days.map(function () { return ""; });
      var i = 0;
      (function next() {
        if (i >= days.length) {
          var score = scoreOf(days).score;
          paint(size === "small" ? "Two weeks of two-page promises: " + score + "." : "Two weeks of fifty-page promises: " + score + ". Each one broken teaches you to expect the next.");
          return;
        }
        days[i] = Math.random() < KEEP_ODDS[size] ? "kept" : "missed";
        i++;
        paint("");
        simTimer = setTimeout(next, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 140);
      })();
    }

    buttons.forEach(function (button, i) {
      button.disabled = false;
      button.addEventListener("click", function () {
        stopSim();
        days[i] = STATES[(STATES.indexOf(days[i]) + 1) % STATES.length];
        paint();
      });
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-gm-sim]"), function (button) {
      button.addEventListener("click", function () { simulate(button.getAttribute("data-gm-sim")); });
    });
    root.querySelector("#gm-tr-clear").addEventListener("click", function () {
      stopSim();
      days = days.map(function () { return ""; });
      paint(hint);
    });
    root.querySelector("#gm-tr-controls").hidden = false;
    paint(hint);
  }

  return { init: init };
})();
