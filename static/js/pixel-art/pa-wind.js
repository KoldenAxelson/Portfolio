/* Wind on a low-res grass field, following the video's shader: sample a noise
   field at each blade's world position plus time × speed, remap to −1…1, scale
   by strength, and mask by height so the root stays put. The two toggles undo
   one idea each so the reader sees why it's there. Starts paused. */
window.PaWind = (function () {
  var W = 160;
  var H = 72;
  var GROUND = 48;
  var BLADES = 90;
  var NOISE_SCALE = 0.045;
  var GRASS = ["#2f6b3a", "#3f8a45", "#5aa84f", "#7cc25e"];

  // Seeded value noise with smoothstep interpolation: cheap, smooth, repeatable.
  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function makeBlades() {
    var blades = [];
    for (var i = 0; i < BLADES; i++) {
      var depth = hash(i, 7);
      blades.push({ x: Math.floor(hash(i, 3) * (W - 6)) + 3, base: GROUND + Math.floor(depth * 20), height: 10 + Math.floor(hash(i, 11) * 12), shade: Math.floor(hash(i, 19) * GRASS.length) });
    }
    return blades.sort(function (a, b) { return a.base - b.base; });
  }

  function init(root) {
    if (!root || root.getAttribute("data-pa-ready")) return;
    root.setAttribute("data-pa-ready", "1");

    var $ = function (id) { return root.querySelector("#pa-wind-" + id); };
    var ctx = $("canvas").getContext("2d");
    var blades = makeBlades();
    var playing = false;
    var time = 0;
    var last = 0;

    function draw() {
      var strength = Number($("strength").value);
      var speed = Number($("speed").value);
      var isWorld = $("world").checked;
      var isMasked = $("mask").checked;

      ctx.fillStyle = "#9fd3e8";
      ctx.fillRect(0, 0, W, GROUND);
      ctx.fillStyle = "#3b6b35";
      ctx.fillRect(0, GROUND, W, H - GROUND);

      blades.forEach(function (blade) {
        var sx = isWorld ? blade.x * NOISE_SCALE : 0;
        var sy = isWorld ? blade.base * NOISE_SCALE : 0;
        var bend = (noise(sx + time * speed, sy) * 2 - 1) * strength;
        ctx.fillStyle = GRASS[blade.shade];
        for (var k = 0; k < blade.height; k++) {
          var mask = isMasked ? k / blade.height : 1;
          ctx.fillRect(Math.round(blade.x + bend * mask), blade.base - k, 1, 1);
        }
      });
    }

    function loop(now) {
      if (!playing || !root.isConnected) { playing = false; return; }
      time += Math.min(0.05, (now - last) / 1000);
      last = now;
      draw();
      requestAnimationFrame(loop);
    }

    function describe() {
      var notes = [];
      notes.push($("world").checked ? "Neighbours share nearby noise, so gusts roll across the field." : "Every blade reads one value: the whole field sways in lockstep.");
      notes.push($("mask").checked ? "Roots stay planted." : "Without the mask, whole blades slide sideways.");
      $("note").textContent = notes.join(" ");
    }

    $("play").addEventListener("click", function () {
      playing = !playing;
      $("play").textContent = playing ? "Pause" : "Play";
      if (playing) { last = performance.now(); requestAnimationFrame(loop); }
    });
    ["world", "mask", "strength", "speed"].forEach(function (id) {
      $(id).addEventListener("input", function () { describe(); draw(); });
    });
    $("controls").hidden = false;
    describe();
    draw();
  }

  return { init: init };
})();
