/* Havruta — a runnable 45-minute session.

   20 / 20 / 5, the shape the video describes. The timer is deliberately not a
   generic pomodoro: each phase carries the one rule that makes it that phase,
   and the middle phase is the swap, which is the part everyone skips when they
   run this from memory.

   Wall-clock deltas rather than counting interval ticks, so a backgrounded tab
   that throttles setInterval still comes back with the right time left. */
window.GcHavruta = (function () {
  var PHASES = [
    { label: "Your partner attacks", short: "attack", mins: 20,
      rule: "You state your answer once, then stop defending it out of habit. For twenty minutes your partner gives objections only — they are forbidden to agree with you, and “that's fair” is a foul." },
    { label: "Swap", short: "swap", mins: 20,
      rule: "Now argue the position you just spent twenty minutes demolishing, and mean it. This is the half that cannot be done alone, and the half that changes people's minds." },
    { label: "Write what changed", short: "write", mins: 5,
      rule: "Alone, on paper. Not who won — what moved. If the honest answer is “nothing”, write that too, and treat it as a result about the session rather than about the question." }
  ];

  function fmt(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var clock = root.querySelector("#gc-hv-clock");
    var name = root.querySelector("#gc-hv-name");
    var rule = root.querySelector("#gc-hv-rule");
    var bar = root.querySelector("#gc-hv-bar");
    var pips = root.querySelector("#gc-hv-pips");
    var start = root.querySelector("#gc-hv-start");
    var skip = root.querySelector("#gc-hv-skip");
    var reset = root.querySelector("#gc-hv-reset");
    if (!clock || !start) return;

    var idx = 0, left = PHASES[0].mins * 60000, running = false, last = 0, tick = null;

    var dots = [];
    for (var i = 0; i < PHASES.length; i++) {
      var d = document.createElement("span");
      d.className = "gc-hv-pip";
      d.innerHTML = "<b>" + PHASES[i].short + "</b><small>" + PHASES[i].mins + " min</small>";
      pips.appendChild(d); dots.push(d);
    }

    function paint() {
      var P = PHASES[idx];
      clock.textContent = fmt(left);
      name.textContent = P.label;
      rule.textContent = P.rule;
      bar.style.width = (100 - (left / (P.mins * 60000)) * 100).toFixed(2) + "%";
      for (var k = 0; k < dots.length; k++) {
        dots[k].classList.toggle("is-on", k === idx);
        dots[k].classList.toggle("is-done", k < idx);
      }
      root.classList.toggle("is-running", running);
      start.textContent = running ? "Pause" : (left === PHASES[idx].mins * 60000 && idx === 0 ? "Start the session" : "Resume");
    }

    function advance() {
      if (idx < PHASES.length - 1) { idx++; left = PHASES[idx].mins * 60000; }
      else { idx = 0; left = PHASES[0].mins * 60000; running = false; halt(); }
      paint();
    }
    function halt() { if (tick) { clearInterval(tick); tick = null; } }

    function run() {
      halt();
      last = new Date().getTime();
      tick = setInterval(function () {
        var now = new Date().getTime();
        left -= now - last; last = now;
        if (left <= 0) { left = 0; paint(); advance(); if (running) run(); return; }
        paint();
      }, 250);
    }

    start.addEventListener("click", function () {
      running = !running;
      if (running) run(); else halt();
      paint();
    });
    skip.addEventListener("click", function () { advance(); if (running) run(); });
    reset.addEventListener("click", function () {
      running = false; halt(); idx = 0; left = PHASES[0].mins * 60000; paint();
    });

    paint();
  }
  return { init: init };
})();
