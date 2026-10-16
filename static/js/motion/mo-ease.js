/* Easing, felt and seen: one dot, one plot of position over time, and a strobe
   track that shows speed as spacing without any animation, which is also what
   a reduced-motion reader gets instead of the moving dot. */
window.MoEase = (function () {
  var DURATION_MS = 1000;
  var STROBE_MS = 50;

  // Standard cubic-bezier timing: solve x(s) = t by bisection, return y(s).
  function bezier(x1, y1, x2, y2) {
    var axis = function (a, b, s) { return 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s; };
    return function (t) {
      var lo = 0, hi = 1, s = t;
      for (var i = 0; i < 30; i++) {
        s = (lo + hi) / 2;
        if (axis(x1, x2, s) < t) lo = s; else hi = s;
      }
      return axis(y1, y2, s);
    };
  }

  // Underdamped spring settling from 0 to 1; zeta below 1 overshoots.
  function spring(zeta, omega) {
    return function (t) {
      if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
      var damped = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + (zeta * omega / damped) * Math.sin(damped * t));
    };
  }

  var CURVES = [
    { id: "linear", label: "Linear", fn: function (t) { return t; }, note: "Constant speed. Reads as mechanical, which is why almost nothing in a good app moves this way." },
    { id: "in", label: "Ease in", fn: bezier(0.42, 0, 1, 1), note: "Starts slow, leaves fast. Right for things leaving the screen." },
    { id: "out", label: "Ease out", fn: bezier(0, 0, 0.58, 1), note: "Arrives fast, settles slowly. Right for things arriving." },
    { id: "inout", label: "Ease in-out", fn: bezier(0.42, 0, 0.58, 1), note: "Slow to start, fast in the middle, slow to stop: the move between two resting places." },
    { id: "gentle", label: "Spring: gentle", fn: spring(1, 9), note: "Critically damped. Settles without overshooting." },
    { id: "snappy", label: "Spring: snappy", fn: spring(0.7, 16), note: "Quick, with a small overshoot. The feel of a responsive button." },
    { id: "bouncy", label: "Spring: bouncy", fn: spring(0.3, 13), note: "Overshoots and bounces back, like the original iPhone's list fling the video describes." }
  ];
  var Y_MIN = -0.2;
  var Y_MAX = 1.5;
  // The tracks run past the end point so a spring's overshoot stays visible.
  var TRACK_MAX = 1.4;
  var toTrack = function (p) { return Math.max(0, Math.min(1, p / TRACK_MAX)) * 100 + "%"; };

  function init(root) {
    if (!root || root.getAttribute("data-mo-ready")) return;
    root.setAttribute("data-mo-ready", "1");

    var $ = function (id) { return root.querySelector("#mo-ease-" + id); };
    var picks = $("picks");
    var plot = $("plot");
    var dot = $("dot");
    var strobe = $("strobe");
    var shouldAnimate = !window.matchMedia || !matchMedia("(prefers-reduced-motion: reduce)").matches;
    var current = CURVES[3];
    var frameId = 0;

    var yToSvg = function (y) { return 190 - (y - Y_MIN) / (Y_MAX - Y_MIN) * 180; };

    function drawPlot() {
      var points = [];
      for (var i = 0; i <= 100; i++) points.push((10 + i * 1.8).toFixed(1) + "," + yToSvg(current.fn(i / 100)).toFixed(1));
      plot.innerHTML =
        '<line class="mo-grid" x1="10" x2="190" y1="' + yToSvg(0) + '" y2="' + yToSvg(0) + '"/>' +
        '<line class="mo-grid" x1="10" x2="190" y1="' + yToSvg(1) + '" y2="' + yToSvg(1) + '"/>' +
        '<polyline class="mo-curve" points="' + points.join(" ") + '"/>';
    }

    function placeDot(progress) { dot.style.left = toTrack(progress); }

    function drawStrobe() {
      Array.prototype.slice.call(strobe.querySelectorAll(".mo-mark")).forEach(function (m) { m.remove(); });
      for (var ms = 0; ms <= DURATION_MS; ms += STROBE_MS) {
        var mark = document.createElement("span");
        mark.className = "mo-mark";
        mark.style.left = toTrack(current.fn(ms / DURATION_MS));
        strobe.appendChild(mark);
      }
    }

    function choose(curve) {
      current = curve;
      cancelAnimationFrame(frameId);
      var buttons = picks.children;
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-mo-curve") === curve.id));
      $("note").textContent = curve.note;
      drawPlot();
      drawStrobe();
      placeDot(1);
    }

    function play() {
      cancelAnimationFrame(frameId);
      if (!shouldAnimate) { placeDot(1); return; }
      var start = performance.now();
      (function step(now) {
        if (!root.isConnected) return;
        var t = Math.min(1, (now - start) / DURATION_MS);
        placeDot(current.fn(t));
        if (t < 1) frameId = requestAnimationFrame(step);
      })(start);
    }

    CURVES.forEach(function (curve) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "vn-btn vn-btn-ghost mo-pick";
      button.textContent = curve.label;
      button.setAttribute("data-mo-curve", curve.id);
      button.addEventListener("click", function () { choose(curve); play(); });
      picks.appendChild(button);
    });
    [dot.parentNode, strobe].forEach(function (track) {
      var target = document.createElement("span");
      target.className = "mo-target";
      target.style.left = toTrack(1);
      track.appendChild(target);
    });
    $("play").addEventListener("click", play);
    $("controls").hidden = false;
    choose(current);
  }

  return { init: init };
})();
