/* The line — translation or fabrication, ruled card by card.

   The prose lists what she says you may translate and what pulls offers; the
   deck makes you commit to a ruling before you hear hers, because the
   boundary is only learnable where your intuition disagrees with it. Every
   scenario and every ruling comes from the two "lying" videos. One reveal
   carries an editorial note where I'd argue with her — flagged as mine, in
   keeping with this page being notes on someone else's argument.

   Nothing is stored; the score lives and dies with the tab. */
window.RtLine = (function () {
  var DECK = [
    {
      move: "Your badge says “Global Talent Acquisition Partner.” Your resume says “Lead Recruiter.”",
      safe: true,
      why: "Her own resume, verbatim. Internal titles are written by HR to fit comp bands; the resume's job is a title hiring managers recognise. Translate sideways, never up."
    },
    {
      move: "Your title was Coordinator. Your resume says “Director.”",
      safe: false,
      why: "That's not translating the work, it's inflating the level — and titles are one phone call verifiable. Coordinator → the accurate functional title, never coordinator → director."
    },
    {
      move: "“Managed a team of five” — you had no direct reports, ever.",
      safe: false,
      why: "Management responsibility is verifiable and gets checked. “Led,” “drove,” “owned” are yours to claim about work; people who reported to you either existed or didn't."
    },
    {
      move: "Your title was Marketing Coordinator, but you actually led the Q3 campaign. The bullet: “Led the Q3 email campaign from concept to execution.”",
      safe: true,
      why: "This is the one she begs high performers to do. Decisions and owned outcomes are accurate descriptions of what happened — waiting for the title to say so is how someone with more confidence takes your job."
    },
    {
      move: "Engagement actually rose 18%. The bullet says 25%.",
      safe: true,
      why: "Her ruling: nobody verifies percentages — estimate up, stay believable, and never claim numbers bigger than the company. (The one ruling I'd argue with: the believability budget is also a credibility budget, and 18% was already a result.)"
    },
    {
      move: "You're three credit hours short of the degree. The resume says “B.S., completed.”",
      safe: false,
      why: "Her example, and the offer was pulled — for a role that didn't even require the degree. Education checks take about a minute; claiming an unfinished credential is falsifying the application."
    },
    {
      move: "A six-week wrong-fit job, left off the resume — and off LinkedIn.",
      safe: true,
      why: "Omission is your call: background checks verify what you supply, they don't surface every job you've ever held. The cost of explaining a short stint in every interview is higher than the risk."
    },
    {
      move: "Same six-week job, off the resume — but still sitting on your LinkedIn.",
      safe: false,
      why: "Now it's not an omission, it's an inconsistency, and LinkedIn is one of the first places a recruiter looks. Whatever the resume omits, LinkedIn omits too, or the gap between them becomes the story."
    },
    {
      move: "“Spanish” in the languages section. You're conversational on a good day.",
      safe: false,
      why: "There's a real chance the interviewer simply switches into it, live. Fluent means fluent; conversational doesn't make the resume."
    },
    {
      move: "A year-long gap where you regularly helped a friend run their business. The resume: “Consultant” for that company.",
      safe: true,
      why: "Real work, framed generously — allowed, along with freelance as freelance and your actual LLC as founder. The rule is that it has to have existed; the deal-breaker is the invented company."
    }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-rt-ready")) return;
    root.setAttribute("data-rt-ready", "1");

    var stage = root.querySelector("#rt-line-stage");
    var go = root.querySelector("#rt-line-go");
    if (!stage || !go) return;

    var i = 0, right = 0;

    function card() {
      var c = DECK[i];
      var h = '<div class="rt-ln-card">' +
        '<div class="rt-ln-count">move ' + (i + 1) + " / " + DECK.length +
        '&ensp;·&ensp;<span class="rt-ln-score">' + right + " with her so far</span></div>" +
        '<p class="rt-ln-move">' + c.move + "</p>" +
        '<div class="rt-controls">' +
        '<button class="rt-btn" id="rt-ln-safe" type="button">She’d write it</button>' +
        '<button class="rt-btn rt-btn-ghost" id="rt-ln-pull" type="button">She’d call it a deal-breaker</button>' +
        "</div>" +
        '<div class="rt-ln-ruling" id="rt-ln-ruling" hidden></div>' +
        '<div class="rt-controls"><button class="rt-btn" id="rt-ln-next" type="button" hidden></button></div>' +
        "</div>";
      stage.innerHTML = h;
      stage.querySelector("#rt-ln-safe").addEventListener("click", function () { rule(true); });
      stage.querySelector("#rt-ln-pull").addEventListener("click", function () { rule(false); });
    }

    function rule(saidSafe) {
      var c = DECK[i];
      var hit = saidSafe === c.safe;
      if (hit) right++;
      stage.querySelector("#rt-ln-safe").disabled = true;
      stage.querySelector("#rt-ln-pull").disabled = true;
      var r = stage.querySelector("#rt-ln-ruling");
      r.hidden = false;
      r.className = "rt-ln-ruling " + (c.safe ? "is-safe" : "is-pulled");
      r.innerHTML = "<b>" + (c.safe ? "Her ruling: write it." : "Her ruling: deal-breaker.") + "</b> " +
        (hit ? "You agreed. " : "You ruled the other way. ") + esc(c.why);
      var next = stage.querySelector("#rt-ln-next");
      next.hidden = false;
      next.textContent = i + 1 < DECK.length ? "Next move" : "Where's the line, then?";
      next.addEventListener("click", function () {
        i++;
        if (i < DECK.length) card(); else wrap();
      });
    }

    function wrap() {
      var h = '<div class="rt-verdict ' + (right >= 8 ? "is-good" : "is-bad") + '">You matched her on ' + right + " of " + DECK.length +
        ". The line, stated once: translate the work you actually did into words the reader recognises — titles sideways, outcomes claimed, noise cut. " +
        "Never invent credentials, employers, dates, people, or fluency that a background check or a five-minute conversation can contradict. " +
        "And whatever the resume omits, LinkedIn omits too.</div>" +
        '<div class="rt-controls"><button class="rt-btn rt-btn-ghost" id="rt-ln-again" type="button">Run the deck again</button></div>';
      stage.innerHTML = h;
      stage.querySelector("#rt-ln-again").addEventListener("click", function () { i = 0; right = 0; card(); });
    }

    go.addEventListener("click", function () { card(); });
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
