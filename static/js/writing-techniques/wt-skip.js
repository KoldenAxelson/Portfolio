/* Skip some time: pick a gap and how the reader finds out. The break above
   the new section follows the gap (BREAKS, the video's sizes); the opening
   line follows both. A date header puts its date on its own line. */
window.WtSkip = (function () {
  var BREAKS = { hour: "", day: "* * *", weeks: "Chapter 12", years: "Part Two" };
  var GAP_WORDS = { hour: "an hour", day: "a night", weeks: "three weeks", years: "four years" };
  var LINES = {
    hour: {
      header: ["6:40 p.m.", "The paint on the posts was dry."],
      marker: ["", "An hour later, the paint on the posts was dry."],
      clue: ["", "By the time the paint on the posts was dry, the light on them had gone orange."],
      summary: ["", "We waited out the paint, then the light, then the Sergeant."],
      none: ["", "The paint on the posts was dry."]
    },
    day: {
      header: ["Tuesday", "The scores went up at six."],
      marker: ["", "The next morning, the scores went up at six."],
      clue: ["", "Owen's sunburn had started to peel by the time the scores went up."],
      summary: ["", "We slept, we ate, we painted the posts again, and at six the scores went up."],
      none: ["", "The scores went up at six."]
    },
    weeks: {
      header: ["Row Nine, June 3", "Mateo was back."],
      marker: ["", "Three weeks later, Mateo was back."],
      clue: ["", "The stitches behind Mateo's ear had healed to a pink line by the time he came back."],
      summary: ["", "June went by in fences and fryer oil. Mateo came back on a Thursday."],
      none: ["", "Mateo was back."]
    },
    years: {
      header: ["2046", "They painted Row Nine again."],
      marker: ["", "Four years later, they painted Row Nine for the third time."],
      clue: ["", "The beagle on Row Six had gone grey around the mouth, and Row Nine was on its third coat of paint."],
      summary: ["", "There were four more springs, a war, and two more coats of paint on Row Nine."],
      none: ["", "They painted Row Nine again."]
    }
  };

  function judge(gap, how) {
    if (how === "none" && (gap === "weeks" || gap === "years")) {
      return { good: false, text: "Nothing tells the reader " + GAP_WORDS[gap] + " went by, so they'll read this as the next morning. When the truth arrives it costs them a reread." };
    }
    if (how === "none" && gap === "day") {
      return { good: true, text: "Readers will assume a little time passed, and a night is a little. Risky, but it holds." };
    }
    if (how === "header" && (gap === "hour" || gap === "day")) {
      return { good: false, text: "A date header for " + GAP_WORDS[gap] + " is a lot of furniture. Save headers for a book that uses them everywhere." };
    }
    if (how === "clue") {
      return { good: true, text: "The reader works out the gap from the world itself. The quietest of the explicit options, and the one that does two jobs." };
    }
    if (how === "summary") {
      return { good: true, text: "Summary moves fast and can carry a mood, which suits " + GAP_WORDS[gap] + " that doesn't deserve scenes of its own." };
    }
    return { good: true, text: "Clear and quick. A time marker in the first sentence is what he finds in about nine chapters out of ten." };
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var gap = "weeks";
    var how = "clue";
    var gapButtons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-gap]"));
    var howButtons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-how]"));
    var brk = root.querySelector("#wt-skip-break");
    var head = root.querySelector("#wt-skip-head");
    var next = root.querySelector("#wt-skip-next");
    var verdict = root.querySelector("#wt-skip-verdict");

    function render() {
      gapButtons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-gap") === gap ? "true" : "false"); });
      howButtons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-how") === how ? "true" : "false"); });
      var line = LINES[gap][how];
      brk.textContent = BREAKS[gap];
      brk.hidden = !BREAKS[gap];
      head.textContent = line[0];
      head.hidden = !line[0];
      next.textContent = line[1];
      var v = judge(gap, how);
      verdict.textContent = v.text;
      verdict.className = "vn-verdict " + (v.good ? "is-good" : "is-bad");
    }

    gapButtons.forEach(function (b) { b.addEventListener("click", function () { gap = b.getAttribute("data-wt-gap"); render(); }); });
    howButtons.forEach(function (b) { b.addEventListener("click", function () { how = b.getAttribute("data-wt-how"); render(); }); });
    root.querySelector("#wt-skip-ctl").hidden = false;
    render();
  }

  return { init: init };
})();
