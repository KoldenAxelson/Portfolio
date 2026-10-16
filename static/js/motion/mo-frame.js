/* "A video is a function of time", literally: draw(ctx, t) is pure, so the
   slider, the player and the contact sheet all call the same function and
   always agree. Colors come from the theme tokens at draw time so both themes
   work. Playback is user-started only. */
window.MoFrame = (function () {
  var FPS = 60;
  var SECONDS = 3;
  var FRAMES = FPS * SECONDS;
  var SHEET_FRAMES = 8;

  function token(name) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw ? "rgb(" + raw.split(/\s+/).join(",") + ")" : "#888";
  }

  function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  function draw(ctx, t, w, h, colors) {
    var p = Math.min(1, t / SECONDS);
    var unit = h / 360; // sizes scale with the canvas, so thumbnails match the frame
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2 * unit;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.7);
    ctx.lineTo(w * 0.9, h * 0.7);
    ctx.stroke();

    var x = w * (0.1 + 0.8 * easeInOut(p));
    var radius = 14 * unit;
    var bounce = Math.abs(Math.sin(p * Math.PI * 3)) * h * 0.28;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(x, h * 0.7 - radius - bounce, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(w * 0.82, h * 0.25);
    ctx.rotate(p * Math.PI * 2);
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 3 * unit;
    ctx.strokeRect(-18 * unit, -18 * unit, 36 * unit, 36 * unit);
    ctx.restore();

    ctx.fillStyle = colors.muted;
    ctx.font = "600 " + Math.round(h * 0.075) + "px ui-monospace, monospace";
    ctx.fillText("t = " + t.toFixed(3) + " s", w * 0.06, h * 0.16);
  }

  function init(root) {
    if (!root || root.getAttribute("data-mo-ready")) return;
    root.setAttribute("data-mo-ready", "1");

    var $ = function (id) { return root.querySelector("#mo-fr-" + id); };
    var canvas = $("canvas");
    var ctx = canvas.getContext("2d");
    var slider = $("t");
    var playing = false;
    var startedAt = 0;
    var startFrame = 0;

    function colors() {
      return { bg: token("--c-bg"), fg: token("--c-fg"), muted: token("--c-muted"), accent: token("--c-accent"), border: token("--c-border") };
    }

    function show(frame) {
      var t = frame / FPS;
      draw(ctx, t, canvas.width, canvas.height, colors());
      $("read").textContent = "Frame " + frame + " of " + FRAMES + " · t = " + t.toFixed(3) + " s";
    }

    function loop(now) {
      if (!playing || !root.isConnected) { playing = false; return; }
      var frame = (startFrame + Math.floor((now - startedAt) / 1000 * FPS)) % (FRAMES + 1);
      slider.value = String(frame);
      show(frame);
      requestAnimationFrame(loop);
    }

    $("play").addEventListener("click", function () {
      playing = !playing;
      $("play").textContent = playing ? "Pause" : "Play";
      if (!playing) return;
      startedAt = performance.now();
      startFrame = Number(slider.value);
      requestAnimationFrame(loop);
    });
    slider.addEventListener("input", function () {
      playing = false;
      $("play").textContent = "Play";
      show(Number(slider.value));
    });
    $("sheet").addEventListener("click", function () {
      var out = $("sheet-out");
      var palette = colors();
      out.innerHTML = "";
      for (var i = 0; i < SHEET_FRAMES; i++) {
        var frame = Math.round(i * FRAMES / (SHEET_FRAMES - 1));
        var cell = document.createElement("figure");
        var thumb = document.createElement("canvas");
        thumb.width = 160; thumb.height = 90;
        draw(thumb.getContext("2d"), frame / FPS, 160, 90, palette);
        var label = document.createElement("figcaption");
        label.textContent = "frame " + frame;
        cell.appendChild(thumb);
        cell.appendChild(label);
        out.appendChild(cell);
      }
    });

    $("controls").hidden = false;
    show(Number(slider.value));
  }

  return { init: init };
})();
