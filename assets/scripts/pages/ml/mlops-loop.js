// The MLOps loop carousel: one slide per stage, each with its own small animation.
export function initMlopsLoop(root) {
  var track = document.getElementById("mli-mo-track");
  if (!root || !track) return;
  var slides = track.children, n = slides.length;
  if (!n) return;
  var dotsWrap = document.getElementById("mli-mo-dots");
  var idx = 0, reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var moTok = 0;
  var dots = [];
  for (var i = 0; i < n; i++) {
    (function (j) {
      var b = document.createElement("button");
      b.className = "mli-mo-dot"; b.type = "button";
      b.setAttribute("aria-label", "Step " + (j + 1));
      b.addEventListener("click", function () { go(j); });
      dotsWrap.appendChild(b); dots.push(b);
    })(i);
  }
  // build the neural-net scene for step 2
  (function () {
    var svg = document.getElementById("mli-mo-net");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var mk = function (ys, x) { return ys.map(function (y) { return { x: x, y: y }; }); };
    var layers = [mk([16, 40, 64, 88], 24), mk([10, 31, 52, 73, 94], 108), mk([28, 52, 76], 184)];
    for (var l = 0; l < layers.length - 1; l++) {
      layers[l].forEach(function (a) {
        layers[l + 1].forEach(function (b) {
          var ln = document.createElementNS(NS, "line");
          ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y);
          ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y);
          ln.style.animationDelay = (Math.random() * 1.1).toFixed(2) + "s";
          svg.appendChild(ln);
        });
      });
    }
    layers.forEach(function (col) {
      col.forEach(function (nd) {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", nd.x); c.setAttribute("cy", nd.y); c.setAttribute("r", 5);
        c.style.animationDelay = (Math.random() * 1.8).toFixed(2) + "s";
        svg.appendChild(c);
      });
    });
  })();
  function countUp(el, target) {
    if (reduce) { el.textContent = target.toFixed(1) + "%"; return; }
    var t0 = null;
    function s(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1100); el.textContent = (target * p).toFixed(1) + "%"; if (p < 1) requestAnimationFrame(s); }
    requestAnimationFrame(s);
  }
  function growBar(el, target) {
    if (reduce) { el.style.width = target + "%"; return; }
    el.style.width = "0%";
    var t0 = null;
    function s(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1000); el.style.width = (target * p).toFixed(1) + "%"; if (p < 1) requestAnimationFrame(s); }
    requestAnimationFrame(s);
  }
  // step 1: feed data tiles into the model box, one at a time
  var moModel = root.querySelector(".mo-model");
  var moTiles = root.querySelectorAll(".mo-ingest .mo-tile");
  function startIngest(tok) {
    if (!moModel || !moTiles.length) return;
    for (var r = 0; r < moTiles.length; r++) { var t = moTiles[r]; t.style.transition = "none"; t.style.transform = "none"; t.style.opacity = "1"; }
    if (reduce) return;
    var order = [3, 2, 1, 0]; // nearest the box goes first
    var k = 0;
    function bump() { moModel.classList.add("mo-eat"); setTimeout(function () { moModel.classList.remove("mo-eat"); }, 150); }
    function feed() {
      if (tok !== moTok) return;
      var t = moTiles[order[k]];
      var mb = moModel.getBoundingClientRect(), tb = t.getBoundingClientRect();
      var dx = (mb.left + mb.width / 2) - (tb.left + tb.width / 2);
      var dy = (mb.top + mb.height / 2) - (tb.top + tb.height / 2);
      t.style.transition = "transform .5s cubic-bezier(.4,0,.6,1), opacity .5s ease-in";
      t.style.transform = "translate(" + dx + "px," + dy + "px) scale(.28)";
      t.style.opacity = "0";
      setTimeout(function () { if (tok === moTok) bump(); }, 430);
      k++;
      if (k < order.length) { setTimeout(feed, 800); }
      else { setTimeout(function () { if (tok === moTok) reset(); }, 950); }
    }
    function reset() {
      if (tok !== moTok) return;
      for (var r = 0; r < moTiles.length; r++) { moTiles[r].style.transition = "none"; moTiles[r].style.transform = "none"; }
      void moModel.offsetWidth;
      for (var q = 0; q < moTiles.length; q++) { moTiles[q].style.transition = "opacity .35s ease"; moTiles[q].style.opacity = "1"; }
      k = 0;
      setTimeout(feed, 600);
    }
    feed();
  }
  function go(i) {
    idx = (i + n) % n;
    track.style.transform = "translateX(" + (-idx * 100) + "%)";
    for (var k = 0; k < n; k++) { slides[k].classList.toggle("is-active", k === idx); dots[k].classList.toggle("is-on", k === idx); }
    moTok++;
    var stage = slides[idx].querySelector(".mli-mo-stage");
    var mode = stage ? stage.getAttribute("data-anim") : "";
    if (mode === "ingest") {
      startIngest(moTok);
    } else if (mode === "net") {
      var eff = document.getElementById("mli-mo-eff");
      if (eff) { eff.textContent = "0.0%"; countUp(eff, 97.1); }
    } else if (mode === "cmp") {
      var v1 = document.getElementById("mli-mo-v1"), v2 = document.getElementById("mli-mo-v2");
      if (v1) { v1.textContent = "0.0%"; countUp(v1, 96.4); }
      if (v2) { v2.textContent = "0.0%"; countUp(v2, 97.1); }
      var f1 = document.getElementById("mli-mo-f1"), f2 = document.getElementById("mli-mo-f2");
      if (f1) growBar(f1, 74);
      if (f2) growBar(f2, 92);
    }
  }
  document.getElementById("mli-mo-prev").addEventListener("click", function () { go(idx - 1); });
  document.getElementById("mli-mo-next").addEventListener("click", function () { go(idx + 1); });
  go(0);
}
