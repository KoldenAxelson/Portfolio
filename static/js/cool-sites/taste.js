(function () {
  // Taste Skill. One attribute drives the whole look; the stylesheet holds the
  // three directions so there is exactly one place to argue with them.
  var stage = document.getElementById("wdsTaste");
  var label = document.getElementById("wdsTasteDir");
  if (!stage) return;
  var DIRS = ["brutalist", "minimal", "soft"];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    stage.setAttribute("data-dir", "minimal");
    if (label) label.textContent = "minimal";
    return;
  }

  var i = 0, visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  }
  setInterval(function () {
    if (!visible) return;
    i = (i + 1) % DIRS.length;
    stage.setAttribute("data-dir", DIRS[i]);
    if (label) label.textContent = DIRS[i];
  }, 2400);
})();
