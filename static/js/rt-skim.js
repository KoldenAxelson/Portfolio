/* The five-second pass — the skim, run on the reader.

   The prose says a recruiter decides in about five seconds and that only
   claims survive; the widget makes you live it. Two flashes of the same
   fictional candidate — one written as duties, one as evidence — each followed
   by a recall test. The duty quiz is rigged the way real vagueness is rigged:
   all four options are interchangeable fog, so even a right answer teaches the
   lesson (you know you guessed). The evidence quiz is genuinely passable,
   because a number bound to an outcome gives memory something to hold.

   No text entry, nothing stored, nothing leaves the page. */
window.RtSkim = (function () {
  var SECONDS = 5;

  var CANDS = [
    {
      tag: "Candidate one",
      name: "Jordan Avery",
      role: "Operations Manager · Meridian Logistics",
      bullets: [
        "Responsible for overseeing daily operational duties",
        "Managed communications with cross-functional stakeholders",
        "Supported various process improvement initiatives",
        "Assisted with vendor relationships and contract renewals",
        "Handled recurring reporting for senior leadership"
      ],
      q: "Five seconds are up. One of these was on the page — which?",
      opts: [
        "Responsible for coordinating daily operational tasks",
        "Responsible for overseeing daily operational duties",
        "Responsible for managing day-to-day operations",
        "Responsible for supervising routine operations work"
      ],
      right: 1,
      won: "You picked it — a one-in-four shot between four phrasings that all mean nothing. Be honest about whether that was memory or luck.",
      lost: "It was the second one. You had it in front of you five seconds ago and there was no way to keep it — nothing was claimed, so nothing stuck.",
      next: "Show me candidate two"
    },
    {
      tag: "Candidate two",
      name: "Jordan Avery",
      role: "Operations Manager · Meridian Logistics",
      bullets: [
        "Cut operating costs 15% in Q2 by consolidating 14 vendor contracts",
        "Reduced onboarding from 6 weeks to 3 by rebuilding the training program",
        "Eliminated a 12-hour weekly reporting cycle by automating it",
        "Drove delivery scores up 12% across 12 regional markets"
      ],
      q: "Same five seconds. Which of these was on the page?",
      opts: [
        "Cut operating costs 8% by renegotiating carrier rates",
        "Increased sales 15% by consolidating vendor contracts",
        "Cut operating costs 15% by consolidating 14 vendor contracts",
        "Reduced churn 15% by consolidating support tooling"
      ],
      right: 2,
      won: "That's the mechanism. A number bound to an outcome gives memory something to grab — same person, same job, same five seconds, different resume.",
      lost: "Missed — but notice you were choosing between real, distinct claims this time, not four spellings of fog. That difference is the whole page.",
      next: "So what did I just do?"
    }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-rt-ready")) return;
    root.setAttribute("data-rt-ready", "1");

    var stage = root.querySelector("#rt-skim-stage");
    var go = root.querySelector("#rt-skim-go");
    if (!stage || !go) return;

    var score = [false, false];

    function page(c) {
      var h = '<div class="rt-sk-page"><span class="rt-sk-tag">' + c.tag + "</span>" +
        '<p class="rt-sk-name">' + c.name + '</p><p class="rt-sk-role">' + c.role + "</p><ul>";
      for (var i = 0; i < c.bullets.length; i++) h += "<li>" + esc(c.bullets[i]) + "</li>";
      return h + "</ul></div>";
    }

    function flash(idx) {
      var c = CANDS[idx];
      stage.innerHTML = page(c) +
        '<div class="rt-sk-track"><span class="rt-sk-bar" id="rt-sk-bar"></span></div>';
      var bar = stage.querySelector("#rt-sk-bar");
      /* transition rather than rAF: one property, one duration, and it keeps
         running while this tab is briefly backgrounded, same as a real timer */
      requestAnimationFrame(function () {
        bar.style.transition = "width " + SECONDS + "s linear";
        requestAnimationFrame(function () { bar.style.width = "0%"; });
      });
      setTimeout(function () { quiz(idx); }, SECONDS * 1000);
    }

    function quiz(idx) {
      var c = CANDS[idx];
      var h = '<span class="rt-sk-tag">' + c.tag + '</span><p class="rt-sk-q">' + esc(c.q) + '</p><div class="rt-sk-opts">';
      for (var i = 0; i < c.opts.length; i++) {
        h += '<button class="rt-sk-opt" type="button" data-rt-opt="' + i + '">' + esc(c.opts[i]) + "</button>";
      }
      stage.innerHTML = h + "</div>" + '<div class="rt-verdict" id="rt-sk-verdict" hidden></div>' +
        '<div class="rt-controls"><button class="rt-btn" id="rt-sk-next" type="button" hidden></button></div>';

      var opts = [].slice.call(stage.querySelectorAll("[data-rt-opt]"));
      for (var j = 0; j < opts.length; j++) {
        opts[j].addEventListener("click", function () {
          var pick = parseInt(this.getAttribute("data-rt-opt"), 10);
          var wonIt = pick === c.right;
          score[idx] = wonIt;
          for (var k = 0; k < opts.length; k++) {
            opts[k].disabled = true;
            if (k === c.right) opts[k].className = "rt-sk-opt is-right";
            else if (k === pick) opts[k].className = "rt-sk-opt is-wrong";
          }
          var v = stage.querySelector("#rt-sk-verdict");
          v.hidden = false;
          v.className = "rt-verdict " + (wonIt ? "is-good" : "is-bad");
          v.textContent = wonIt ? c.won : c.lost;
          var next = stage.querySelector("#rt-sk-next");
          next.hidden = false;
          next.textContent = c.next;
          next.addEventListener("click", function () {
            if (idx === 0) flash(1); else wrap();
          });
        });
      }
    }

    function wrap() {
      var h = '<div class="rt-sk-pair">' + page(CANDS[0]) + page(CANDS[1]) + "</div>";
      h += '<div class="rt-verdict is-good">You went ' + tally(score[0]) + " on duties and " + tally(score[1]) +
        " on evidence. Same person, same work — but in a pile of two hundred, only one of these pages still exists after the skim, " +
        "because only one of them answered the reader's question before it was asked. That is what a safe pair of hands looks like on paper.</div>";
      h += '<div class="rt-controls"><button class="rt-btn rt-btn-ghost" id="rt-sk-again" type="button">Run it again</button></div>';
      stage.innerHTML = h;
      stage.querySelector("#rt-sk-again").addEventListener("click", function () { score = [false, false]; flash(0); });
    }

    function tally(w) { return w ? "1 for 1" : "0 for 1"; }

    go.addEventListener("click", function () { flash(0); });
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
