(function () {
  var canvas = document.getElementById("wdsPlum");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var W = 0, H = 0;
  var R15 = Math.PI / 12, LEN = 6, MAX = 1000, PER_FRAME = 4, drawn = 0;
  var queue = [];
  var raf = null, holdT = null;
  var stroke = "rgba(136,136,136,0.16)";

  function readColor() {
    try {
      var fg = getComputedStyle(document.documentElement).getPropertyValue("--c-fg").trim();
      if (fg) stroke = "rgba(" + fg.replace(/\s+/g, ",") + ",0.16)";
    } catch (e) {}
  }
  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
  }
  function cart(x, y, r, t) { return [x + r * Math.cos(t), y + r * Math.sin(t)]; }
  function branch(b) {
    var e = cart(b.x, b.y, b.length, b.theta);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(e[0], e[1]);
    ctx.stroke();
    drawn++;
    if (drawn >= MAX) return;
    var rate = 0.62;
    if (Math.random() < rate)
      queue.push({ x: e[0], y: e[1], length: b.length + (Math.random() - 0.5), theta: b.theta - Math.random() * R15, depth: b.depth + 1 });
    if (Math.random() < rate)
      queue.push({ x: e[0], y: e[1], length: b.length + (Math.random() - 0.5), theta: b.theta + Math.random() * R15, depth: b.depth + 1 });
  }
  function seed() {
    var rm = function () { return Math.random() * 0.6 + 0.2; };
    queue = [
      { x: W * rm(), y: -5, length: LEN, theta: Math.PI / 2, depth: 0 },
      { x: W * rm(), y: H + 5, length: LEN, theta: -Math.PI / 2, depth: 0 },
      { x: -5, y: H * rm(), length: LEN, theta: 0, depth: 0 },
      { x: W + 5, y: H * rm(), length: LEN, theta: Math.PI, depth: 0 }
    ];
  }
  function growAll() {
    ctx.clearRect(0, 0, W, H);
    drawn = 0;
    seed();
    var g = 0;
    while (queue.length && drawn < MAX && g < 60000) {
      branch(queue.shift());
      g++;
    }
  }
  function restart() {
    ctx.clearRect(0, 0, W, H);
    drawn = 0;
    seed();
    raf = requestAnimationFrame(frame);
  }
  function frame() {
    var budget = Math.max(1, Math.round(PER_FRAME * (1 - drawn / MAX)));
    while (budget-- > 0 && queue.length && drawn < MAX) {
      branch(queue.shift());
    }
    if (queue.length && drawn < MAX) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
      holdT = setTimeout(function () { holdT = null; restart(); }, 3000);
    }
  }

  readColor();
  size();
  if (reduce) {
    growAll();
  } else {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (!vis) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
        else if (!raf && !holdT) { restart(); }
      }).observe(canvas);
    }
    restart();
  }
  window.addEventListener("resize", function () {
    readColor(); size();
    if (reduce) { growAll(); }
    else { if (raf) { cancelAnimationFrame(raf); raf = null; } if (holdT) { clearTimeout(holdT); holdT = null; } restart(); }
  });
})();
