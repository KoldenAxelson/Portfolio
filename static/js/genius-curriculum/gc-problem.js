/* The unsolved problem — a real problem, posed before the technique.

   The lock is the whole point: the approach is unavailable for ninety seconds,
   which is roughly the length of time it takes to stop reading and start
   thinking. Ratz's inversion was that students met hard problems before they
   were handed the method, and KoMaL's monthly cadence meant nobody was racing.

   There is a skip, deliberately. This runs on someone's personal site, not in a
   classroom, and a gate a reader cannot get past is a gate they close the tab
   on. The lesson survives being declinable; it does not survive being invisible.

   The countdown starts on init, and init is fired by the page's IntersectionObserver
   when the module scrolls into view — so it begins when the reader arrives at the
   problem, not when the page loads. */
window.GcProblem = (function () {
  var WAIT = 90;

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var btn = root.querySelector("#gc-pr-show");
    var skip = root.querySelector("#gc-pr-skip");
    var body = root.querySelector("#gc-pr-body");
    var note = root.querySelector("#gc-pr-note");
    if (!btn || !body) return;

    var left = WAIT, tick = null, opened = false;

    function label() {
      var m = Math.floor(left / 60), s = left % 60;
      btn.textContent = "Approach unlocks in " + m + ":" + (s < 10 ? "0" : "") + s;
    }
    function unlock() {
      if (tick) { clearInterval(tick); tick = null; }
      btn.disabled = false;
      btn.textContent = "Show how it goes";
      if (skip) skip.hidden = true;
      if (note) note.textContent = "Ninety seconds. Whatever you have now is what you built yourself — that is the part that transfers.";
    }
    function reveal() {
      if (opened) return;
      opened = true;
      body.hidden = false;
      btn.disabled = true;
      btn.textContent = "Approach shown";
      if (skip) skip.hidden = true;
      if (note) {
        note.textContent = left > 0
          ? "Skipped — which is allowed, and worth noticing. The method only becomes yours if you reach for it before you are handed it."
          : "You built whatever you have in those ninety seconds yourself. That is the part that transfers to the next problem.";
      }
      if (tick) { clearInterval(tick); tick = null; }
    }

    btn.disabled = true;
    label();
    tick = setInterval(function () {
      left--;
      if (left <= 0) unlock(); else label();
    }, 1000);

    btn.addEventListener("click", reveal);
    if (skip) skip.addEventListener("click", function (e) { e.preventDefault(); reveal(); });
  }
  return { init: init };
})();
