/* The bullet forge — X · Y · Z, with the gates the formula implies.

   The prose gives the Google formula (accomplished X, as measured by Y, by
   doing Z) and the first-word rule; the forge enforces both. It reads the
   first word of X and sorts it — owner, passenger, or not-a-verb-yet — and it
   will not call a bullet done while Y has no digit, because a measure without
   a number is a task wearing a costume. It also sweeps every field for
   menu-silverware ("team player", "detail-oriented"): basic expectations that
   spend space proving you are a restaurant.

   This is the one module on the page that is a tool rather than a demo — the
   output is meant to be pasted into a real resume. Nothing typed here is
   stored or sent anywhere. */
window.RtBullet = (function () {
  var OWNER = ["led", "built", "cut", "drove", "launched", "shipped", "owned", "spearheaded",
    "increased", "reduced", "eliminated", "rebuilt", "automated", "designed", "negotiated",
    "delivered", "created", "founded", "resolved", "migrated", "grew", "saved", "won", "directed"];
  var PASSENGER = ["helped", "assisted", "supported", "worked", "participated", "contributed",
    "involved", "responsible", "tasked", "aided", "collaborated", "attended", "handled", "various"];
  var SILVER = ["team player", "hard worker", "hard-working", "hardworking", "detail-oriented",
    "detail oriented", "attention to detail", "excellent communicator", "good communicator",
    "strong communicator", "works well with", "fast learner", "quick learner", "self starter",
    "self-starter", "results-driven", "results driven", "go-getter", "go getter", "passionate",
    "motivated", "dynamic", "team-oriented"];
  var CHIPS = ["Led", "Built", "Cut", "Drove", "Launched", "Shipped", "Reduced", "Eliminated", "Rebuilt", "Automated", "Owned", "Negotiated"];

  function init(root) {
    if (!root || root.getAttribute("data-rt-ready")) return;
    root.setAttribute("data-rt-ready", "1");

    var x = root.querySelector("#rt-fg-x");
    var y = root.querySelector("#rt-fg-y");
    var z = root.querySelector("#rt-fg-z");
    var chips = root.querySelector("#rt-fg-chips");
    var read = root.querySelector("#rt-fg-read");
    var build = root.querySelector("#rt-fg-build");
    var copy = root.querySelector("#rt-fg-copy");
    var out = root.querySelector("#rt-fg-out");
    var verdict = root.querySelector("#rt-fg-verdict");
    if (!x || !y || !z || !build) return;

    /* verb chips — a starting bench of owner verbs; clicking one replaces the
       first word of X if that word is a passenger, otherwise prepends */
    for (var i = 0; i < CHIPS.length; i++) {
      (function (v) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "rt-chip-btn"; b.textContent = v;
        b.addEventListener("click", function () {
          var words = x.value.replace(/^\s+/, "").split(/\s+/).filter(function (w) { return w; });
          if (words.length && words[0].toLowerCase().replace(/[^a-z]/g, "") === "responsible") {
            /* "responsible for overseeing…" → drop the scaffolding whole */
            x.value = v + " " + words.slice(words[1] && words[1].toLowerCase() === "for" ? 2 : 1).join(" ");
          } else if (words.length && verdictOf(words[0]) === "passenger") {
            words[0] = v; x.value = words.join(" ");
          } else {
            x.value = v + (x.value ? " " + x.value.charAt(0).toLowerCase() + x.value.slice(1) : " ");
          }
          x.focus(); sync();
        });
        chips.appendChild(b);
      })(CHIPS[i]);
    }

    function verdictOf(word) {
      var w = String(word || "").toLowerCase().replace(/[^a-z-]/g, "");
      if (!w) return "empty";
      if (OWNER.indexOf(w) >= 0) return "owner";
      if (PASSENGER.indexOf(w) >= 0) return "passenger";
      return "neutral";
    }

    function silverIn(s) {
      var low = " " + String(s).toLowerCase() + " ", hits = [];
      for (var i = 0; i < SILVER.length; i++) if (low.indexOf(SILVER[i]) >= 0) hits.push(SILVER[i]);
      return hits;
    }

    function badge(txt, cls) { return '<span class="rt-fg-badge' + (cls ? " " + cls : "") + '">' + esc(txt) + "</span>"; }

    function sync() {
      var first = x.value.replace(/^\s+/, "").split(/\s+/)[0] || "";
      var v = verdictOf(first);
      var h = "";
      if (v === "empty") h += badge("first word: —");
      else if (v === "owner") h += badge('first word: "' + first + '" · owner', "is-good");
      else if (v === "passenger") h += badge('first word: "' + first + '" · passenger', "is-bad");
      else h += badge('first word: "' + first + '"');
      h += /\d/.test(y.value) ? badge("Y: has a number", "is-good") : badge("Y: no number yet", y.value.trim() ? "is-bad" : "");
      var sil = silverIn(x.value + " " + y.value + " " + z.value);
      if (sil.length) h += badge('silverware: "' + sil[0] + '"', "is-bad");
      read.innerHTML = h;
      return { verb: v, first: first, num: /\d/.test(y.value), silver: sil };
    }

    function forge() {
      var s = sync();
      var xs = x.value.trim().replace(/[.\s]+$/, "");
      var ys = y.value.trim().replace(/[.\s]+$/, "");
      var zs = z.value.trim().replace(/[.\s]+$/, "");
      if (!xs || !ys || !zs) {
        verdict.hidden = false;
        verdict.className = "rt-verdict is-bad";
        verdict.textContent = "All three parts, or it isn't the formula — a claim (X), the measure (Y), and the how (Z).";
        out.hidden = true; copy.hidden = true;
        return;
      }
      var zjoin = /^by\s/i.test(zs) ? zs : "by " + zs;
      var line = xs.charAt(0).toUpperCase() + xs.slice(1) + ", " + ys + ", " + zjoin + ".";
      out.hidden = false;
      out.textContent = line;
      copy.hidden = false;

      var flags = [];
      if (s.verb === "passenger") flags.push('"' + s.first + '" is passenger language — it marks you as present while things happened. Swap it for a verb that owns the outcome (the chips above).');
      if (s.verb === "neutral" && s.first) flags.push('"' + s.first + '" isn\'t on either list — fine, as long as it\'s a verb that owns the outcome rather than describes attendance.');
      if (!s.num) flags.push("Y still has no number. Nobody audits your percentages — estimate honestly and stay believable — but without one, this reads as a task, not a result.");
      if (s.silver.length) flags.push('"' + s.silver[0] + '" is silverware — a basic expectation of being employable, not a dish. The menu doesn\'t list the forks.');

      verdict.hidden = false;
      if (!flags.length) {
        verdict.className = "rt-verdict is-good";
        verdict.textContent = "Claims, proves, explains — in that order, leading with a verb that owns it. Paste it in, and say it the same way out loud.";
      } else {
        verdict.className = "rt-verdict is-bad";
        verdict.textContent = flags.join(" ");
      }
    }

    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out.textContent || "").then(done, function () { copy.textContent = "Select it and copy"; });
      } else { copy.textContent = "Select it and copy"; }
    });

    build.addEventListener("click", forge);
    root.addEventListener("input", sync);
    sync();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
