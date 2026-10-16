(function () {
  // ASCII Object. The real component rasterises a lit three.js scene and then
  // scores each cell against a glyph atlas by shape. This is the older trick
  // it descends from: a torus rotated in software, one directional lamp, and
  // surface luminance mapped straight onto a ramp of characters.
  var canvas = document.getElementById("wdsAscii");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  var RAMP = ".,-~:;=!*#$@";     // darkest to brightest
  var MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
  var FONT = 8;                  // px
  var CW = FONT * 0.6;           // monospace advance, measured once the font is set
  var CH = FONT + 1;             // line box
  var R1 = 1, R2 = 2, K2 = 5;    // tube radius, ring radius, viewer distance
  var A = 0, B = 0, T = 0, bob = 0;
  var cols = 0, rows = 0, K1 = 0;
  var visible = true, raf = null;

  function size() {
    var rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT + "px " + MONO;
    ctx.textBaseline = "top";
    CW = ctx.measureText("M").width || FONT * 0.6;
    cols = Math.floor(rect.width / CW);
    rows = Math.floor(rect.height / CH);
    // Fit to whichever axis binds. The panel is far wider than a torus is, so
    // in practice height wins and the object sits centred in open terminal.
    var yScale = CW / CH;
    // Half-extent at unit K1. Not (R1+R2)/(K2-R1-R2) — that pairs the widest
    // point of the ring with the nearest point of the tube, which never happens
    // at once, and fitting to it leaves the object at half the size it could be.
    var reach = (R1 + R2) / (K2 - R1);
    K1 = 0.82 * Math.min(cols / 2, (rows / 2) / yScale) / reach;
    return true;
  }

  function render() {
    var zbuf = new Float32Array(cols * rows);
    var cbuf = new Uint8Array(cols * rows);   // 0 = empty, else ramp index + 1
    var cosA = Math.cos(A), sinA = Math.sin(A);
    var cosB = Math.cos(B), sinB = Math.sin(B);
    // Squash y by the character cell's aspect so the torus reads round rather
    // than stretched — a text cell is much taller than it is wide.
    var yScale = CW / CH;

    for (var th = 0; th < 6.2832; th += 0.07) {
      var ct = Math.cos(th), st = Math.sin(th);
      for (var ph = 0; ph < 6.2832; ph += 0.02) {
        var cp = Math.cos(ph), sp = Math.sin(ph);
        var circleX = R2 + R1 * ct, circleY = R1 * st;
        var x = circleX * (cosB * cp + sinA * sinB * sp) - circleY * cosA * sinB;
        var y = circleX * (sinB * cp - sinA * cosB * sp) + circleY * cosA * cosB;
        var z = K2 + cosA * circleX * sp + circleY * sinA;
        var ooz = 1 / z;
        var xp = (cols / 2 + K1 * ooz * x) | 0;
        var yp = (rows / 2 + bob - K1 * ooz * y * yScale) | 0;
        if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue;
        var lum = cp * ct * sinB - cosA * ct * sp - sinA * st + cosB * (cosA * st - ct * sinA * sp);
        if (lum <= 0) continue;
        var idx = yp * cols + xp;
        if (ooz <= zbuf[idx]) continue;
        zbuf[idx] = ooz;
        var l = (lum * 8) | 0;
        cbuf[idx] = Math.min(RAMP.length - 1, l) + 1;
      }
    }

    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    // Two passes so the lit side reads brighter than the terminator, without
    // a fillStyle change per character.
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? "rgba(126,226,168,0.95)" : "rgba(126,226,168,0.38)";
      for (var r = 0; r < rows; r++) {
        var line = "", any = false;
        for (var c = 0; c < cols; c++) {
          var v = cbuf[r * cols + c];
          var bright = v > 5;
          if (v && bright === !!pass) { line += RAMP.charAt(v - 1); any = true; }
          else line += " ";
        }
        if (any) ctx.fillText(line, 0, r * CH);
      }
    }
  }

  function frame() {
    if (visible) {
      T += 1 / 60;
      // The component's own idle: a steady turntable on one axis, a slow rock
      // on the other, and a floating bob. The rock is centred near face-on so
      // the object keeps filling the panel instead of thinning to a line every
      // few seconds, which a free tumble does.
      B += 0.012;
      A = 1.05 + 0.5 * Math.sin(T * 0.55);
      bob = Math.sin(T * 0.9) * 0.7;
      render();
    }
    raf = requestAnimationFrame(frame);
  }

  if (!size()) { requestAnimationFrame(function () { if (size()) start(); }); }
  else start();

  function start() {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    }
    if (reduce) { A = 1.4; B = 0.4; render(); return; }
    raf = requestAnimationFrame(frame);
  }
  window.addEventListener("resize", function () { if (size()) render(); });
})();
