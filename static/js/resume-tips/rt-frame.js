/* The first ninety seconds: confirmation bias, acted out. Two openings, the
   same three answers, and only the interviewer's margin notes change. The
   answers are deliberately neutral so the reader can see that nothing in them
   decides the note; the opening does. Illustrative, nothing stored. */
window.RtFrame = (function () {
  var OPENINGS = {
    vent: {
      line: "“Honestly, it's been a rough few months. The market is brutal, my last manager never really got what I was doing, and recruiters keep ghosting me.”",
      notes: [
        "Reorganized, or pushed out? That's twice now it was someone else's fault.",
        "Doesn't take direction well? Could clash with the team.",
        "A gap in the basics for this role."
      ],
      tally: "Three neutral answers, three strikes. Nothing in them changed; the interviewer was already looking for the problem.",
      isGood: false
    },
    clear: {
      line: "“I run operations, and the short version is I make slow processes fast. Most recently I took onboarding from six weeks to three.”",
      notes: [
        "Reorgs happen. Makes sense.",
        "Wants ownership. Good, the role needs that.",
        "Honest, and already using it."
      ],
      tally: "The same three answers, read as evidence for a yes. The opening did the work before any of them were said.",
      isGood: true
    }
  };

  function init(root) {
    if (!root || root.getAttribute("data-rt-ready")) return;
    root.setAttribute("data-rt-ready", "1");

    var picks = root.querySelector("#rt-frame-picks");
    var opening = root.querySelector("#rt-frame-open");
    var tally = root.querySelector("#rt-frame-tally");
    var notes = root.querySelectorAll(".rt-fr-note");
    var buttons = picks.querySelectorAll("[data-rt-open]");

    function show(key) {
      var chosen = OPENINGS[key];
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-rt-open") === key));
      }
      opening.textContent = chosen.line;
      for (var j = 0; j < notes.length; j++) {
        notes[j].textContent = "Interviewer: " + chosen.notes[j];
        notes[j].className = "rt-fr-note " + (chosen.isGood ? "is-good" : "is-bad");
      }
      tally.textContent = chosen.tally;
      tally.className = "vn-verdict " + (chosen.isGood ? "is-good" : "is-bad");
      tally.hidden = false;
    }

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        show(event.currentTarget.getAttribute("data-rt-open"));
      });
    }
    picks.hidden = false;
  }

  return { init: init };
})();
