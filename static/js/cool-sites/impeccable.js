(function () {
  // Impeccable. Flip the mock between the two states on a timer; every visual
  // difference between them is CSS, so the transition is the browser's job.
  var stage = document.getElementById("wdsImp");
  var cmd = document.getElementById("wdsImpCmd");
  if (!stage) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { stage.setAttribute("data-state", "clean"); return; }

  var visible = true, timer = null;
  function flip() {
    var next = stage.getAttribute("data-state") === "slop" ? "clean" : "slop";
    // The command only makes sense on the way in; going back is the undo.
    if (cmd) {
      cmd.textContent = next === "clean" ? "/polish" : "undo";
      cmd.classList.add("is-on");
      setTimeout(function () { cmd.classList.remove("is-on"); }, 1100);
    }
    stage.setAttribute("data-state", next);
  }
  function tick() { if (visible) flip(); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(stage);
  }
  timer = setInterval(tick, 2800);
  setTimeout(tick, 900);
})();
