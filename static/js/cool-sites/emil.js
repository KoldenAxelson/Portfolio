(function () {
  var canvas = document.getElementById("wdsCanvas");
  var src = document.getElementById("wdsSrc");
  if (!canvas || !src) return;
  var ctx = canvas.getContext("2d");
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var dots = [];
  var mouse = { x: -9999, y: -9999 };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var R = 64, STRENGTH = 1.5, SPRING = 0.05, FRICTION = 0.85, DOTR = 1.5;

  function buildDots(cb) {
    var S = 280, gap = 5;
    var svg = src.cloneNode(true);
    svg.setAttribute("width", S);
    svg.setAttribute("height", S);
    var xml = new XMLSerializer().serializeToString(svg);
    var img = new Image();
    img.onload = function () {
      var off = document.createElement("canvas");
      off.width = S; off.height = S;
      var octx = off.getContext("2d");
      octx.drawImage(img, 0, 0, S, S);
      var data;
      try { data = octx.getImageData(0, 0, S, S).data; }
      catch (e) { cb([]); return; }
      var pts = [];
      for (var y = 0; y < S; y += gap) {
        for (var x = 0; x < S; x += gap) {
          var i = (y * S + x) * 4;
          if (data[i + 3] > 128) {
            pts.push({ nx: x / S, ny: y / S, c: "rgb(" + data[i] + "," + data[i + 1] + "," + data[i + 2] + ")" });
          }
        }
      }
      cb(pts);
    };
    img.onerror = function () { cb([]); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    if (w < 2 || h < 2) { requestAnimationFrame(layout); return; }
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var scale = Math.min(w, h) * 0.88;
    var ox = (w - scale) / 2, oy = (h - scale) / 2;
    for (var k = 0; k < dots.length; k++) {
      var d = dots[k];
      d.hx = ox + d.nx * scale; d.hy = oy + d.ny * scale;
      if (d.x === undefined) { d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0; }
    }
  }

  function frame() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (var k = 0; k < dots.length; k++) {
      var d = dots[k];
      var dx = d.x - mouse.x, dy = d.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (dist < R) {
        var f = (R - dist) / R * STRENGTH;
        d.vx += (dx / dist) * f; d.vy += (dy / dist) * f;
      }
      d.vx += (d.hx - d.x) * SPRING; d.vy += (d.hy - d.y) * SPRING;
      d.vx *= FRICTION; d.vy *= FRICTION;
      d.x += d.vx; d.y += d.vy;
      ctx.beginPath();
      ctx.arc(d.x, d.y, DOTR, 0, 6.2832);
      ctx.fillStyle = d.c;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  function staticDraw() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (var k = 0; k < dots.length; k++) {
      var d = dots[k];
      ctx.beginPath();
      ctx.arc(d.hx, d.hy, DOTR, 0, 6.2832);
      ctx.fillStyle = d.c;
      ctx.fill();
    }
  }

  function onMove(e) {
    var rect = canvas.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    mouse.x = p.clientX - rect.left;
    mouse.y = p.clientY - rect.top;
  }
  function onLeave() { mouse.x = -9999; mouse.y = -9999; }

  buildDots(function (pts) {
    dots = pts;
    layout();
    if (reduce || !dots.length) { staticDraw(); return; }
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    requestAnimationFrame(frame);
  });
  window.addEventListener("resize", layout);
})();
