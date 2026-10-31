/* Stretch the rubber band: ten chapters, each action (A), quiet (Q) or talk
   (T). Tension starts at START and each kind moves it by STEP; the line is
   drawn as an SVG path over the slots. A run of RUN_LIMIT action chapters
   snaps the band, a run of RUN_LIMIT talk chapters drags. The numbers are my
   sketch of the video's rubber band image, tuned so alternating reads as a
   rising zigzag. The SVG's viewBox is kept at its drawn width (VIEW_H tall)
   so the dots stay round at any size. */
window.WtPace = (function () {
  var KINDS = { A: "Action", Q: "Quiet", T: "Talk" };
  var NEXT = { A: "Q", Q: "T", T: "A" };
  var STEP = { A: 22, Q: -26, T: 5 };
  var START = 30;
  var MAX = 100;
  var MIN = 5;
  var RUN_LIMIT = 3;
  var VIEW_H = 110;
  var PAD = 8;

  function levels(plan) {
    var t = START;
    return plan.split("").map(function (k) {
      t = Math.max(MIN, Math.min(MAX, t + STEP[k]));
      return t;
    });
  }

  // Runs of RUN_LIMIT or more chapters of one kind, as [first, last] indexes.
  function runs(plan, kind) {
    var found = [];
    var start = 0;
    for (var i = 1; i <= plan.length; i++) {
      if (i < plan.length && plan[i] === plan[start]) continue;
      if (plan[start] === kind && i - start >= RUN_LIMIT) found.push([start, i - 1]);
      start = i;
    }
    return found;
  }

  function inRuns(i, list) {
    return list.some(function (r) { return i >= r[0] && i <= r[1]; });
  }

  function spans(list) {
    var words = list.map(function (r) { return (r[0] + 1) + " to " + (r[1] + 1); });
    return "Chapters " + (words.length > 1 ? words.slice(0, -1).join(", ") + " and " + words[words.length - 1] : words[0]);
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var svg = root.querySelector("#wt-pace-svg");
    var list = root.querySelector("#wt-pace-slots");
    var verdict = root.querySelector("#wt-pace-verdict");
    var presets = Array.prototype.slice.call(root.querySelectorAll("[data-wt-pace]"));
    var plan = "AQATAQTAAQ";
    var NS = "http://www.w3.org/2000/svg";
    var slots = [];

    list.textContent = "";
    for (var i = 0; i < plan.length; i++) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wt-pace-slot";
      (function (at) {
        b.addEventListener("click", function () {
          plan = plan.slice(0, at) + NEXT[plan[at]] + plan.slice(at + 1);
          render();
        });
      })(i);
      li.appendChild(b);
      list.appendChild(li);
      slots.push(b);
    }

    var viewW = 400;

    function x(i) {
      return (i + 0.5) / plan.length * viewW;
    }

    function y(t) {
      return VIEW_H - PAD - (t - MIN) / (MAX - MIN) * (VIEW_H - PAD * 2);
    }

    function render() {
      var t = levels(plan);
      var snapped = runs(plan, "A");
      var dragged = runs(plan, "T");
      presets.forEach(function (p) { p.setAttribute("aria-pressed", p.getAttribute("data-wt-pace") === plan ? "true" : "false"); });

      slots.forEach(function (b, i) {
        var k = plan[i];
        b.textContent = KINDS[k];
        b.className = "wt-pace-slot is-" + k + (inRuns(i, snapped) ? " is-snapped" : "") + (inRuns(i, dragged) ? " is-drag" : "");
        b.setAttribute("aria-label", "Chapter " + (i + 1) + ": " + KINDS[k] + ". Press to change.");
      });

      viewW = Math.max(200, Math.round(svg.getBoundingClientRect().width)) || 400;
      svg.setAttribute("viewBox", "0 0 " + viewW + " " + VIEW_H);
      svg.textContent = "";
      var d = t.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      var area = document.createElementNS(NS, "path");
      area.setAttribute("class", "wt-pace-area");
      area.setAttribute("d", d + " L" + x(t.length - 1).toFixed(1) + " " + VIEW_H + " L" + x(0).toFixed(1) + " " + VIEW_H + " Z");
      svg.appendChild(area);
      var line = document.createElementNS(NS, "path");
      line.setAttribute("class", "wt-pace-path");
      line.setAttribute("d", d);
      svg.appendChild(line);
      var snapY = y(MAX - 10);
      var limit = document.createElementNS(NS, "line");
      limit.setAttribute("class", "wt-pace-limit");
      limit.setAttribute("x1", "0");
      limit.setAttribute("x2", String(viewW));
      limit.setAttribute("y1", snapY.toFixed(1));
      limit.setAttribute("y2", snapY.toFixed(1));
      svg.appendChild(limit);
      t.forEach(function (v, i) {
        var dot = document.createElementNS(NS, "circle");
        dot.setAttribute("class", "wt-pace-dot is-" + plan[i] + (inRuns(i, snapped) ? " is-snapped" : ""));
        dot.setAttribute("cx", x(i).toFixed(1));
        dot.setAttribute("cy", y(v).toFixed(1));
        dot.setAttribute("r", "4.5");
        svg.appendChild(dot);
      });

      var notes = [];
      if (snapped.length) notes.push(spans(snapped) + " are action back to back. The band snaps and the reader stops feeling the explosions.");
      if (dragged.length) notes.push(spans(dragged) + " are talk in a row. That's where readers put the book down.");
      if (plan.indexOf("Q") === -1) notes.push("No quiet chapter anywhere, so nothing is ever let go.");
      if (!notes.length) {
        verdict.textContent = "Wound up and let go, chapter by chapter. The quiet chapters are what make the next action chapter land.";
        verdict.className = "vn-verdict is-good";
      } else {
        verdict.textContent = notes.join(" ");
        verdict.className = "vn-verdict is-bad";
      }
    }

    presets.forEach(function (p) {
      p.addEventListener("click", function () { plan = p.getAttribute("data-wt-pace"); render(); });
    });
    // Redraw when the line's width changes. It can also be 0 at first, when
    // the page hasn't laid this widget out yet, so the observer catches that.
    var drawnW = 0;
    var watch = function () {
      var w = Math.round(svg.getBoundingClientRect().width);
      if (w && w !== drawnW) { drawnW = w; render(); }
    };
    if (window.ResizeObserver) new ResizeObserver(watch).observe(svg);
    else window.addEventListener("resize", watch);
    root.querySelector("#wt-pace-presets").hidden = false;
    render();
  }

  return { init: init };
})();
