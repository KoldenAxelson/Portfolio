/* Citation carousel — flip through the reference cards.
   Content lives in the DOM (real, crawlable links); this only wires up navigation:
   prev/next buttons, a dot per card, and arrow-key support. No autoplay. */
window.MliCite = (function () {
  function init(root) {
    if (!root) return;
    var track = root.querySelector("#mli-cite-track");
    var dotsWrap = root.querySelector("#mli-cite-dots");
    var prev = root.querySelector("#mli-cite-prev");
    var next = root.querySelector("#mli-cite-next");
    if (!track) return;
    var cards = track.children, n = cards.length, idx = 0;
    if (!n) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) track.style.transition = "none";

    var dots = [];
    if (dotsWrap) {
      for (var i = 0; i < n; i++) {
        (function (j) {
          var b = document.createElement("button");
          b.className = "mli-mo-dot"; b.type = "button";
          b.setAttribute("aria-label", "Reference " + (j + 1) + " of " + n);
          b.addEventListener("click", function () { go(j); });
          dotsWrap.appendChild(b); dots.push(b);
        })(i);
      }
    }
    function go(i) {
      idx = (i + n) % n;
      track.style.transform = "translateX(" + (-idx * 100) + "%)";
      for (var k = 0; k < n; k++) if (dots[k]) dots[k].classList.toggle("is-on", k === idx);
    }
    if (prev) prev.addEventListener("click", function () { go(idx - 1); });
    if (next) next.addEventListener("click", function () { go(idx + 1); });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(idx - 1); } else if (e.key === "ArrowRight") { go(idx + 1); }
    });
    go(0);
  }
  return { init: init };
})();
