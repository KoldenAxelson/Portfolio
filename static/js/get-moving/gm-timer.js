/* A ten-minute timer with a permission slip at the end. Time is measured
   against Date.now(), so a throttled background tab still finishes on time.
   Only the finish is announced; a per-second aria-live would be noise. */
window.GmTimer = (function () {
  var TICK_MS = 250;

  function init(root) {
    if (!root || root.getAttribute("data-gm-ready")) return;
    root.setAttribute("data-gm-ready", "1");

    var $ = function (id) { return root.querySelector("#gm-" + id); };
    var lengths = root.querySelectorAll("[data-gm-min]");
    var totalMs = 10 * 60 * 1000;
    var remainingMs = totalMs;
    var endsAt = 0;
    var timer = null;

    function format(ms) {
      var seconds = Math.ceil(ms / 1000);
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function paint() {
      $("clock").textContent = format(remainingMs);
      $("bar").style.width = (100 - remainingMs / totalMs * 100) + "%";
    }

    function tick() {
      remainingMs = Math.max(0, endsAt - Date.now());
      paint();
      if (remainingMs > 0) return;
      stop();
      $("go").textContent = "Start";
      $("done").textContent = "Time. You're allowed to stop now. If you'd rather keep going, that's the whole trick.";
    }

    function stop() { clearInterval(timer); timer = null; }

    function reset(minutes) {
      stop();
      totalMs = minutes * 60 * 1000;
      remainingMs = totalMs;
      $("go").textContent = "Start";
      $("done").textContent = "";
      paint();
    }

    $("go").addEventListener("click", function () {
      if (timer) { stop(); $("go").textContent = "Resume"; return; }
      if (remainingMs === 0) reset(totalMs / 60000);
      endsAt = Date.now() + remainingMs;
      timer = setInterval(tick, TICK_MS);
      $("go").textContent = "Pause";
      $("done").textContent = "";
    });
    $("stop").addEventListener("click", function () { reset(totalMs / 60000); });
    for (var i = 0; i < lengths.length; i++) {
      lengths[i].addEventListener("click", function (event) {
        for (var j = 0; j < lengths.length; j++) lengths[j].setAttribute("aria-pressed", String(lengths[j] === event.currentTarget));
        reset(Number(event.currentTarget.getAttribute("data-gm-min")));
      });
    }
    $("timer-controls").hidden = false;
    paint();
  }

  return { init: init };
})();
