/* Jevons' paradox on a feature backlog, after the AI-code video's example:
   as the cost per feature falls, more features clear the bar, and spend rises.
   The values are fixed, not random, so the video's two quoted points (2 at
   $6,000, 17 at $1,000) always hold. */
window.ClJevons = (function () {
  var VALUES = [1200, 400, 9000, 2200, 150, 1900, 4100, 700, 2800, 330, 1050, 5400, 900, 1350, 260, 7200,
    1700, 480, 3200, 100, 2500, 800, 1500, 200, 4800, 620, 1100, 950, 3600, 540];
  var money = function (n) { return "$" + n.toLocaleString("en-US"); };

  function init(root) {
    if (!root || root.getAttribute("data-cl-ready")) return;
    root.setAttribute("data-cl-ready", "1");

    var bars = root.querySelector("#cl-jv-bars");
    var slider = root.querySelector("#cl-jv-cost");
    var label = root.querySelector("#cl-jv-costlab");
    var out = root.querySelector("#cl-jv-out");
    var peak = Math.max.apply(null, VALUES);
    var line = document.createElement("span");
    line.className = "cl-jv-line";

    VALUES.forEach(function (value) {
      var bar = document.createElement("span");
      bar.className = "cl-jv-bar";
      bar.style.height = (value / peak * 100) + "%";
      bars.appendChild(bar);
    });
    bars.appendChild(line);

    function render() {
      var cost = Number(slider.value);
      var built = 0;
      for (var i = 0; i < VALUES.length; i++) {
        var isBuilt = VALUES[i] >= cost;
        if (isBuilt) built++;
        bars.children[i].classList.toggle("is-built", isBuilt);
      }
      line.style.bottom = Math.min(100, cost / peak * 100) + "%";
      label.textContent = money(cost);
      out.textContent = "At " + money(cost) + " a feature, " + built + " of " + VALUES.length +
        " backlog items are worth building: " + money(built * cost) + " of spend.";
    }

    slider.addEventListener("input", render);
    render();
  }

  return { init: init };
})();
