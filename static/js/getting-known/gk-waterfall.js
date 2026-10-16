/* The content waterfall: one pillar piece broken into the stages the
   personal-brand video lists, with a running count and how many days of
   posting it covers. The point is the arithmetic, so the count leads and the
   generated titles are only there to make the stages concrete. */
window.GkWaterfall = (function () {
  var STAGES = [
    { label: "The pillar", count: 1, make: function (t) { return "The full piece: " + t; } },
    { label: "Short written posts", count: 10, make: function (t) { return "One lesson each from " + t; } },
    { label: "Short animated clips, 3 × 4 platforms", count: 12, make: function () { return "The three strongest ideas, drawn"; } },
    { label: "Talking-head cut, × 4 platforms", count: 4, make: function () { return "The main idea, said to camera"; } },
    { label: "Long video script and newsletter", count: 2, make: function (t) { return "The story behind " + t; } },
    { label: "Long LinkedIn post and a carousel", count: 2, make: function () { return "The steps, as slides"; } },
    { label: "B-roll clip", count: 1, make: function () { return "Footage of making it"; } }
  ];
  var STEP_MS = 260;

  function init(root) {
    if (!root || root.getAttribute("data-gk-ready")) return;
    root.setAttribute("data-gk-ready", "1");

    var input = root.querySelector("#gk-wf-in");
    var go = root.querySelector("#gk-wf-go");
    var list = root.querySelector("#gk-wf-list");
    var total = root.querySelector("#gk-wf-total");
    var rates = root.querySelectorAll("[data-gk-rate]");
    var perDay = 1;
    var shown = 0;
    var timer = null;
    var shouldAnimate = !window.matchMedia || !matchMedia("(prefers-reduced-motion: reduce)").matches;

    function title() { return "“" + (input.value.trim() || "your piece") + "”"; }

    function sumShown() {
      var n = 0;
      for (var i = 0; i < shown; i++) n += STAGES[i].count;
      return n;
    }

    function renderTotal() {
      if (!shown) { total.textContent = ""; return; }
      var pieces = sumShown();
      var days = Math.floor(pieces / perDay);
      total.textContent = pieces + " pieces from one" + (shown === STAGES.length
        ? ". At " + perDay + " a day, that's " + days + " days of posting before you need a new idea."
        : "…");
    }

    function addStage(stage) {
      var li = document.createElement("li");
      li.className = "gk-wf-stage";
      li.innerHTML = '<span class="gk-wf-n"></span><span class="gk-wf-body"><b></b><small></small></span>';
      li.querySelector(".gk-wf-n").textContent = "+" + stage.count;
      li.querySelector("b").textContent = stage.label;
      li.querySelector("small").textContent = stage.make(title());
      list.appendChild(li);
    }

    function pour() {
      clearTimeout(timer);
      list.innerHTML = "";
      shown = 0;
      (function next() {
        addStage(STAGES[shown]);
        shown++;
        renderTotal();
        if (shown < STAGES.length) timer = setTimeout(next, shouldAnimate ? STEP_MS : 0);
      })();
    }

    for (var i = 0; i < rates.length; i++) {
      rates[i].addEventListener("click", function (event) {
        perDay = Number(event.currentTarget.getAttribute("data-gk-rate"));
        for (var j = 0; j < rates.length; j++) rates[j].setAttribute("aria-pressed", String(rates[j] === event.currentTarget));
        renderTotal();
      });
    }
    go.addEventListener("click", pour);
    root.querySelector("#gk-wf-controls").hidden = false;
  }

  return { init: init };
})();
