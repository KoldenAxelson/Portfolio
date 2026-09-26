/* The chain of custody — trace one claim back a link at a time.

   A CONSTRUCTED EXAMPLE, and the module says so on its face. The paper at the
   bottom is real and linked; the three links above it are the shape of what you
   actually find when you pull on a claim like this, not transcripts of specific
   posts. Inventing three fake citations and presenting them as real sources
   would be exactly the failure the section is about.

   Each link carries the two tests the method demands, kept as separate fields so
   they can't collapse into one verdict: `trust` (is this source reliable?) and
   `supports` (what can I actually conclude from it?). The gap between the two is
   where the claim quietly grew. */
window.GcIsnad = (function () {
  var CHAIN = [
    { tier: "where you met it", src: "A productivity newsletter", when: "2024",
      says: "Handwriting your notes makes you remember three times as much as typing.",
      cites: "“a Princeton study”",
      trust: "No author, no link, no study named. A study you cannot open is not a citation, it is a gesture at one.",
      supports: "Nothing. This link asserts; it does not transmit." },
    { tier: "link 2", src: "A listicle of study tips", when: "2021",
      says: "Science says handwriting beats typing for memory.",
      cites: "a 2014 news article",
      trust: "Real link, real target — but the target is journalism, not research. One step removed and already no numbers.",
      supports: "That a news outlet reported an effect. Note what vanished between here and the link above: the number." },
    { tier: "link 3", src: "A news article", when: "2014",
      says: "Students who took notes by hand did better on questions about concepts.",
      cites: "Mueller & Oppenheimer, Psychological Science",
      trust: "Names the study, reports it narrowly, and is roughly faithful to it. This is the last honest link.",
      supports: "That a specific lab study found a specific effect. Already much narrower than the claim you started with." },
    { tier: "primary source", src: "Mueller & Oppenheimer, “The Pen Is Mightier Than the Keyboard”", when: "Psychological Science, 2014",
      says: "Across lab studies of students taking notes on short lectures, laptop note-takers transcribed more of the lecture verbatim and performed worse on conceptual questions than longhand note-takers.",
      cites: "— it is the bottom of the chain",
      href: "https://journals.sagepub.com/doi/10.1177/0956797614524581",
      trust: "A real, peer-reviewed, openly citable study. This is where the tracing stops and the reading starts.",
      supports: "What it measured: lecture note-taking, in a lab, on conceptual questions. What it never says: “three times”. That number is in no link of this chain except the first one.",
      primary: true }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var wrap = root.querySelector("#gc-isnad-chain");
    var btn = root.querySelector("#gc-isnad-back");
    var verdict = root.querySelector("#gc-isnad-verdict");
    if (!wrap || !btn) return;
    var shown = 0;

    function step() {
      if (shown >= CHAIN.length) return;
      var L = CHAIN[shown];
      if (shown > 0) {
        var arm = document.createElement("div");
        arm.className = "gc-isnad-arm";
        arm.innerHTML = '<span class="gc-isnad-arm-lab">citing</span>';
        wrap.appendChild(arm);
      }
      var card = document.createElement("article");
      card.className = "gc-isnad-card" + (L.primary ? " is-primary" : "");
      var title = L.href
        ? '<a href="' + L.href + '" rel="noopener">' + esc(L.src) + "</a>"
        : esc(L.src);
      card.innerHTML =
        '<div class="gc-isnad-top"><span class="gc-isnad-tier">' + esc(L.tier) + "</span>" +
        '<span class="gc-isnad-when">' + esc(L.when) + "</span></div>" +
        '<h4 class="gc-isnad-src">' + title + "</h4>" +
        '<p class="gc-isnad-says">“' + esc(L.says) + "”</p>" +
        '<div class="gc-isnad-cites">cites ' + esc(L.cites) + "</div>" +
        '<div class="gc-isnad-tests">' +
        '<div class="gc-isnad-test"><span class="gc-isnad-q">Is this source reliable?</span>' + esc(L.trust) + "</div>" +
        '<div class="gc-isnad-test"><span class="gc-isnad-q">What can I conclude from it?</span>' + esc(L.supports) + "</div>" +
        "</div>";
      wrap.appendChild(card);
      shown++;

      if (shown >= CHAIN.length) {
        btn.disabled = true;
        btn.textContent = "You have reached the primary source";
        verdict.hidden = false;
      } else {
        btn.textContent = "Trace it back (" + (CHAIN.length - shown) + " to go)";
      }
    }

    btn.addEventListener("click", step);
    step();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
