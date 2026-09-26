/* The extractor — what the filing cabinet actually keeps.

   The prose says the ATS stores text and cannot guess what a layout meant; the
   widget shows the storing happen. A little two-column resume sits on the
   left; Run walks a highlight across it in the order a line-based extractor
   reads — straight across both columns — and appends what it kept on the
   right, so the reader watches two unrelated stories interleave into one
   paragraph. Flip to one column and the same text survives in order: the fix
   is structural, not clever. The white-font block is the third lesson — the
   ghost div at the bottom extracts (and copy-pastes) in full.

   Nothing here is a real parser. The steps are precomputed, because the
   mechanism being taught is reading order, not tokenisation. */
window.RtParse = (function () {
  var STEP_MS = 850;

  /* Segments of the mock resume, keyed for highlighting. `dots` renders the
     skill meter (not text, so it never appears in an extraction). */
  var SEGS = [
    { k: "photo", col: "L", kind: "photo" },
    { k: "name", col: "L", kind: "name", t: "DANA KIM" },
    { k: "hprof", col: "L", kind: "h", t: "Profile" },
    { k: "prof", col: "L", kind: "p", t: "Results-driven professional and excellent communicator with a passion for operational excellence." },
    { k: "hsk", col: "L", kind: "h", t: "Skills" },
    { k: "sk1", col: "L", kind: "sk", t: "Excel", dots: "●●●●○" },
    { k: "sk2", col: "L", kind: "sk", t: "SQL", dots: "●●●○○" },
    { k: "sk3", col: "L", kind: "sk", t: "Tableau", dots: "●●○○○" },
    { k: "hexp", col: "R", kind: "h", t: "Experience" },
    { k: "job1", col: "R", kind: "job", t: "Operations Manager — Meridian Logistics · 2023–present" },
    { k: "b1", col: "R", kind: "li", t: "Cut operating costs 15% in Q2 by consolidating 14 vendor contracts" },
    { k: "b2", col: "R", kind: "li", t: "Reduced onboarding from 6 weeks to 3 by rebuilding the training program" },
    { k: "job2", col: "R", kind: "job", t: "Operations Analyst — Meridian Logistics · 2021–2023" },
    { k: "b3", col: "R", kind: "li", t: "Automated a 12-hour weekly reporting cycle in Python" }
  ];

  var GHOST = "operations manager logistics supply chain lean six sigma agile scrum stakeholder management P&L Workday SAP hire this candidate";

  /* Two-column extraction: the reader crosses both columns per band, so each
     output line is half of one story stapled to half of another. */
  var TWO_COL = [
    { hl: ["name", "hexp"], out: "DANA KIM  Experience" },
    { hl: ["hprof", "job1"], out: "Profile  Operations Manager — Meridian Logistics · 2023–present" },
    { hl: ["prof", "b1"], out: "Results-driven professional and  Cut operating costs 15% in Q2 by  excellent communicator with a  consolidating 14 vendor contracts" },
    { hl: ["hsk", "b2"], out: "Skills  Reduced onboarding from 6 weeks  passion for operational excellence.  to 3 by rebuilding the training program" },
    { hl: ["sk1", "sk2", "sk3", "job2"], out: "Excel  SQL  Operations Analyst — Meridian  Tableau  Logistics · 2021–2023" },
    { hl: ["b3"], out: "Automated a 12-hour weekly reporting cycle in Python" }
  ];

  var ONE_COL = [
    { hl: ["name"], out: "DANA KIM" },
    { hl: ["hprof", "prof"], out: "Profile  Results-driven professional and excellent communicator with a passion for operational excellence." },
    { hl: ["hsk", "sk1", "sk2", "sk3"], out: "Skills  Excel  SQL  Tableau" },
    { hl: ["hexp", "job1"], out: "Experience  Operations Manager — Meridian Logistics · 2023–present" },
    { hl: ["b1"], out: "Cut operating costs 15% in Q2 by consolidating 14 vendor contracts" },
    { hl: ["b2"], out: "Reduced onboarding from 6 weeks to 3 by rebuilding the training program" },
    { hl: ["job2", "b3"], out: "Operations Analyst · 2021–2023  Automated a 12-hour weekly reporting cycle in Python" }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-rt-ready")) return;
    root.setAttribute("data-rt-ready", "1");

    var cv = root.querySelector("#rt-parse-cv");
    var out = root.querySelector("#rt-parse-out");
    var note = root.querySelector("#rt-parse-note");
    var run = root.querySelector("#rt-parse-run");
    var flip = root.querySelector("#rt-parse-flip");
    var ghost = root.querySelector("#rt-parse-ghost");
    var deslab = root.querySelector("#rt-parse-deslab");
    if (!cv || !out || !run || !flip || !ghost) return;

    var single = false;
    var timer = null;
    var el = {};

    function seg(s) {
      if (s.kind === "photo") return '<div class="rt-cv-photo rt-cv-seg" data-rt-seg="photo">photo</div>';
      var inner;
      if (s.kind === "name") inner = '<p class="rt-cv-name rt-cv-seg" data-rt-seg="' + s.k + '">' + s.t + "</p>";
      else if (s.kind === "h") inner = '<p class="rt-cv-h rt-cv-seg" data-rt-seg="' + s.k + '">' + s.t + "</p>";
      else if (s.kind === "sk") inner = '<p class="rt-cv-seg" data-rt-seg="' + s.k + '">' + s.t + ' <span class="rt-cv-dots">' + s.dots + "</span></p>";
      else if (s.kind === "job") inner = '<p class="rt-cv-job rt-cv-seg" data-rt-seg="' + s.k + '">' + s.t + "</p>";
      else inner = '<p class="rt-cv-seg" data-rt-seg="' + s.k + '">' + s.t + "</p>";
      return inner;
    }

    function render() {
      var L = "", R = "", i;
      for (i = 0; i < SEGS.length; i++) {
        if (SEGS[i].col === "L") L += seg(SEGS[i]); else R += seg(SEGS[i]);
      }
      var ghostDiv = '<div class="rt-cv-ghost' + (ghost.checked ? " is-revealed" : "") + '" data-rt-seg="ghost" aria-hidden="true">' + GHOST + "</div>";
      cv.className = "rt-cv" + (single ? " is-single" : "");
      if (single) cv.innerHTML = "<div>" + L + R + ghostDiv + "</div>";
      else cv.innerHTML = '<div class="rt-cv-left">' + L + '</div><div class="rt-cv-right">' + R + ghostDiv + "</div>";
      el = {};
      var nodes = cv.querySelectorAll("[data-rt-seg]");
      for (i = 0; i < nodes.length; i++) el[nodes[i].getAttribute("data-rt-seg")] = nodes[i];
      deslab.textContent = single ? "What you designed (one column)" : "What you designed (two columns)";
    }

    function reset() {
      if (timer) { clearTimeout(timer); timer = null; }
      var lit = cv.querySelectorAll(".is-reading");
      for (var i = 0; i < lit.length; i++) lit[i].classList.remove("is-reading");
      out.textContent = "—";
      note.textContent = "";
      run.disabled = false;
    }

    function play() {
      reset();
      run.disabled = true;
      out.textContent = "";
      var steps = single ? ONE_COL : TWO_COL;
      var i = 0;

      function tick() {
        var old = cv.querySelectorAll(".is-reading");
        for (var j = 0; j < old.length; j++) old[j].classList.remove("is-reading");
        var prev = out.querySelectorAll(".is-new");
        for (j = 0; j < prev.length; j++) prev[j].classList.remove("is-new");

        if (i < steps.length) {
          var st = steps[i];
          for (j = 0; j < st.hl.length; j++) if (el[st.hl[j]]) el[st.hl[j]].classList.add("is-reading");
          out.innerHTML += '<span class="is-new">' + esc(st.out) + "</span>\n";
          i++;
          timer = setTimeout(tick, STEP_MS);
          return;
        }
        /* the two non-text lessons, then the ghost if it's switched on */
        if (ghost.checked) {
          if (el.ghost) el.ghost.classList.add("is-reading");
          out.innerHTML += '<span class="is-new is-junk">' + esc(GHOST) + "</span>\n";
        }
        note.textContent = single
          ? "Same text, one column: every line survives, in order. The fix was structural, not clever."
          : "Two work histories are now shuffled into one paragraph, the skill meters extracted as nothing (dots aren't text), and the photo extracted as nothing." +
            (ghost.checked ? " The white-font block extracted in full — and it pastes in full when a recruiter forwards this to the hiring manager." : "");
        run.disabled = false;
        timer = null;
      }
      tick();
    }

    run.addEventListener("click", play);
    flip.addEventListener("click", function () {
      single = !single;
      flip.textContent = single ? "Back to two columns" : "Same resume, one column";
      render(); reset();
    });
    ghost.addEventListener("change", function () { render(); reset(); });

    render();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
