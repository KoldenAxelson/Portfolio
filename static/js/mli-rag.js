/* Retrieval-augmented generation, made visible.
   The RETRIEVAL is real: each document is scored against your question with idf-weighted
   term overlap, and the best match is what "slides into the prompt." The two answers are
   illustrative (there's no live model in the page), but the contrast is the whole point:
   with no retrieval the model guesses from memory; with it, the model answers from the
   documents it was handed. */
window.MliRag = (function () {
  var DOCS = [
    { id: "returns", title: "Returns policy", text: "Customers can request a refund within 14 days of delivery. After 14 days all sales are final." },
    { id: "billing", title: "Billing ownership", text: "The billing service is owned by the Payments team. On-call is Dana Okafor." },
    { id: "hours", title: "Office hours", text: "Office hours are 9 to 5. The office is closed on the last Friday of every month for maintenance." },
    { id: "brand", title: "Brand guide", text: "Our logo uses Northwind Blue on all marketing materials and packaging." },
    { id: "app", title: "App support", text: "The mobile app supports iOS 15 and later and Android 11 and later." },
    { id: "onboard", title: "Onboarding", text: "New hires receive a laptop on day one and complete security training in their first week." }
  ];
  var QS = [
    { q: "How long do customers have to get a refund?", cite: "returns",
      no: "Most stores use a 30-day return window, so probably around 30 days.",
      yes: "14 days from delivery — after that, all sales are final." },
    { q: "Who is on call for billing?", cite: "billing",
      no: "I don't have your rotation, but on-call is usually the DevOps lead.",
      yes: "Billing is owned by the Payments team, and on-call is Dana Okafor." },
    { q: "When is the office closed?", cite: "hours",
      no: "Offices are generally closed on weekends and public holidays.",
      yes: "9-to-5 normally, and closed the last Friday of every month for maintenance." }
  ];
  var STOP = new Set("a an the is are was were be to of in on for and or our we you your they it this that how long who when what do does can with all their his her its at as by".split(" "));
  function terms(s) { return (s.toLowerCase().match(/[a-z]+/g) || []).filter(function (w) { return w.length > 1 && !STOP.has(w); }); }
  var N = DOCS.length, df = {};
  DOCS.forEach(function (d) { new Set(terms(d.title + " " + d.text)).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
  function idf(t) { return Math.log((N + 1) / ((df[t] || 0) + 0.5)); }
  function score(q, d) {
    var qs = new Set(terms(q)), dt = terms(d.title + " " + d.text), seen = {}, s = 0;
    dt.forEach(function (t) { if (qs.has(t) && !seen[t]) { seen[t] = 1; s += idf(t); } });
    return s;
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function init(root) {
    if (!root) return;
    var qsEl = root.querySelector("#mli-rag-qs");
    var kbEl = root.querySelector("#mli-rag-kb");
    var ansEl = root.querySelector("#mli-rag-ans");
    if (!qsEl || !kbEl || !ansEl) return;

    // question chips
    var chips = [];
    QS.forEach(function (item, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "mli-rag-q"; b.textContent = item.q;
      b.addEventListener("click", function () { select(i); });
      qsEl.appendChild(b); chips.push(b);
    });
    // doc cards
    var cards = {};
    DOCS.forEach(function (d) {
      var c = document.createElement("div"); c.className = "mli-rag-card";
      c.innerHTML = '<div class="mli-rag-t">' + esc(d.title) + '</div><div class="mli-rag-x">' + esc(d.text) + '</div><div class="mli-rag-bar"><span></span></div>';
      kbEl.appendChild(c); cards[d.id] = c;
    });

    function select(i) {
      var item = QS[i];
      chips.forEach(function (b, k) { b.classList.toggle("is-on", k === i); });
      var scored = DOCS.map(function (d) { return { d: d, s: score(item.q, d) }; });
      var max = 0; scored.forEach(function (r) { if (r.s > max) max = r.s; });
      var topId = null, topS = -1;
      scored.forEach(function (r) { if (r.s > topS) { topS = r.s; topId = r.d.id; } });
      scored.forEach(function (r) {
        var c = cards[r.d.id], hit = r.d.id === topId && r.s > 0;
        c.classList.toggle("is-hit", hit);
        c.classList.toggle("is-dim", !hit);
        var bar = c.querySelector(".mli-rag-bar span");
        bar.style.width = (max > 0 ? Math.round(r.s / max * 100) : 0) + "%";
      });
      var doc = DOCS.filter(function (d) { return d.id === item.cite; })[0];
      ansEl.innerHTML =
        '<div class="mli-rag-panel is-no"><div class="mli-rag-h">Model alone <span class="mli-rag-tag">guessing from memory</span></div><p>' + esc(item.no) + '</p></div>' +
        '<div class="mli-rag-panel is-yes"><div class="mli-rag-h">Model + retrieval <span class="mli-rag-tag">grounded in a document</span></div>' +
        '<div class="mli-rag-ctx">retrieved &rarr; &ldquo;' + esc(doc.text) + '&rdquo;</div>' +
        '<p>' + esc(item.yes) + ' <span class="mli-rag-src">' + esc(doc.title) + '</span></p></div>';
    }
    select(0);
  }

  return { init: init, _score: score };
})();
